import { memo, useEffect, useState } from "react";
import { extractHuePeaks } from "color-extractor";
import type { HuePeak } from "color-extractor";
import { ImageItem } from "../App";
import { Tooltip } from "./Tooltip";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.addEventListener("load", () => {
      resolve(img);
    });

    img.addEventListener("error", () => {
      reject(new Error(`Failed to load image from ${src}`));
    });

    img.src = src;
  });
}

export enum ImageStatus {
  IDLE = "idle",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

function ColorDot({ peak }: { peak: HuePeak }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(peak.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // 格式化色相范围
  const formatHueRange = (
    start: number,
    end: number,
    startIdx: number,
    endIdx: number
  ) => {
    const startRounded = Math.round(start);
    const endRounded = Math.round(end);

    // 如果跨边界（环形），显示两个范围
    if (startIdx > endIdx) {
      return `${startRounded}° - 360° / 0° - ${endRounded}°`;
    }

    if (startRounded === endRounded) {
      return `${startRounded}°`;
    }
    return `${startRounded}° - ${endRounded}°`;
  };

  return (
    <Tooltip
      content={
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{peak.hex}</span>
            <span className="text-gray-300 text-xs">
              {(peak.area * 100).toFixed(1)}%
            </span>
          </div>
          <div className="text-xs text-gray-400">
            色相: {formatHueRange(peak.startHue, peak.endHue, peak.startIndex, peak.endIndex)}
          </div>
        </div>
      }
    >
      <div
        className="relative w-6 h-6 rounded-full cursor-pointer transition-all hover:scale-110 active:scale-95
          ring-1 ring-black/10 shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
        style={{ backgroundColor: peak.hex }}
        onClick={handleClick}
      >
        {copied && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full animate-[fadeIn_0.15s_ease-out]">
            <svg
              className="w-3.5 h-3.5 text-white animate-[scaleIn_0.2s_ease-out]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>
    </Tooltip>
  );
}

export interface ImageCardProps extends ImageItem {
  extraHeight: number;
  onChange: (payload: Partial<ImageItem>) => void;
}

export const ImageCard = memo(
  ({ id, src, img, extraHeight, onChange }: ImageCardProps) => {
    const [status, setStatus] = useState<ImageStatus>(ImageStatus.IDLE);
    const [peaks, setPeaks] = useState<HuePeak[]>([]);

    useEffect(() => {
      let cancelled = false;

      setStatus(ImageStatus.LOADING);

      loadImage(src)
        .then((img) => {
          if (cancelled) return;
          const aspectRatio = img.width / img.height;
          setStatus(ImageStatus.SUCCESS);
          onChange({ id, img, aspectRatio });
        })
        .catch((err) => {
          console.error(err);
          if (cancelled) return;
          setStatus(ImageStatus.ERROR);
        });

      return () => {
        cancelled = true;
      };
    }, [id, src]);

    useEffect(() => {
      if (!img) return;
      const peaks = extractHuePeaks(img);
      setPeaks(peaks);
    }, [img]);

    if (status !== ImageStatus.SUCCESS) return null;

    return (
      <>
        <img src={src} />
        <div
          className="bg-gradient-to-b from-white to-gray-50 flex items-center justify-center gap-2 px-2"
          style={{ height: extraHeight }}
        >
          {peaks.map((peak, i) => (
            <ColorDot key={i} peak={peak} />
          ))}
        </div>
      </>
    );
  }
);
