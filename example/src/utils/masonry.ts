import { UniqueId } from "./identity";

// ============================================================================
// Types
// ============================================================================

/** 布局项 */
export interface LayoutItem {
  id: UniqueId;
  aspectRatio: number; // 宽高比 (width / height)
}

/** 位置 */
export interface Position {
  x: number;
  y: number;
}

/** 列宽范围 [最小值, 最大值] */
export type ColumnWidthRange = [min: number, max: number];

/** 布局配置 */
export interface MasonryConfig {
  containerWidth: number;
  columnWidthRange: ColumnWidthRange;
  gap: number;
  maxOffset: number;
  extraHeight: number; // 每个卡片额外的固定高度
}

/** 布局结果 */
export interface MasonryLayout {
  positions: Map<UniqueId, Position>;
  totalHeight: number;
  columnWidth: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/** 计算列数 */
export function calculateColumns(
  containerWidth: number,
  columnWidth: number,
  gap: number
): number {
  return Math.max(1, Math.floor((containerWidth + gap) / (columnWidth + gap)));
}

/** 计算居中偏移量 */
export function calculateCenterOffset(
  containerWidth: number,
  columns: number,
  columnWidth: number,
  gap: number
): number {
  const contentWidth = columns * columnWidth + (columns - 1) * gap;
  return Math.max(0, (containerWidth - contentWidth) / 2);
}

/**
 * 找到最优列宽
 *
 * 算法：
 * 1. 根据列宽范围计算可能的列数
 * 2. 对每种列数，计算能完美填充的列宽
 * 3. 如果空白 ≤ maxOffset，直接采用
 * 4. 否则选空白最少的
 */
export function findOptimalColumnWidth(
  containerWidth: number,
  [minWidth, maxWidth]: ColumnWidthRange,
  gap: number,
  maxOffset: number
): number {
  const minColumns = calculateColumns(containerWidth, maxWidth, gap);
  const maxColumns = calculateColumns(containerWidth, minWidth, gap);

  let bestWidth = minWidth;
  let minOffset = Infinity;

  for (let columns = minColumns; columns <= maxColumns; columns++) {
    // 该列数下完美填充的列宽
    const perfectColumnWidth = (containerWidth - gap * (columns - 1)) / columns;

    // 限制在范围内
    const columnWidth = Math.round(
      Math.max(minWidth, Math.min(maxWidth, perfectColumnWidth))
    );

    const offset = calculateCenterOffset(
      containerWidth,
      columns,
      columnWidth,
      gap
    );

    // 空白足够小，直接采用
    if (offset <= maxOffset) {
      return columnWidth;
    }

    // 记录最优
    if (offset < minOffset) {
      minOffset = offset;
      bestWidth = columnWidth;
    }
  }

  return bestWidth;
}

// ============================================================================
// Main Function
// ============================================================================

/** 计算瀑布流布局 */
export function calculateMasonryLayout(
  items: LayoutItem[],
  config: MasonryConfig
): MasonryLayout {
  const { containerWidth, columnWidthRange, gap, maxOffset, extraHeight } =
    config;

  // 1. 找到最优列宽
  const columnWidth = findOptimalColumnWidth(
    containerWidth,
    columnWidthRange,
    gap,
    maxOffset
  );

  // 2. 计算列数和偏移
  const columns = calculateColumns(containerWidth, columnWidth, gap);
  const offset = calculateCenterOffset(
    containerWidth,
    columns,
    columnWidth,
    gap
  );

  // 3. 计算每个 item 的位置
  const columnHeights = new Array<number>(columns).fill(0);
  const positions = new Map<UniqueId, Position>();

  for (const item of items) {
    // 找最短的列
    const minHeight = Math.min(...columnHeights);
    const columnIndex = columnHeights.indexOf(minHeight);

    // 计算位置
    const x = columnIndex * (columnWidth + gap) + offset;
    const y = columnHeights[columnIndex];
    positions.set(item.id, { x, y });

    // 根据 aspectRatio 计算高度，更新列高
    const height = Math.round(columnWidth / item.aspectRatio) + extraHeight;
    columnHeights[columnIndex] += height + gap;
  }

  // 4. 计算总高度
  const totalHeight = Math.max(...columnHeights, 0);

  return { positions, totalHeight, columnWidth };
}
