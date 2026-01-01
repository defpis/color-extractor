export type { ExtractConfig, ExtractedColor } from "./types";
import type { ExtractConfig, ExtractedColor, BinStats } from "./types";
import { rgbToHsl, hslToRgb, rgbToHex } from "./color";
import { smooth2DHistogram, find2DPeaks } from "./histogram";
import { downsampleImage } from "./image";
import { mergeCloseColors } from "./merge";

// 常量
const SAMPLE_SIZE = 256;
const SAT_BINS = 10;
const MAX_COLORS = 9;

/**
 * 从图片提取主要颜色
 *
 * 算法：H×S 二维直方图 + 峰值检测
 * 1. 遍历像素，转 HSL，过滤低饱和度和极端亮度
 * 2. 建立二维直方图（色相 × 饱和度）
 * 3. 对直方图平滑后找峰值
 * 4. 对每个峰值，计算该区间的平均颜色
 * 5. 合并色相接近的颜色
 */
export function extractColors(
  img: HTMLImageElement,
  config: ExtractConfig
): ExtractedColor[] {
  const {
    peakDistance,
    huePrecision,
    minSaturation,
    lightnessMargin,
    hueMergeDistance,
  } = config;

  // 降采样
  const imageData = downsampleImage(img, SAMPLE_SIZE);
  const { data } = imageData;

  // 计算直方图参数
  const hueBins = Math.max(36, Math.round(36 + huePrecision * 324));
  const satBins = SAT_BINS;
  const smoothRadius = Math.max(
    1,
    Math.round(Math.min(hueBins, satBins) * 0.08)
  );

  // 过滤阈值
  const clampedMinSat = minSaturation * 0.8;
  const clampedLightness = lightnessMargin * 0.8;
  const satRange = 1 - clampedMinSat;
  const minLightness = clampedLightness * 0.5;
  const maxLightness = 1 - clampedLightness * 0.5;

  // 1. 建立二维直方图
  const histogram = new Float32Array(hueBins * satBins);
  const binStats = new Map<number, BinStats>();
  let totalWeight = 0;

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue;

    const hsl = rgbToHsl(r, g, b);
    if (hsl.s < clampedMinSat || hsl.l < minLightness || hsl.l > maxLightness)
      continue;

    const hBin = Math.floor((hsl.h / 360) * hueBins) % hueBins;
    const sBin = Math.min(
      satBins - 1,
      Math.floor(((hsl.s - clampedMinSat) / satRange) * satBins)
    );
    const binKey = hBin * satBins + sBin;

    histogram[binKey] += hsl.s;
    totalWeight += hsl.s;

    if (!binStats.has(binKey)) binStats.set(binKey, { sumL: 0, count: 0 });
    const stats = binStats.get(binKey)!;
    stats.sumL += hsl.l;
    stats.count++;
  }

  if (totalWeight === 0) return [];

  // 2. 平滑直方图
  const smoothed = smooth2DHistogram(histogram, hueBins, satBins, smoothRadius);

  // 3. 找峰值
  const peaks = find2DPeaks(
    smoothed,
    hueBins,
    satBins,
    0.05,
    peakDistance,
    peakDistance * 2
  );

  // 4. 生成颜色（保留峰值颜色，不做平均）
  const colors: ExtractedColor[] = [];

  for (const peak of peaks) {
    const hRadius = Math.max(1, Math.round(peakDistance * hueBins * 0.5));
    const sRadius = Math.max(1, Math.round(peakDistance * satBins));

    // 计算区域面积和加权平均亮度
    let totalArea = 0;
    let totalL = 0;
    let totalCount = 0;
    for (let dh = -hRadius; dh <= hRadius; dh++) {
      for (let ds = -sRadius; ds <= sRadius; ds++) {
        const hIdx = (peak.hueIndex + dh + hueBins) % hueBins;
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

    // 使用区域内加权平均亮度，避免平滑后峰值偏移导致的默认值问题
    const avgL = totalCount > 0 ? totalL / totalCount : 0.5;

    // 将峰值饱和度转换为实际范围 [clampedMinSat, 1]
    const actualSat = clampedMinSat + peak.saturation * satRange;

    // 使用峰值的 hue 和实际 saturation，区域加权平均亮度
    const [r, g, b] = hslToRgb(peak.hue, actualSat, avgL);

    colors.push({
      hex: rgbToHex(r, g, b),
      area: totalArea / totalWeight,
      hue: peak.hue,
      saturation: actualSat,
      lightness: avgL,
    });
  }

  // 按 power 排序：鲜艳的小面积颜色优先
  colors.sort((a, b) => {
    const aIntensity = a.saturation * ((0.5 - Math.abs(0.5 - a.lightness)) * 2);
    const bIntensity = b.saturation * ((0.5 - Math.abs(0.5 - b.lightness)) * 2);
    const aPower = (aIntensity + 0.1) * (0.9 - a.area);
    const bPower = (bIntensity + 0.1) * (0.9 - b.area);
    return bPower - aPower;
  });

  // 5. 合并色相接近的颜色
  return mergeCloseColors(colors, hueMergeDistance).slice(0, MAX_COLORS);
}
