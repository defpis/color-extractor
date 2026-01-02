import { useState } from "react";
import { UploadButton } from "./UploadButton";

interface UploadPanelProps {
  onUpload: (files: File[]) => void;
}

export function UploadPanel({ onUpload }: UploadPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

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

            {/* Upload Section */}
            <div className="p-6">
              <UploadButton onUpload={onUpload} />
            </div>
          </div>
        </div>

        {/* 折叠按钮 */}
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

