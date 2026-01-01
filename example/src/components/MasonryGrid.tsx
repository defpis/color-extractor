import { useRef, ReactNode } from "react";
import { useMasonryLayout } from "../hooks/useMasonryLayout";
import { LayoutItem, ColumnWidthRange } from "../utils/masonry";

export interface MasonryItem extends LayoutItem {}

interface MasonryGridProps<T extends MasonryItem> {
  items: T[];
  columnWidthRange: ColumnWidthRange;
  gap: number;
  maxOffset: number;
  extraHeight: number;
  renderItem: (item: T) => ReactNode;
}

export function MasonryGrid<T extends MasonryItem>({
  items,
  columnWidthRange,
  gap,
  maxOffset,
  extraHeight,
  renderItem,
}: MasonryGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { positions, totalHeight, columnWidth } = useMasonryLayout({
    containerRef,
    items,
    columnWidthRange,
    gap,
    maxOffset,
    extraHeight,
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: totalHeight }}
    >
      {items.map((item) => {
        const position = positions.get(item.id) || { x: 0, y: 0 };
        const height = Math.round(columnWidth / item.aspectRatio) + extraHeight;
        return (
          <div
            key={item.id}
            className="absolute transition-transform duration-300 ease-out shadow-xl rounded-2xl overflow-hidden"
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
              width: columnWidth,
              height,
            }}
          >
            {renderItem(item)}
          </div>
        );
      })}
    </div>
  );
}
