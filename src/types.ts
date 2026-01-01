/** 颜色提取配置 */
export interface ExtractConfig {
  peakDistance: number; // 峰值合并距离（0-1）
  huePrecision: number; // 色相精度（0-1，值越大分箱越多）
  minSaturation: number; // 最小饱和度（0-1，低于此值视为灰色）
  lightnessMargin: number; // 亮度边界（0-1，过滤接近黑白的颜色）
  hueMergeDistance: number; // 色相合并距离（0-1，合并色相接近的颜色）
}

/** 提取的颜色 */
export interface ExtractedColor {
  hex: string;
  area: number; // 占比 (0-1)
  hue: number; // 色相 (0-360)
  saturation: number; // 饱和度 (0-1)
  lightness: number; // 亮度 (0-1)
}

/** HSL 颜色 */
export interface HSL {
  h: number; // 0-360
  s: number; // 0-1
  l: number; // 0-1
}

/** 二维直方图峰值 */
export interface Peak2D {
  hueIndex: number;
  satIndex: number;
  value: number;
  hue: number;
  saturation: number;
}

/** 分箱统计 */
export interface BinStats {
  sumL: number;
  count: number;
}
