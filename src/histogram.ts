import { Peak2D } from "./types";

/**
 * 二维直方图高斯平滑
 * - 色相维度：环形（0° 和 360° 相邻）
 * - 饱和度维度：线性（边界 clamp）
 */
export function smooth2DHistogram(
  histogram: Float32Array,
  hueBins: number,
  satBins: number,
  radius: number,
): Float32Array {
  const smoothed = new Float32Array(hueBins * satBins);

  // 预计算高斯权重矩阵
  const weights: number[][] = [];
  let weightSum = 0;
  for (let dh = -radius; dh <= radius; dh++) {
    weights[dh + radius] = [];
    for (let ds = -radius; ds <= radius; ds++) {
      const dist = Math.sqrt(dh * dh + ds * ds);
      const weight = Math.exp(-(dist * dist) / (2 * (radius / 2) ** 2));
      weights[dh + radius][ds + radius] = weight;
      weightSum += weight;
    }
  }

  // 归一化权重
  for (let dh = -radius; dh <= radius; dh++) {
    for (let ds = -radius; ds <= radius; ds++) {
      weights[dh + radius][ds + radius] /= weightSum;
    }
  }

  // 卷积
  for (let h = 0; h < hueBins; h++) {
    for (let s = 0; s < satBins; s++) {
      let sum = 0;
      for (let dh = -radius; dh <= radius; dh++) {
        for (let ds = -radius; ds <= radius; ds++) {
          const hIdx = (h + dh + hueBins) % hueBins; // 环形
          const sIdx = Math.max(0, Math.min(satBins - 1, s + ds)); // clamp
          sum +=
            histogram[hIdx * satBins + sIdx] *
            weights[dh + radius][ds + radius];
        }
      }
      smoothed[h * satBins + s] = sum;
    }
  }

  return smoothed;
}

/**
 * 二维直方图峰值检测
 * @param threshold 最小峰值阈值（相对于最大值的比例）
 * @param minHueDistance 峰值间最小色相距离（0-1）
 * @param minSatDistance 峰值间最小饱和度距离（0-1）
 */
export function find2DPeaks(
  histogram: Float32Array,
  hueBins: number,
  satBins: number,
  threshold: number,
  minHueDistance: number,
  minSatDistance: number,
): Peak2D[] {
  const maxVal = Math.max(...histogram);
  if (maxVal === 0) return [];

  const thresholdValue = maxVal * threshold;
  const peaks: Peak2D[] = [];

  // 8 邻域局部最大值检测
  for (let h = 0; h < hueBins; h++) {
    for (let s = 0; s < satBins; s++) {
      const curr = histogram[h * satBins + s];
      if (curr < thresholdValue) continue;

      let isMax = true;
      for (let dh = -1; dh <= 1 && isMax; dh++) {
        for (let ds = -1; ds <= 1 && isMax; ds++) {
          if (dh === 0 && ds === 0) continue;

          const hIdx = (h + dh + hueBins) % hueBins;
          const sIdx = s + ds;
          if (sIdx < 0 || sIdx >= satBins) continue;

          if (histogram[hIdx * satBins + sIdx] > curr) {
            isMax = false;
          }
        }
      }

      if (isMax) {
        peaks.push({
          hueIndex: h,
          satIndex: s,
          value: curr,
          hue: (h / hueBins) * 360,
          saturation: (s + 0.5) / satBins,
        });
      }
    }
  }

  // 按值降序排列
  peaks.sort((a, b) => b.value - a.value);

  // 非极大值抑制：过滤距离过近的峰值
  const merged: Peak2D[] = [];
  const minHueBins = Math.round(minHueDistance * hueBins);
  const minSatBins = Math.round(minSatDistance * satBins);

  for (const peak of peaks) {
    const tooClose = merged.some((existing) => {
      let hueDist = Math.abs(peak.hueIndex - existing.hueIndex);
      hueDist = Math.min(hueDist, hueBins - hueDist); // 环形距离
      const satDist = Math.abs(peak.satIndex - existing.satIndex);
      return hueDist < minHueBins && satDist < minSatBins;
    });

    if (!tooClose) merged.push(peak);
  }

  return merged;
}
