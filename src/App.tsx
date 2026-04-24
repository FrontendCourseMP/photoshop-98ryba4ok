import { useState, useRef } from 'react';
import type { ImageState } from './types';
import { decodeGB7, encodeGB7 } from './codecs/gb7';
import { MenuBar } from './components/MenuBar/MenuBar';
import { CanvasArea } from './components/CanvasArea/CanvasArea';
import { RightPanel } from './components/RightPanel/RightPanel';
import { StatusBar } from './components/StatusBar/StatusBar';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const imageData = decodeGB7(buffer);
        setImage({
          data: imageData,
          width: imageData.width,
          height: imageData.height,
          colorDepth: 7,
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
        <CanvasArea
          imageData={image.data ?? undefined}
          zoom={zoom}
          onZoomChange={setZoom}
          error={error}
          onDrop={processFile}
          onOpenFile={handleOpenDialog}
        />
        <RightPanel
          width={image.width ?? undefined}
          height={image.height ?? undefined}
          colorDepth={image.colorDepth ?? undefined}
          fileName={image.fileName ?? undefined}
          format={image.format ?? undefined}
        />
      </div>

      <StatusBar
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        colorDepth={image.colorDepth ?? undefined}
        zoom={zoom}
        fileName={image.fileName ?? undefined}
      />
    </div>
  );
}

export default App;
