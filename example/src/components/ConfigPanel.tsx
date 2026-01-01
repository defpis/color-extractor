import { useState } from "react";
import { ExtractConfig } from "../App";
import { Slider } from "./Slider";
import { UploadButton } from "./UploadButton";

interface ConfigPanelProps {
  config: ExtractConfig;
  onConfigChange: (config: ExtractConfig) => void;
  onUpload?: (files: File[]) => void;
}

export function ConfigPanel({
  config,
  onConfigChange,
  onUpload,
}: ConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const updateConfig = <K extends keyof ExtractConfig>(
    key: K,
    value: ExtractConfig[K]
  ) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="sticky top-0 h-screen z-50 flex items-center">
      {/* 面板内容 */}
      <div className="relative">
        <div
          className={`bg-gradient-to-b from-white to-gray-50 shadow-2xl rounded-r-2xl transition-all duration-300 overflow-hidden ${
            isOpen ? "w-80" : "w-0"
          }`}
        >
          <div className="w-80">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">
                  Color Extractor
                </h2>
              </div>
            </div>

            {/* Sliders */}
            <div className="p-6 space-y-5">
              <Slider
                label="色相精度"
                tooltip="值越大，直方图分箱越多，颜色区分越细。0 = 36 分箱，1 = 360 分箱"
                value={config.huePrecision}
                onChange={(v) => updateConfig("huePrecision", v)}
              />
              <Slider
                label="色相合并距离"
                tooltip="色相差小于此值的颜色会被合并。值越大，合并越激进"
                value={config.hueMergeDistance}
                onChange={(v) => updateConfig("hueMergeDistance", v)}
              />
              <Slider
                label="最小饱和度"
                tooltip="过滤饱和度低于此值的灰色像素。值越大，保留的颜色越鲜艳"
                value={config.minSaturation}
                onChange={(v) => updateConfig("minSaturation", v)}
              />
              <Slider
                label="亮度边界"
                tooltip="过滤过暗或过亮的像素。值越大，排除的黑白范围越大"
                value={config.lightnessMargin}
                onChange={(v) => updateConfig("lightnessMargin", v)}
              />
              <Slider
                label="峰值合并距离"
                tooltip="直方图中相近峰值的合并距离。值越大，检测到的颜色越少"
                value={config.peakDistance}
                onChange={(v) => updateConfig("peakDistance", v)}
              />
            </div>

            {/* Upload Section */}
            <div className="p-6 pt-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              </div>
              {onUpload && <UploadButton onUpload={onUpload} />}
            </div>
          </div>
        </div>

        {/* 折叠按钮 - 悬浮不占空间 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full bg-white shadow-lg rounded-r-lg px-1.5 py-4 hover:bg-gray-50 transition-colors"
        >
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${
              isOpen ? "" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
