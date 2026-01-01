import { Peak2D } from "./types";

/**
 * 对二维直方图进行高斯平滑
 * 色相维度是环形的，饱和度维度是线性的
 */
export function smooth2DHistogram(
  histogram: Float32Array,
  hueBins: number,
  satBins: number,
  radius: number
): Float32Array {
  const smoothed = new Float32Array(hueBins * satBins);

  // 生成高斯权重
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

  // 归一化
  for (let dh = -radius; dh <= radius; dh++) {
    for (let ds = -radius; ds <= radius; ds++) {
      weights[dh + radius][ds + radius] /= weightSum;
    }
  }

  // 应用平滑
  for (let h = 0; h < hueBins; h++) {
    for (let s = 0; s < satBins; s++) {
      let sum = 0;
      for (let dh = -radius; dh <= radius; dh++) {
        for (let ds = -radius; ds <= radius; ds++) {
          // 色相环形索引
          const hIdx = (h + dh + hueBins) % hueBins;
          // 饱和度边界处理（clamp）
          const sIdx = Math.max(0, Math.min(satBins - 1, s + ds));
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
 * 在二维直方图中找峰值
 */
export function find2DPeaks(
  histogram: Float32Array,
  hueBins: number,
  satBins: number,
  threshold: number,
  minHueDistance: number,
  minSatDistance: number
): Peak2D[] {
  const maxVal = Math.max(...histogram);
  if (maxVal === 0) return [];

  const thresholdValue = maxVal * threshold;
  const peaks: Peak2D[] = [];

  // 找局部最大值（8邻域）
  for (let h = 0; h < hueBins; h++) {
    for (let s = 0; s < satBins; s++) {
      const curr = histogram[h * satBins + s];
      if (curr < thresholdValue) continue;

      let isMax = true;
      for (let dh = -1; dh <= 1 && isMax; dh++) {
        for (let ds = -1; ds <= 1 && isMax; ds++) {
          if (dh === 0 && ds === 0) continue;
          // 色相环形索引
          const hIdx = (h + dh + hueBins) % hueBins;
          // 饱和度边界
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

  // 按值排序
  peaks.sort((a, b) => b.value - a.value);

  // 合并相近峰值
  const merged: Peak2D[] = [];
  const minHueBins = Math.round(minHueDistance * hueBins);
  const minSatBins = Math.round(minSatDistance * satBins);

  for (const peak of peaks) {
    let tooClose = false;
    for (const existing of merged) {
      // 计算色相环形距离
      let hueDist = Math.abs(peak.hueIndex - existing.hueIndex);
      hueDist = Math.min(hueDist, hueBins - hueDist);

      const satDist = Math.abs(peak.satIndex - existing.satIndex);

      if (hueDist < minHueBins && satDist < minSatBins) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      merged.push(peak);
    }
  }

  return merged;
}
