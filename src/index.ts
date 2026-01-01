export type { ExtractConfig, ExtractedColor } from "./types";
import type { ExtractConfig, ExtractedColor, BinStats } from "./types";
import { rgbToHsl, hslToRgb, rgbToHex } from "./color";
import { smooth2DHistogram, find2DPeaks } from "./histogram";
import { downsampleImage } from "./image";
import { mergeCloseColors } from "./merge";

const SAMPLE_SIZE = 256; // 降采样尺寸
const SAT_BINS = 10; // 饱和度分箱数
const MAX_COLORS = 9; // 最大返回颜色数

/**
 * 从图片提取主要颜色
 *
 * 算法流程：
 * 1. 降采样 → 建立 H×S 二维直方图（按饱和度加权）
 * 2. 高斯平滑 → 峰值检测
 * 3. 生成颜色：峰值 H/S + 区域平均 L
 * 4. 按鲜艳度排序 → 合并相近色相
 */
export function extractColors(
  img: HTMLImageElement,
  config: ExtractConfig,
): ExtractedColor[] {
  const {
    peakDistance,
    huePrecision,
    minSaturation,
    lightnessMargin,
    hueMergeDistance,
  } = config;

  // 降采样获取像素数据
  const imageData = downsampleImage(img, SAMPLE_SIZE);
  const { data } = imageData;

  // 直方图参数：huePrecision 控制色相分箱数（36~360）
  const hueBins = Math.max(36, Math.round(36 + huePrecision * 324));
  const satBins = SAT_BINS;
  const smoothRadius = Math.max(
    1,
    Math.round(Math.min(hueBins, satBins) * 0.08),
  );

  // 过滤阈值（乘 0.8 留出边界余量）
  const clampedMinSat = minSaturation * 0.8;
  const clampedLightness = lightnessMargin * 0.8;
  const satRange = 1 - clampedMinSat;
  const minLightness = clampedLightness * 0.5;
  const maxLightness = 1 - clampedLightness * 0.5;

  // ─────────────────────────────────────────────
  // 步骤 1: 建立二维直方图
  // ─────────────────────────────────────────────
  const histogram = new Float32Array(hueBins * satBins);
  const binStats = new Map<number, BinStats>(); // 记录每个 bin 的亮度统计
  let totalWeight = 0;

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue; // 跳过半透明像素

    const hsl = rgbToHsl(r, g, b);

    // 过滤低饱和度、极端亮度
    if (hsl.s < clampedMinSat || hsl.l < minLightness || hsl.l > maxLightness)
      continue;

    // 计算 bin 索引
    const hBin = Math.floor((hsl.h / 360) * hueBins) % hueBins;
    const sBin = Math.min(
      satBins - 1,
      Math.floor(((hsl.s - clampedMinSat) / satRange) * satBins),
    );
    const binKey = hBin * satBins + sBin;

    // 按饱和度加权累加
    histogram[binKey] += hsl.s;
    totalWeight += hsl.s;

    // 记录亮度用于后续平均
    if (!binStats.has(binKey)) binStats.set(binKey, { sumL: 0, count: 0 });
    const stats = binStats.get(binKey)!;
    stats.sumL += hsl.l;
    stats.count++;
  }

  if (totalWeight === 0) return [];

  // ─────────────────────────────────────────────
  // 步骤 2: 平滑直方图 + 峰值检测
  // ─────────────────────────────────────────────
  const smoothed = smooth2DHistogram(histogram, hueBins, satBins, smoothRadius);
  const peaks = find2DPeaks(
    smoothed,
    hueBins,
    satBins,
    0.05, // 阈值：忽略低于最大值 5% 的峰
    peakDistance,
    peakDistance * 2,
  );

  // ─────────────────────────────────────────────
  // 步骤 3: 生成颜色
  // ─────────────────────────────────────────────
  const colors: ExtractedColor[] = [];

  for (const peak of peaks) {
    // 计算峰值周围区域的统计范围
    const hRadius = Math.max(1, Math.round(peakDistance * hueBins * 0.5));
    const sRadius = Math.max(1, Math.round(peakDistance * satBins));

    // 累加区域内的面积和亮度
    let totalArea = 0;
    let totalL = 0;
    let totalCount = 0;

    for (let dh = -hRadius; dh <= hRadius; dh++) {
      for (let ds = -sRadius; ds <= sRadius; ds++) {
        const hIdx = (peak.hueIndex + dh + hueBins) % hueBins; // 色相环形
        const sIdx = peak.satIndex + ds;
        if (sIdx < 0 || sIdx >= satBins) continue;

        const binKey = hIdx * satBins + sIdx;
        totalArea += histogram[binKey];

        const stats = binStats.get(binKey);
        if (stats) {
          totalL += stats.sumL;
          totalCount += stats.count;
        }
      }
    }

    if (totalArea === 0) continue;

    // 区域平均亮度
    const avgL = totalCount > 0 ? totalL / totalCount : 0.5;
    // 峰值饱和度映射回实际范围
    const actualSat = clampedMinSat + peak.saturation * satRange;
    // 合成最终颜色
    const [r, g, b] = hslToRgb(peak.hue, actualSat, avgL);

    colors.push({
      hex: rgbToHex(r, g, b),
      area: totalArea / totalWeight,
      hue: peak.hue,
      saturation: actualSat,
      lightness: avgL,
    });
  }

  // ─────────────────────────────────────────────
  // 步骤 4: 排序 + 合并
  // ─────────────────────────────────────────────

  // 按「鲜艳度 × 稀有度」排序（鲜艳的小面积颜色优先）
  colors.sort((a, b) => {
    const intensity = (c: ExtractedColor) =>
      c.saturation * (0.5 - Math.abs(0.5 - c.lightness)) * 2;
    const power = (c: ExtractedColor) => (intensity(c) + 0.1) * (0.9 - c.area);
    return power(b) - power(a);
  });

  // 合并色相接近的颜色
  return mergeCloseColors(colors, hueMergeDistance).slice(0, MAX_COLORS);
}
