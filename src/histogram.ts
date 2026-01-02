import { Peak2D, HuePeak } from "./types";
import { hslToRgb, rgbToHex, rgbToLab, deltaE2000 } from "./color";

/**
 * 二维直方图高斯平滑
 * - 色相维度：环形（0° 和 360° 相邻）
 * - 饱和度维度：线性（边界 clamp）
 */
export function smooth2DHistogram(
  histogram: Float32Array,
  hueBins: number,
  satBins: number,
  radius: number
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
  minSatDistance: number
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

/**
 * 一维色相直方图高斯平滑（环形）
 */
export function smooth1DHistogram(
  histogram: Float32Array,
  bins: number,
  radius: number
): Float32Array {
  const smoothed = new Float32Array(bins);

  // 预计算一维高斯权重
  const weights: number[] = [];
  let weightSum = 0;
  for (let d = -radius; d <= radius; d++) {
    const weight = Math.exp(-(d * d) / (2 * (radius / 2) ** 2));
    weights[d + radius] = weight;
    weightSum += weight;
  }

  // 归一化
  for (let i = 0; i < weights.length; i++) {
    weights[i] /= weightSum;
  }

  // 一维卷积（环形）
  for (let i = 0; i < bins; i++) {
    let sum = 0;
    for (let d = -radius; d <= radius; d++) {
      const idx = (i + d + bins) % bins; // 环形
      sum += histogram[idx] * weights[d + radius];
    }
    smoothed[i] = sum;
  }

  return smoothed;
}

/**
 * 环形索引
 */
function circularIndex(i: number, n: number): number {
  return ((i % n) + n) % n;
}

/**
 * 环形距离
 */
function circularDistance(idx1: number, idx2: number, n: number): number {
  const diff = Math.abs(idx2 - idx1);
  return Math.min(diff, n - diff);
}

/**
 * 局部波峰结构
 */
interface LocalPeak {
  index: number;
  value: number;
  leftValley: number;
  rightValley: number;
}

/**
 * 查找所有局部最大值
 */
function findLocalPeaks(histogram: Float32Array): LocalPeak[] {
  const n = histogram.length;
  const peaks: LocalPeak[] = [];

  for (let i = 0; i < n; i++) {
    const prev = histogram[circularIndex(i - 1, n)];
    const curr = histogram[i];
    const next = histogram[circularIndex(i + 1, n)];

    // 局部最大值：严格大于一侧，大于等于另一侧
    if ((curr > prev && curr >= next) || (curr >= prev && curr > next)) {
      peaks.push({ index: i, value: curr, leftValley: -1, rightValley: -1 });
    }
  }

  return peaks;
}

/**
 * 为波峰找到左右波谷
 */
function findValleys(peaks: LocalPeak[], histogram: Float32Array): void {
  const n = histogram.length;

  // 只有一个波峰时，范围就是整个直方图
  if (peaks.length === 1) {
    peaks[0].leftValley = circularIndex(peaks[0].index + 1, n);
    peaks[0].rightValley = peaks[0].index;
    return;
  }

  for (let i = 0; i < peaks.length; i++) {
    const peak = peaks[i];
    const prevPeak = peaks[circularIndex(i - 1, peaks.length)];
    const nextPeak = peaks[circularIndex(i + 1, peaks.length)];

    // 左波谷：从波峰往左找到前一个波峰之间的最小值
    let leftValleyIdx = peak.index;
    let leftValleyVal = peak.value;
    let j = circularIndex(peak.index - 1, n);
    while (j !== prevPeak.index) {
      if (histogram[j] < leftValleyVal) {
        leftValleyVal = histogram[j];
        leftValleyIdx = j;
      }
      j = circularIndex(j - 1, n);
    }
    peak.leftValley = leftValleyIdx;

    // 右波谷：从波峰往右找到下一个波峰之间的最小值
    let rightValleyIdx = peak.index;
    let rightValleyVal = peak.value;
    j = circularIndex(peak.index + 1, n);
    while (j !== nextPeak.index) {
      if (histogram[j] < rightValleyVal) {
        rightValleyVal = histogram[j];
        rightValleyIdx = j;
      }
      j = circularIndex(j + 1, n);
    }
    peak.rightValley = rightValleyIdx;
  }
}

/**
 * 合并相邻波峰（基于谷值比例和色相距离）
 * @param maxPeaks 最大波峰数量
 */
function mergeAdjacentPeaks(
  peaks: LocalPeak[],
  histogram: Float32Array,
  maxPeaks: number
): void {
  const n = histogram.length;

  while (peaks.length > maxPeaks) {
    let bestIdx = -1;
    let bestScore = -1;

    for (let i = 0; i < peaks.length; i++) {
      const curr = peaks[i];
      const next = peaks[(i + 1) % peaks.length];

      const valleyValue = histogram[curr.rightValley];
      const minPeakValue = Math.min(curr.value, next.value);

      if (minPeakValue > 0) {
        // 谷值比例：谷越浅，比例越大，越应该合并
        const valleyRatio = valleyValue / minPeakValue;

        // 距离因子：距离越近，越应该合并
        const distance = circularDistance(curr.index, next.index, n);
        const distanceFactor = 1 - distance / (n / 2);

        // 综合评分
        const score = valleyRatio * (0.5 + 0.5 * distanceFactor);

        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
    }

    if (bestIdx >= 0) {
      // 合并评分最高的一对
      const curr = peaks[bestIdx];
      const nextIdx = (bestIdx + 1) % peaks.length;
      const next = peaks[nextIdx];

      if (curr.value >= next.value) {
        // 当前峰值更大，吸收下一个
        curr.rightValley = next.rightValley;
        peaks.splice(nextIdx, 1);
      } else {
        // 下一个峰值更大，吸收当前
        next.leftValley = curr.leftValley;
        peaks.splice(bestIdx, 1);
      }
    } else {
      break;
    }
  }
}

/**
 * 计算范围内的统计值
 * avgS 和 avgL 返回 0-100 范围（与 colorUtils.ts 一致）
 */
function calculateRangeStats(
  histogram: Float32Array,
  startIdx: number,
  endIdx: number,
  binStats?: Map<number, { sumS: number; sumL: number; count: number }>
): { area: number; avgS: number; avgL: number } {
  const n = histogram.length;
  let area = 0;
  let totalS = 0;
  let totalL = 0;
  let totalCount = 0;

  let j = startIdx;
  while (true) {
    area += histogram[j];
    if (binStats) {
      const stats = binStats.get(j);
      if (stats && stats.count > 0) {
        totalS += stats.sumS;
        totalL += stats.sumL;
        totalCount += stats.count;
      }
    }
    if (j === endIdx) break;
    j = circularIndex(j + 1, n);
  }

  return {
    area,
    avgS: totalCount > 0 ? totalS / totalCount : 50,
    avgL: totalCount > 0 ? totalL / totalCount : 50,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 常量配置
// ─────────────────────────────────────────────────────────────────────────────
const MAX_PEAKS = 5; // 最大波峰数量
const DELTA_E_THRESHOLD = 10; // CIEDE2000 色差阈值
const MIN_WEIGHT_RATIO = 0.01; // 最小权重比例

/**
 * 色相差（考虑循环）
 */
function hueDiff(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff);
}

/**
 * 合并色相范围（考虑循环，使用 bin 索引）
 */
function mergeHueRanges(
  s1: number,
  e1: number,
  s2: number,
  e2: number,
  bins: number
): [number, number] {
  // 检查范围是否已包含对方
  const inRange = (h: number, s: number, e: number): boolean => {
    if (s <= e) return h >= s && h <= e;
    return h >= s || h <= e;
  };

  const range1Contains2 = inRange(s2, s1, e1) && inRange(e2, s1, e1);
  const range2Contains1 = inRange(s1, s2, e2) && inRange(e1, s2, e2);

  if (range1Contains2) return [s1, e1];
  if (range2Contains1) return [s2, e2];

  // 选择更小的合并范围
  const span1 = s1 <= e2 ? e2 - s1 : bins - s1 + e2;
  const span2 = s2 <= e1 ? e1 - s2 : bins - s2 + e1;

  return span1 <= span2 ? [s1, e2] : [s2, e1];
}

/**
 * 使用 CIEDE2000 合并感知相似的颜色
 * 与 colorUtils.ts 完全一致
 */
function mergeSimilarColors(peaks: HuePeak[], bins: number): HuePeak[] {
  const merged: HuePeak[] = [];

  for (const peak of peaks) {
    // 与 colorUtils.ts 一致：使用 peakIndex (bin索引) 作为色相
    // saturation 和 lightness 已经是 0-100 范围
    const [r, g, b] = hslToRgb(peak.peakIndex, peak.saturation, peak.lightness);
    const lab = rgbToLab(r, g, b);

    // 查找相似的已有波峰
    let target: HuePeak | null = null;
    for (const existing of merged) {
      // 色相差异太大则不合并（超过 30° 不合并）
      // 与 colorUtils.ts 一致
      if (hueDiff(peak.peakIndex, existing.peakIndex) > 30) continue;

      const [er, eg, eb] = hslToRgb(
        existing.peakIndex,
        existing.saturation,
        existing.lightness
      );
      if (deltaE2000(lab, rgbToLab(er, eg, eb)) < DELTA_E_THRESHOLD) {
        target = existing;
        break;
      }
    }

    if (target) {
      // 合并到已有波峰（与 colorUtils.ts 一致）
      const w1 = target.area;
      const w2 = peak.area;
      const totalW = w1 + w2;

      // 扩展色相范围
      const [newStartIdx, newEndIdx] = mergeHueRanges(
        target.startIndex,
        target.endIndex,
        peak.startIndex,
        peak.endIndex,
        bins
      );
      target.startIndex = newStartIdx;
      target.endIndex = newEndIdx;
      target.startHue = (newStartIdx / bins) * 360;
      target.endHue = (newEndIdx / bins) * 360;

      target.area = totalW;
      target.saturation =
        (target.saturation * w1 + peak.saturation * w2) / totalW;
      target.lightness = (target.lightness * w1 + peak.lightness * w2) / totalW;

      // 更新代表颜色
      const [nr, ng, nb] = hslToRgb(
        target.peakHue,
        target.saturation,
        target.lightness
      );
      target.hex = rgbToHex(nr, ng, nb);

      if (peak.peakValue > target.peakValue) {
        target.peakValue = peak.peakValue;
        target.peakHue = peak.peakHue;
        target.peakIndex = peak.peakIndex;
      }
    } else {
      merged.push({ ...peak });
    }
  }

  return merged;
}

/**
 * 过滤权重过低的颜色
 */
function filterByWeight(peaks: HuePeak[]): HuePeak[] {
  const total = peaks.reduce((sum, p) => sum + p.area, 0);
  return peaks.filter((p) => p.area >= total * MIN_WEIGHT_RATIO);
}

/**
 * 一维色相峰值检测（波谷分割法）
 *
 * 算法流程：
 * 1. 查找所有局部最大值（波峰）
 * 2. 确定每个波峰的左右波谷
 * 3. 基于谷值比例和色相距离合并相邻波峰
 * 4. 转换为 HuePeak 格式
 * 5. 使用 CIEDE2000 合并感知相似的颜色
 * 6. 过滤权重过低的颜色
 *
 * @param histogram 原始直方图
 * @param bins 分箱数
 * @param binStats 每个 bin 的饱和度和亮度统计
 */
export function find1DHuePeaks(
  histogram: Float32Array,
  bins: number,
  binStats?: Map<number, { sumS: number; sumL: number; count: number }>
): HuePeak[] {
  const maxVal = Math.max(...histogram);
  if (maxVal === 0) return [];

  // ─────────────────────────────────────────────
  // 步骤 1: 查找所有局部最大值
  // ─────────────────────────────────────────────
  const localPeaks = findLocalPeaks(histogram);

  if (localPeaks.length === 0) {
    // 没有局部最大值，返回最大值所在的 bin
    const maxIdx = Array.from(histogram).indexOf(maxVal);
    const { avgS, avgL } = calculateRangeStats(
      histogram,
      0,
      bins - 1,
      binStats
    );
    // avgS 和 avgL 已经是 0-100 范围
    const [r, g, b] = hslToRgb((maxIdx / bins) * 360, avgS, avgL);

    return [
      {
        peakHue: (maxIdx / bins) * 360,
        peakIndex: maxIdx,
        peakValue: maxVal,
        startHue: 0,
        endHue: ((bins - 1) / bins) * 360,
        startIndex: 0,
        endIndex: bins - 1,
        area: 1,
        hex: rgbToHex(r, g, b),
        saturation: avgS,
        lightness: avgL,
      },
    ];
  }

  // ─────────────────────────────────────────────
  // 步骤 2: 确定波谷
  // ─────────────────────────────────────────────
  findValleys(localPeaks, histogram);

  // ─────────────────────────────────────────────
  // 步骤 3: 合并相邻波峰（限制最大数量）
  // ─────────────────────────────────────────────
  mergeAdjacentPeaks(localPeaks, histogram, MAX_PEAKS);

  // ─────────────────────────────────────────────
  // 步骤 4: 转换为 HuePeak 格式
  // ─────────────────────────────────────────────
  const totalArea = histogram.reduce((sum, val) => sum + val, 0);
  let huePeaks: HuePeak[] = [];

  for (const peak of localPeaks) {
    const startIdx = peak.leftValley;
    const endIdx = peak.rightValley;

    const { area, avgS, avgL } = calculateRangeStats(
      histogram,
      startIdx,
      endIdx,
      binStats
    );

    const peakHue = (peak.index / bins) * 360;
    // avgS 和 avgL 已经是 0-100 范围
    const [r, g, b] = hslToRgb(peakHue, avgS, avgL);

    huePeaks.push({
      peakHue,
      peakIndex: peak.index,
      peakValue: peak.value,
      startHue: (startIdx / bins) * 360,
      endHue: (endIdx / bins) * 360,
      startIndex: startIdx,
      endIndex: endIdx,
      area: totalArea > 0 ? area / totalArea : 0,
      hex: rgbToHex(r, g, b),
      saturation: avgS,
      lightness: avgL,
    });
  }

  // 按峰值降序排列
  huePeaks.sort((a, b) => b.peakValue - a.peakValue);

  // ─────────────────────────────────────────────
  // 步骤 5: CIEDE2000 合并相似颜色
  // ─────────────────────────────────────────────
  huePeaks = mergeSimilarColors(huePeaks, bins);

  // ─────────────────────────────────────────────
  // 步骤 6: 过滤低权重
  // ─────────────────────────────────────────────
  huePeaks = filterByWeight(huePeaks);

  // 按权重降序返回
  huePeaks.sort((a, b) => b.area - a.area);

  return huePeaks;
}
