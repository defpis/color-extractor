import { useState, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPos(null)}
      >
        {children}
      </div>
      {pos &&
        createPortal(
          <div
            className="fixed z-[9999] px-2 py-1.5 bg-gray-800 text-white text-xs rounded-lg shadow-lg"
            style={{
              left: pos.x,
              top: pos.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            {content}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-800 rotate-45 -mt-1" />
          </div>,
          document.body
        )}
    </>
  );
}
