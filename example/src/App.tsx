import { useState, useCallback } from "react";
import { MasonryGrid } from "./components/MasonryGrid";
import { ImageCard } from "./components/ImageCard";
import { UploadPanel } from "./components/UploadPanel";
import "./index.css";
import { makeId } from "./utils/identity";
import { ColumnWidthRange, LayoutItem } from "./utils/masonry";

// 图片数据接口
export interface ImageItem extends LayoutItem {
  src: string;
  img: HTMLImageElement | null;
}

const PRESET_URLS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", // 山脉
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800", // 森林
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800", // 瀑布
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800", // 湖泊
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800", // 海洋
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800", // 雾山
  "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800", // 树林
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800", // 人像
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800", // 人像2
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800", // 人像3
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800", // 人像4
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800", // 食物
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800", // 披萨
  "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800", // 甜点
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800", // 美食
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", // 建筑
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800", // 城市
  "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800", // 纽约
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800", // 街道
];

// 布局参数
const DEFAULT_COLUMN_WIDTH_RANGE: ColumnWidthRange = [200, 320];
const DEFAULT_GAP = 16;
const DEFAULT_MAX_OFFSET = 24;
const DEFAULT_ASPECT_RATIO = 4 / 3;
const DEFAULT_EXTRA_HEIGHT = 40;

function App() {
  const [images, setImages] = useState<ImageItem[]>(() =>
    PRESET_URLS.map((src) => ({
      id: makeId(),
      src,
      aspectRatio: DEFAULT_ASPECT_RATIO,
      img: null,
    }))
  );

  const handleChange = useCallback((payload: Partial<ImageItem>) => {
    setImages((prev) =>
      prev.map((img) => (img.id === payload.id ? { ...img, ...payload } : img))
    );
  }, []);

  const handleUpload = useCallback((files: File[]) => {
    const newImages: ImageItem[] = files.map((file) => ({
      id: makeId(),
      src: URL.createObjectURL(file),
      aspectRatio: DEFAULT_ASPECT_RATIO,
      img: null,
    }));
    setImages((prev) => [...newImages, ...prev]);
  }, []);

  return (
    <div className="min-h-screen flex">
      <UploadPanel onUpload={handleUpload} />
      <div className="flex-1 p-4">
        <MasonryGrid
          items={images}
          columnWidthRange={DEFAULT_COLUMN_WIDTH_RANGE}
          gap={DEFAULT_GAP}
          maxOffset={DEFAULT_MAX_OFFSET}
          extraHeight={DEFAULT_EXTRA_HEIGHT}
          renderItem={(item) => (
            <ImageCard
              {...item}
              extraHeight={DEFAULT_EXTRA_HEIGHT}
              onChange={handleChange}
            />
          )}
        />
      </div>
    </div>
  );
}

export default App;
