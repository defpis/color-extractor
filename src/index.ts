export type { HuePeak } from "./types";
import type { HuePeak, HueBinStats } from "./types";
import { rgbToHsl } from "./color";
import { find1DHuePeaks } from "./histogram";
import { downsampleImage } from "./image";

// ─────────────────────────────────────────────────────────────────────────────
// 固定配置（与 colorUtils.ts 完全一致）
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE_SIZE = 256; // 降采样尺寸
const HUE_BINS = 36; // 色相分箱数
const BIN_SIZE = 360 / HUE_BINS; // 每个 bin 的角度范围

/**
 * 从图片提取色相峰值（带范围）
 *
 * 算法流程：
 * 1. 降采样 → 建立一维色相直方图（按权重累加）
 * 2. 查找局部最大值（波峰）
 * 3. 确定每个波峰的左右波谷
 * 4. 基于谷值比例和色相距离合并相邻波峰
 * 5. 使用 CIEDE2000 合并感知相似的颜色
 * 6. 过滤权重过低的颜色
 */
export function extractHuePeaks(img: HTMLImageElement): HuePeak[] {
  // 降采样获取像素数据
  const imageData = downsampleImage(img, SAMPLE_SIZE);
  const { data } = imageData;

  // ─────────────────────────────────────────────
  // 步骤 1: 建立一维色相直方图（与 colorUtils.ts 完全一致）
  // ─────────────────────────────────────────────
  const histogram = new Float32Array(HUE_BINS);
  const saturationSum = new Float32Array(HUE_BINS);
  const lightnessSum = new Float32Array(HUE_BINS);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 200) continue; // 跳过透明像素

    const hsl = rgbToHsl(r, g, b);
    // hsl.h: 0-360 整数, hsl.s: 0-100 整数, hsl.l: 0-100 整数

    // 跳过灰色或极端亮度（与 colorUtils.ts 完全一致）
    if (hsl.s < 10 || hsl.l < 5 || hsl.l > 95) continue;

    // 权重：饱和度高 + 亮度接近 50% = 权重大（与 colorUtils.ts 完全一致）
    const weight = (hsl.s / 100) * (1 - Math.abs(hsl.l - 50) / 50);

    // 计算 bin 索引（与 colorUtils.ts 完全一致）
    const binIndex = Math.floor(hsl.h / BIN_SIZE) % HUE_BINS;
    histogram[binIndex] += weight;
    saturationSum[binIndex] += hsl.s * weight;
    lightnessSum[binIndex] += hsl.l * weight;
  }

  // 转换为 binStats 格式
  const binStats = new Map<number, HueBinStats>();
  for (let i = 0; i < HUE_BINS; i++) {
    if (histogram[i] > 0) {
      binStats.set(i, {
        sumS: saturationSum[i],
        sumL: lightnessSum[i],
        count: histogram[i],
      });
    }
  }

  // ─────────────────────────────────────────────
  // 步骤 2: 波谷分割法检测峰值
  // ─────────────────────────────────────────────
  return find1DHuePeaks(histogram, HUE_BINS, binStats);
}
