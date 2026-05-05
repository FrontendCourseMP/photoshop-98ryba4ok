import { useState, useRef, useEffect } from 'react';
import type { ImageState, ChannelId, PickedPixel, ActiveTool } from './types';
import { decodeGB7, encodeGB7 } from './codecs/gb7';
import { getChannelIds } from './utils/colorChannels';
import { MenuBar } from './components/MenuBar/MenuBar';
import { Toolbar } from './components/Toolbar/Toolbar';
import { CanvasArea, snapZoom } from './components/CanvasArea/CanvasArea';
import { RightPanel } from './components/RightPanel/RightPanel';
import { StatusBar } from './components/StatusBar/StatusBar';
import { useHotkeys } from './hooks/useHotkeys';
import styles from './App.module.css';

function App() {
  const [image, setImage] = useState<ImageState>({
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset channels when a new image is loaded
  useEffect(() => {
    if (image.colorDepth !== null) {
      setActiveChannels(new Set(getChannelIds(image.colorDepth)));
    }
    setPickedPixel(null);
  }, [image.data]);

  const handleChannelToggle = (channelId: ChannelId) => {
    if (!image.colorDepth) return;
    const available = getChannelIds(image.colorDepth);

    setActiveChannels((prev) => {
      if (channelId === 'composite') {
        // Composite re-enables all channels
        return new Set(available);
      }
      const next = new Set(prev);
      if (next.has(channelId)) {
        if (next.size === 1) return prev; // keep at least one channel visible
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const handleOpenDialog = () => {
    fileInputRef.current?.click();
  };

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
        setImage({
          data: imageData,
          width: imageData.width,
          height: imageData.height,
          colorDepth,
          fileName: file.name,
          format: 'gb7',
        });
        setZoom(100);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка декодирования GB7');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setImage({
          data: imageData,
          width: img.naturalWidth,
          height: img.naturalHeight,
          colorDepth: 32,
          fileName: file.name,
          format,
        });
        setZoom(100);
        setError(null);
      };
      img.onerror = () => setError('Не удалось декодировать изображение.');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => setError('Не удалось прочитать файл.');
    reader.readAsDataURL(file);
  };

  const downloadAs = (format: 'png' | 'jpg') => {
    if (!image.data) return;
    const canvas = document.createElement('canvas');
    canvas.width = image.data.width;
    canvas.height = image.data.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(image.data, 0, 0);
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'jpg' ? 0.95 : undefined;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = image.fileName?.replace(/\.[^.]+$/, '') ?? 'image';
      a.download = `${baseName}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }, mime, quality);
  };

  const handleSaveAsPNG = () => downloadAs('png');
  const handleSaveAsJPG = () => downloadAs('jpg');

  const handleSaveAsGB7 = () => {
    if (!image.data) return;
    const bytes = encodeGB7(image.data);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = image.fileName?.replace(/\.[^.]+$/, '') ?? 'image';
    a.download = `${baseName}.gb7`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useHotkeys({
    'o': handleOpenDialog,
    's': () => { if (image.data) handleSaveAsPNG(); },
    '=': () => setZoom((z) => snapZoom(z, 'in')),
    '+': () => setZoom((z) => snapZoom(z, 'in')),
    '-': () => setZoom((z) => snapZoom(z, 'out')),
    '0': () => setZoom(100),
    'i': () => setActiveTool((t) => t === 'eyedropper' ? 'pointer' : 'eyedropper'),
  });

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
        isImageLoaded={image.data !== null}
      />

      <div className={styles.workArea}>
        <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />

        <CanvasArea
          imageData={image.data ?? undefined}
          zoom={zoom}
          onZoomChange={setZoom}
          error={error}
          onDrop={processFile}
          onOpenFile={handleOpenDialog}
          activeChannels={activeChannels}
          colorDepth={image.colorDepth ?? undefined}
          activeTool={activeTool}
          onPixelPick={setPickedPixel}
        />

        <RightPanel
          {...(image.data !== null
            ? {
                hasImage: true as const,
                width: image.width!,
                height: image.height!,
                colorDepth: image.colorDepth!,
                fileName: image.fileName!,
                format: image.format!,
                imageData: image.data,
                activeChannels,
                onChannelToggle: handleChannelToggle,
                pickedPixel,
              }
            : { hasImage: false as const })}
        />
      </div>

      <StatusBar
        zoom={zoom}
        {...(image.data !== null
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
    </div>
  );
}

export default App;
