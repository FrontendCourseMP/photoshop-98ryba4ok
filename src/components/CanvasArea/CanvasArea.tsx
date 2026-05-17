import React, { useRef, useEffect } from 'react';
import type { ChannelId, PickedPixel, ActiveTool } from '../../types';
import { applyChannelMask, getChannelIds } from '../../utils/colorChannels';
import { rgbToLab } from '../../utils/colorConvert';
import { snapZoom } from './zoom';
import styles from './CanvasArea.module.css';

interface CanvasAreaProps {
  bitmap?: ImageBitmap;
  pixels?: ImageData;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  error: string | null;
  onDrop: (file: File) => void;
  onOpenFile: () => void;
  activeChannels?: ReadonlySet<ChannelId>;
  colorDepth?: number;
  activeTool?: ActiveTool;
  onPixelPick?: (pixel: PickedPixel) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  redrawKey?: number;
}


export const CanvasArea: React.FC<CanvasAreaProps> = ({
  bitmap,
  pixels,
  zoom,
  onZoomChange,
  error,
  onDrop,
  onOpenFile,
  activeChannels,
  colorDepth,
  activeTool = 'pointer',
  onPixelPick,
  canvasRef: externalCanvasRef,
  redrawKey,
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef ?? internalCanvasRef;
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
    if (!canvas || (!bitmap && !pixels)) return;
    // willReadFrequently keeps the canvas in CPU memory — putImageData becomes a
    // cheap memcpy instead of a GPU texture allocation on every call.
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = bitmap?.width ?? pixels!.width;
    const h = bitmap?.height ?? pixels!.height;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // Check if channel mask is needed and pixels are available
    const allActive = !activeChannels || !colorDepth ||
      getChannelIds(colorDepth).every(ch => activeChannels.has(ch));

    if (!allActive && pixels) {
      const available = getChannelIds(colorDepth!);
      const masked = applyChannelMask(pixels, activeChannels!, available);
      ctx.putImageData(masked ?? pixels, 0, 0);
    } else if (bitmap) {
      // Fast GPU path — no pixel readback needed
      ctx.drawImage(bitmap, 0, 0);
    } else if (pixels) {
      ctx.putImageData(pixels, 0, 0);
    }
  }, [bitmap, pixels, activeChannels, colorDepth, redrawKey, canvasRef]);

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
    if (activeTool !== 'eyedropper' || !onPixelPick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = Math.min(Math.max(0, Math.floor((e.clientX - rect.left) * scaleX)), canvas.width - 1);
    const py = Math.min(Math.max(0, Math.floor((e.clientY - rect.top) * scaleY)), canvas.height - 1);

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const { data } = ctx.getImageData(px, py, 1, 1);
    const [r, g, b, a] = data;

    onPixelPick({ x: px, y: py, r, g, b, a, lab: rgbToLab(r, g, b) });
  };

  const scale = zoom / 100;
  const hasImage = !!(bitmap || pixels);
  const imgW = bitmap?.width ?? pixels?.width ?? 0;
  const imgH = bitmap?.height ?? pixels?.height ?? 0;
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
            style={{ width: imgW * scale, height: imgH * scale }}
          >
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              style={{
                width: imgW * scale,
                height: imgH * scale,
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
