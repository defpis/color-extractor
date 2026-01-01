import {
  useState,
  useLayoutEffect,
  useRef,
  RefObject,
  useEffectEvent,
} from "react";
import {
  LayoutItem,
  MasonryLayout,
  ColumnWidthRange,
  calculateMasonryLayout,
} from "../utils/masonry";

interface UseMasonryLayoutOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  items: LayoutItem[];
  columnWidthRange: ColumnWidthRange;
  gap: number;
  maxOffset: number;
  extraHeight: number;
}

const SCHEDULE_UPDATE_DELAY_MS = 100;

export function useMasonryLayout({
  containerRef,
  items,
  columnWidthRange,
  gap,
  maxOffset,
  extraHeight,
}: UseMasonryLayoutOptions): MasonryLayout {
  const [layout, setLayout] = useState<MasonryLayout>({
    positions: new Map(),
    totalHeight: 0,
    columnWidth: 0,
  });

  const updateLayout = useEffectEvent(() => {
    const container = containerRef.current;
    if (!container) return;

    const newLayout = calculateMasonryLayout(items, {
      containerWidth: container.offsetWidth,
      columnWidthRange,
      gap,
      maxOffset,
      extraHeight,
    });

    setLayout(newLayout);
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleUpdate = useEffectEvent(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      updateLayout();
    }, SCHEDULE_UPDATE_DELAY_MS);
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    updateLayout();
  }, [items, columnWidthRange, gap, extraHeight]);

  return layout;
}
