import type { ExtractedColor } from "./types";
import { hslToRgb, rgbToHex } from "./color";

/** 色相环加权平均（处理 0°/360° 边界） */
function weightedHueAverage(
  h1: number,
  h2: number,
  w1: number,
  w2: number,
): number {
  const totalWeight = w1 + w2;
  if (totalWeight === 0) return h1;

  // 取最短路径方向
  let diff = h2 - h1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  let avg = h1 + (diff * w2) / totalWeight;
  if (avg < 0) avg += 360;
  if (avg >= 360) avg -= 360;
  return avg;
}

/**
 * 合并色相接近的颜色
 * - 按面积加权平均 H/S/L
 * - 迭代合并直到没有接近的颜色对
 */
export function mergeCloseColors(
  colors: ExtractedColor[],
  hueMergeDistance: number,
): ExtractedColor[] {
  if (colors.length === 0 || hueMergeDistance <= 0) return colors;

  const distance = hueMergeDistance * 360;
  const merged = [...colors];

  // 迭代合并
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        // 环形色相距离
        let hueDist = Math.abs(merged[i].hue - merged[j].hue);
        hueDist = Math.min(hueDist, 360 - hueDist);

        if (hueDist < distance) {
          const a = merged[i];
          const b = merged[j];
          const totalArea = a.area + b.area;

          // 面积加权平均
          const avgHue = weightedHueAverage(a.hue, b.hue, a.area, b.area);
          const avgSat =
            (a.saturation * a.area + b.saturation * b.area) / totalArea;
          const avgLight =
            (a.lightness * a.area + b.lightness * b.area) / totalArea;

          const [red, green, blue] = hslToRgb(avgHue, avgSat, avgLight);

          merged[i] = {
            hex: rgbToHex(red, green, blue),
            area: totalArea,
            hue: avgHue,
            saturation: avgSat,
            lightness: avgLight,
          };
          merged.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }

  return merged;
}
