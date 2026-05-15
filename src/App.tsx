import { useState, useRef, useEffect, useCallback } from 'react';
import type { ImageState, ChannelId, PickedPixel, ActiveTool } from './types';
import { decodeGB7, encodeGB7 } from './codecs/gb7';
import { getChannelIds } from './utils/colorChannels';
import { decodePixels } from './utils/imageWorker';
import { MenuBar } from './components/MenuBar/MenuBar';
import { Toolbar } from './components/Toolbar/Toolbar';
import { CanvasArea, snapZoom } from './components/CanvasArea/CanvasArea';
import { RightPanel } from './components/RightPanel/RightPanel';
import { StatusBar } from './components/StatusBar/StatusBar';
import { LevelsDialog } from './components/LevelsDialog/LevelsDialog';
import { useHotkeys } from './hooks/useHotkeys';
import { DebugPanel } from './components/DebugPanel';
import styles from './App.module.css';

function App() {
  const [image, setImage] = useState<ImageState>({
    bitmap: null,
    data: null,
    width: null,
    height: null,
    colorDepth: null,
    fileName: null,
    format: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [activeChannels, setActiveChannels] = useState<Set<ChannelId>>(new Set());
  const [activeTool, setActiveTool] = useState<ActiveTool>('pointer');
  const [pickedPixel, setPickedPixel] = useState<PickedPixel | null>(null);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [canvasRedrawKey, setCanvasRedrawKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (image.colorDepth !== null) {
      setActiveChannels(new Set(getChannelIds(image.colorDepth)));
    }
    setPickedPixel(null);
  }, [image.bitmap]);

  // Close old ImageBitmap when replaced — GPU memory is NOT freed by GC alone
  useEffect(() => {
    const bitmap = image.bitmap;
    return () => { bitmap?.close(); };
  }, [image.bitmap]);

  const handleChannelToggle = (channelId: ChannelId) => {
    if (!image.colorDepth) return;
    const available = getChannelIds(image.colorDepth);

    const doToggle = () => {
      setActiveChannels((prev) => {
        if (channelId === 'composite') return new Set(available);
        const next = new Set(prev);
        if (next.has(channelId)) {
          if (next.size === 1) return prev;
          next.delete(channelId);
        } else {
          next.add(channelId);
        }
        return next;
      });
    };

    if (!image.data && image.bitmap) {
      // Decode pixels in worker, then toggle
      void decodePixels(image.bitmap).then(pixels => {
        setImage(prev => ({ ...prev, data: pixels }));
        doToggle();
      });
    } else {
      doToggle();
    }
  };

  const handleOpenDialog = () => fileInputRef.current?.click();

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const processFile = async (file: File) => {
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    let format: ImageState['format'] = null;

    if (ext === 'png') format = 'png';
    else if (ext === 'jpg' || ext === 'jpeg') format = 'jpg';
    else if (ext === 'gb7') format = 'gb7';
    else {
      setError('Неподдерживаемый формат. Используйте PNG, JPG или GB7.');
      return;
    }

    if (format === 'gb7') {
      try {
        const buffer = await file.arrayBuffer();
        const { imageData, colorDepth } = decodeGB7(buffer);
        const bitmap = await createImageBitmap(imageData);
        setImage({ bitmap, data: imageData, width: imageData.width, height: imageData.height, colorDepth, fileName: file.name, format: 'gb7' });
        setZoom(100);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка декодирования GB7');
      }
      return;
    }

    try {
      // createImageBitmap decodes async without blocking main thread
      const bitmap = await createImageBitmap(file);
      setImage({
        bitmap,
        data: null, // pixels decoded lazily on demand
        width: bitmap.width,
        height: bitmap.height,
        colorDepth: format === 'jpg' ? 24 : 32,
        fileName: file.name,
        format,
      });
      setZoom(100);
      setError(null);
    } catch {
      setError('Не удалось декодировать изображение.');
    }
  };

  const downloadAs = (format: 'png' | 'jpg') => {
    if (!image.bitmap) return;
    const canvas = document.createElement('canvas');
    canvas.width = image.width!;
    canvas.height = image.height!;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image.bitmap, 0, 0);
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'jpg' ? 0.95 : undefined;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.fileName?.replace(/\.[^.]+$/, '') ?? 'image'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }, mime, quality);
  };

  const handleSaveAsPNG = () => downloadAs('png');
  const handleSaveAsJPG = () => downloadAs('jpg');

  const handleSaveAsGB7 = async () => {
    if (!image.bitmap) return;
    let pixels = image.data;
    if (!pixels) {
      const canvas = document.createElement('canvas');
      canvas.width = image.width!;
      canvas.height = image.height!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(image.bitmap, 0, 0);
      pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    const bytes = encodeGB7(pixels);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${image.fileName?.replace(/\.[^.]+$/, '') ?? 'image'}.gb7`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenLevels = useCallback(() => {
    if (!image.bitmap) return;
    // Open dialog immediately — no blocking
    setLevelsOpen(true);
    // If pixels not yet decoded, do it in a worker (non-blocking)
    if (!image.data) {
      console.log('[levels] decode start');
      void decodePixels(image.bitmap).then(pixels => {
        console.log(`[levels] decode done → setImage(data)  heap=${((performance as any).memory?.usedJSHeapSize / 1024 / 1024 | 0)}MB`);
        setImage(prev => ({ ...prev, data: pixels }));
      });
    } else {
      console.log('[levels] pixels already decoded, using cached');
    }
  }, [image]);

  const handleLevelsApply = useCallback((newPixels: ImageData) => {
    setLevelsOpen(false);
    const t0 = performance.now();
    const h0 = (performance as any).memory?.usedJSHeapSize ?? 0;
    void createImageBitmap(newPixels).then(newBitmap => {
      const elapsed = (performance.now() - t0).toFixed(0);
      const h1 = (performance as any).memory?.usedJSHeapSize ?? 0;
      console.log(`[handleLevelsApply] createImageBitmap ${elapsed}ms  heap Δ${((h1 - h0) / 1024 / 1024).toFixed(0)}MB`);
      // Don't keep the CPU copy — set null so GC can reclaim newPixels.
      // Next levels open will re-decode from the bitmap via the worker.
      setImage(prev => ({ ...prev, bitmap: newBitmap, data: null }));
    });
  }, []);

  const handleLevelsCancel = useCallback(() => {
    setLevelsOpen(false);
    setCanvasRedrawKey((k) => k + 1);
  }, []);

  useHotkeys({
    'o': handleOpenDialog,
    's': () => { if (image.bitmap) handleSaveAsPNG(); },
    'l': () => { if (image.bitmap && !levelsOpen) handleOpenLevels(); },
    '=': () => setZoom((z) => snapZoom(z, 'in')),
    '+': () => setZoom((z) => snapZoom(z, 'in')),
    '-': () => setZoom((z) => snapZoom(z, 'out')),
    '0': () => setZoom(100),
    'i': () => setActiveTool((t) => t === 'eyedropper' ? 'pointer' : 'eyedropper'),
  });

  const hasImage = image.bitmap !== null;

  return (
    <div className={styles.app}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.gb7"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      <MenuBar
        onOpen={handleOpenDialog}
        onSaveAsPNG={handleSaveAsPNG}
        onSaveAsJPG={handleSaveAsJPG}
        onSaveAsGB7={handleSaveAsGB7}
        onOpenLevels={handleOpenLevels}
        isImageLoaded={hasImage}
      />

      <div className={styles.workArea}>
        <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />

        <CanvasArea
          bitmap={image.bitmap ?? undefined}
          pixels={image.data ?? undefined}
          zoom={zoom}
          onZoomChange={setZoom}
          error={error}
          onDrop={processFile}
          onOpenFile={handleOpenDialog}
          activeChannels={activeChannels}
          colorDepth={image.colorDepth ?? undefined}
          activeTool={activeTool}
          onPixelPick={setPickedPixel}
          canvasRef={mainCanvasRef}
          redrawKey={canvasRedrawKey}
        />

        <RightPanel
          {...(hasImage
            ? {
                hasImage: true as const,
                width: image.width!,
                height: image.height!,
                colorDepth: image.colorDepth!,
                fileName: image.fileName!,
                format: image.format!,
                bitmap: image.bitmap!,
                activeChannels,
                onChannelToggle: handleChannelToggle,
                pickedPixel,
              }
            : { hasImage: false as const })}
        />
      </div>

      <StatusBar
        zoom={zoom}
        {...(hasImage
          ? {
              hasImage: true as const,
              width: image.width!,
              height: image.height!,
              colorDepth: image.colorDepth!,
              fileName: image.fileName!,
              format: image.format!,
            }
          : { hasImage: false as const })}
      />

      <LevelsDialog
        isOpen={levelsOpen}
        imageData={image.data}
        canvasRef={mainCanvasRef}
        onApply={handleLevelsApply}
        onCancel={handleLevelsCancel}
      />

      {import.meta.env.DEV && <DebugPanel />}
    </div>
  );
}

export default App;
