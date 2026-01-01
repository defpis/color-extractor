import { useState, useRef, useEffect } from "react";
import { Tooltip } from "./Tooltip";

interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  tooltip?: string;
  onChange: (value: number) => void;
}

const DEBOUNCE_MS = 300;

export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  tooltip,
  onChange,
}: SliderProps) {
  const [localValue, setLocalValue] = useState(value);
  const [inputValue, setInputValue] = useState(value.toString());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 根据 step 决定小数位数
  const decimals = step >= 1 ? 0 : Math.max(0, Math.ceil(-Math.log10(step)));

  // 格式化数字
  const formatValue = (v: number) => {
    return decimals === 0
      ? Math.round(v).toString()
      : parseFloat(v.toFixed(decimals)).toString();
  };

  // 同步外部值
  useEffect(() => {
    setLocalValue(value);
    setInputValue(formatValue(value));
  }, [value]);

  const handleChange = (newValue: number) => {
    const clampedValue = Math.min(max, Math.max(min, newValue));
    setLocalValue(clampedValue);
    setInputValue(formatValue(clampedValue));

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onChange(clampedValue);
    }, DEBOUNCE_MS);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      handleChange(parsed);
    } else {
      setInputValue(formatValue(localValue));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  const percent = ((localValue - min) / (max - min)) * 100;

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          {tooltip && (
            <Tooltip content={<div className="max-w-48">{tooltip}</div>}>
              <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center cursor-help text-gray-500 hover:bg-gray-300 transition-colors">
                <span className="text-xs font-medium">?</span>
              </div>
            </Tooltip>
          )}
        </div>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          className="w-16 text-xs font-mono bg-gray-100 px-2 py-1 rounded-md text-gray-600 text-right
            focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white transition-all
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={(e) => handleChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-gradient-to-br
          [&::-webkit-slider-thumb]:from-violet-500
          [&::-webkit-slider-thumb]:to-purple-600
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-webkit-slider-thumb]:active:scale-95"
        style={{
          background: `linear-gradient(to right, #8b5cf6 0%, #a855f7 ${percent}%, #e5e7eb ${percent}%, #e5e7eb 100%)`,
        }}
      />
    </div>
  );
}
