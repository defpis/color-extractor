import { HSL } from "./types";

/** RGB (0-255) → HSL (h: 0-360 整数, s/l: 0-100 整数) - 与 colorUtils.ts 一致 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // 返回整数，与 colorUtils.ts 一致
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** HSL (h: 0-360, s/l: 0-100) → RGB (0-255) - 与 colorUtils.ts 一致 */
export function hslToRgb(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/** RGB (0-255) → Hex (#rrggbb) */
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** RGB (0-255) → Lab (D65 illuminant) */
export function rgbToLab(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  // RGB → XYZ
  let rr = r / 255;
  let gg = g / 255;
  let bb = b / 255;

  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;

  rr *= 100;
  gg *= 100;
  bb *= 100;

  const x = rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375;
  const y = rr * 0.2126729 + gg * 0.7151522 + bb * 0.072175;
  const z = rr * 0.0193339 + gg * 0.119192 + bb * 0.9503041;

  // XYZ → Lab
  const refX = 95.047,
    refY = 100.0,
    refZ = 108.883;
  let xx = x / refX;
  let yy = y / refY;
  let zz = z / refZ;

  xx = xx > 0.008856 ? Math.pow(xx, 1 / 3) : 7.787 * xx + 16 / 116;
  yy = yy > 0.008856 ? Math.pow(yy, 1 / 3) : 7.787 * yy + 16 / 116;
  zz = zz > 0.008856 ? Math.pow(zz, 1 / 3) : 7.787 * zz + 16 / 116;

  return [116 * yy - 16, 500 * (xx - yy), 200 * (yy - zz)];
}

/** 计算 CIEDE2000 色差 */
export function deltaE2000(
  lab1: [number, number, number],
  lab2: [number, number, number]
): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const kL = 1,
    kC = 1,
    kH = 1;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cb = (C1 + C2) / 2;
  const G =
    0.5 *
    (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = Math.atan2(b1, a1p) * (180 / Math.PI);
  const h2p = Math.atan2(b2, a2p) * (180 / Math.PI);
  const h1pMod = h1p < 0 ? h1p + 360 : h1p;
  const h2pMod = h2p < 0 ? h2p + 360 : h2p;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2pMod - h1pMod) <= 180) {
    dhp = h2pMod - h1pMod;
  } else if (h2pMod - h1pMod > 180) {
    dhp = h2pMod - h1pMod - 360;
  } else {
    dhp = h2pMod - h1pMod + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);
  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;

  let Hbp: number;
  if (C1p * C2p === 0) {
    Hbp = h1pMod + h2pMod;
  } else if (Math.abs(h1pMod - h2pMod) <= 180) {
    Hbp = (h1pMod + h2pMod) / 2;
  } else if (h1pMod + h2pMod < 360) {
    Hbp = (h1pMod + h2pMod + 360) / 2;
  } else {
    Hbp = (h1pMod + h2pMod - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(((Hbp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * Hbp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * Hbp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * Hbp - 63) * Math.PI) / 180);

  const SL =
    1 + (0.015 * Math.pow(Lbp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT =
    -2 *
    Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7))) *
    Math.sin((60 * Math.exp(-Math.pow((Hbp - 275) / 25, 2)) * Math.PI) / 180);

  return Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
      Math.pow(dCp / (kC * SC), 2) +
      Math.pow(dHp / (kH * SH), 2) +
      RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  );
}
