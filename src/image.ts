/**
 * 降采样图片，返回像素数据
 */
export function downsampleImage(
  img: HTMLImageElement,
  maxSize: number,
): ImageData {
  const { width, height } = img;

  const needsDownsample = width > maxSize || height > maxSize;
  const scale = needsDownsample ? maxSize / Math.max(width, height) : 1;

  const newWidth = Math.max(1, Math.round(width * scale));
  const newHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  return ctx.getImageData(0, 0, newWidth, newHeight);
}
