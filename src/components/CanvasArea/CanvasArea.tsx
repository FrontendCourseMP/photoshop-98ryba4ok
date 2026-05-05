import React, { useRef, useEffect } from 'react';
import type { ChannelId, PickedPixel, ActiveTool } from '../../types';
import { applyChannelMask, getChannelIds } from '../../utils/colorChannels';
import { rgbToLab } from '../../utils/colorConvert';
import styles from './CanvasArea.module.css';

interface CanvasAreaProps {
  imageData?: ImageData;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  error: string | null;
  onDrop: (file: File) => void;
  onOpenFile: () => void;
  activeChannels?: ReadonlySet<ChannelId>;
  colorDepth?: number;
  activeTool?: ActiveTool;
  onPixelPick?: (pixel: PickedPixel) => void;
}

export const ZOOM_STEPS = [10, 25, 33, 50, 67, 100, 150, 200, 300, 400, 600, 800, 1200, 1600, 3200];

export function snapZoom(current: number, direction: 'in' | 'out'): number {
  if (direction === 'in') {
    const next = ZOOM_STEPS.find((s) => s > current);
    return next ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  }
  const prev = [...ZOOM_STEPS].reverse().find((s) => s < current);
  return prev ?? ZOOM_STEPS[0];
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  imageData,
  zoom,
  onZoomChange,
  error,
  onDrop,
  onOpenFile,
  activeChannels,
  colorDepth,
  activeTool = 'pointer',
  onPixelPick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const onZoomChangeRef = useRef(onZoomChange);
  const [isDragOver, setIsDragOver] = React.useState(false);

  useEffect(() => {
    zoomRef.current = zoom;
    onZoomChangeRef.current = onZoomChange;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;

    let data: ImageData = imageData;
    if (activeChannels && colorDepth !== undefined) {
      const available = getChannelIds(colorDepth);
      data = applyChannelMask(imageData, activeChannels, available) ?? imageData;
    }
    ctx.putImageData(data, 0, 0);
  }, [imageData, activeChannels, colorDepth]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const dir = e.deltaY > 0 ? 'out' : 'in';
      onZoomChangeRef.current(snapZoom(zoomRef.current, dir));
    };

    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onDrop(file);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'eyedropper' || !imageData || !onPixelPick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = Math.min(Math.max(0, Math.floor((e.clientX - rect.left) * scaleX)), imageData.width - 1);
    const py = Math.min(Math.max(0, Math.floor((e.clientY - rect.top) * scaleY)), imageData.height - 1);

    const idx = (py * imageData.width + px) * 4;
    const r = imageData.data[idx];
    const g = imageData.data[idx + 1];
    const b = imageData.data[idx + 2];
    const a = imageData.data[idx + 3];

    onPixelPick({ x: px, y: py, r, g, b, a, lab: rgbToLab(r, g, b) });
  };

  const scale = zoom / 100;
  const hasImage = !!imageData;
  const isEyedropper = activeTool === 'eyedropper';

  return (
    <div
      ref={containerRef}
      className={`${styles.area} ${isDragOver ? styles.dragOver : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {error && <div className={styles.errorToast}>{error}</div>}

      <div className={styles.scroll}>
        {hasImage ? (
          <div
            className={styles.canvasWrapper}
            style={{
              width: imageData!.width * scale,
              height: imageData!.height * scale,
            }}
          >
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              style={{
                width: imageData!.width * scale,
                height: imageData!.height * scale,
                cursor: isEyedropper ? 'crosshair' : 'default',
              }}
              onClick={handleCanvasClick}
            />
          </div>
        ) : (
          <div className={styles.empty} onClick={onOpenFile}>
            <svg className={styles.emptyIcon} viewBox="0 0 64 64" fill="none">
              <rect x="8" y="10" width="48" height="40" rx="2" stroke="#5a5a5a" strokeWidth="1.5"/>
              <path d="M8 38l14-14 10 10 8-8 16 14" stroke="#5a5a5a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="22" cy="24" r="4" stroke="#5a5a5a" strokeWidth="1.5"/>
            </svg>
            <p className={styles.emptyTitle}>Изображение не открыто</p>
            <p className={styles.emptyHint}>
              Перетащите файл сюда или используйте <strong>Файл → Открыть</strong>
            </p>
            <p className={styles.emptyFormats}>PNG · JPG · GB7</p>
          </div>
        )}
      </div>

      {isDragOver && (
        <div className={styles.dropOverlay}>
          <p>Отпустите для открытия</p>
        </div>
      )}
    </div>
  );
};
