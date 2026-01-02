/** HSL 颜色（与 colorUtils.ts 一致） */
export interface HSL {
  h: number; // 0-360 整数
  s: number; // 0-100 整数
  l: number; // 0-100 整数
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

/** 一维色相峰值（带范围） */
export interface HuePeak {
  peakHue: number; // 峰值色相 (0-360)
  peakIndex: number; // 峰值 bin 索引
  peakValue: number; // 峰值大小
  startHue: number; // 范围起始色相 (0-360)
  endHue: number; // 范围结束色相 (0-360)
  startIndex: number; // 范围起始 bin 索引
  endIndex: number; // 范围结束 bin 索引
  area: number; // 该峰值区域的总面积占比 (0-1)
  // 代表性颜色
  hex: string; // 代表性颜色的十六进制值
  saturation: number; // 平均饱和度 (0-100)
  lightness: number; // 平均亮度 (0-100)
}

/** 色相分箱统计 */
export interface HueBinStats {
  sumS: number; // 饱和度加权累加 (0-100 范围)
  sumL: number; // 亮度加权累加 (0-100 范围)
  count: number; // 权重累加
}
