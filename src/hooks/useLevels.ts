import { useState, useEffect, useRef } from 'react';
import { applyLevelsInWorker, computeHistogram, drawHistogram, defaultLevels } from '../utils/levels';
import type { Channel, LevelValues } from '../utils/levels';
import { LevelsPreviewWorker } from '../utils/levelsPreviewWorker';

export function useLevels(
  isOpen: boolean,
  imageData: ImageData | null,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onApply: (imageData: ImageData) => void,
) {
  const [selectedChannel, setSelectedChannel] = useState<Channel>('master');
  const [levels, setLevels] = useState(defaultLevels);
  const [isLogScale, setIsLogScale] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const histogramCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewWorkerRef = useRef<LevelsPreviewWorker | null>(null);
  const previewBitmapRef = useRef<ImageBitmap | null>(null);

  useEffect(() => {
    if (!isOpen || !imageData || !histogramCanvasRef.current) return;
    const canvas = histogramCanvasRef.current;
    const channel = selectedChannel;
    const logScale = isLogScale;

    // Defer histogram to idle time so it doesn't block the frame where the dialog opens
    const run = () => {
      const histogram = computeHistogram(imageData, channel);
      drawHistogram(canvas, histogram, logScale);
    };

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(run);
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(run, 0);
      return () => clearTimeout(id);
    }
  }, [isOpen, imageData, selectedChannel, isLogScale]);

  // Spin up persistent preview worker when dialog opens with imageData
  useEffect(() => {
    if (!isOpen || !imageData) {
      previewWorkerRef.current?.terminate();
      previewWorkerRef.current = null;
      previewBitmapRef.current?.close();
      previewBitmapRef.current = null;
      return;
    }
    previewWorkerRef.current = new LevelsPreviewWorker(imageData);
    return () => {
      previewWorkerRef.current?.terminate();
      previewWorkerRef.current = null;
      previewBitmapRef.current?.close();
      previewBitmapRef.current = null;
    };
  }, [isOpen, imageData]);

  // On each slider tick: send only levels (tiny) to worker, draw result via GPU bitmap
  useEffect(() => {
    if (!isOpen || !imageData) return;

    const isDefault =
      levels.r.black === 0 && levels.r.white === 255 && levels.r.gamma === 1 &&
      levels.g.black === 0 && levels.g.white === 255 && levels.g.gamma === 1 &&
      levels.b.black === 0 && levels.b.white === 255 && levels.b.gamma === 1 &&
      levels.a.black === 0 && levels.a.white === 255 && levels.a.gamma === 1;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!previewEnabled || isDefault) {
      // Draw original without allocation
      void createImageBitmap(imageData).then(bmp => {
        const ctx = canvas.getContext('2d');
        if (!ctx) { bmp.close(); return; }
        ctx.drawImage(bmp, 0, 0);
        previewBitmapRef.current?.close();
        previewBitmapRef.current = bmp;
      });
      return;
    }

    const worker = previewWorkerRef.current;
    if (!worker) return;

    void worker.compute(levels).then(result => {
      return createImageBitmap(result);
    }).then(bmp => {
      const ctx = canvas.getContext('2d');
      if (!ctx) { bmp.close(); return; }
      ctx.drawImage(bmp, 0, 0);
      previewBitmapRef.current?.close();
      previewBitmapRef.current = bmp;
    });
  }, [imageData, levels, previewEnabled, isOpen, canvasRef]);

  const updateLevel = (key: keyof LevelValues, value: number) => {
    setLevels((prev) => {
      if (selectedChannel === 'master') {
        const updated = { ...prev.master, [key]: value };
        return { ...prev, master: updated, r: updated, g: updated, b: updated };
      }
      return { ...prev, [selectedChannel]: { ...prev[selectedChannel], [key]: value } };
    });
  };

  const handlePreviewToggle = (checked: boolean) => {
    setPreviewEnabled(checked);
  };

  const handleReset = () => {
    setLevels(defaultLevels);
    setIsLogScale(false);
    setPreviewEnabled(true);
  };

  const handleApply = () => {
    if (!imageData || isApplying) return;
    setIsApplying(true);
    applyLevelsInWorker(imageData, levels).then(
      result => {
        onApply(result);
      },
      (err) => {
        console.error('[applyLevels] worker error:', err);
        setIsApplying(false);
      },
    );
  };

  return {
    selectedChannel,
    setSelectedChannel,
    levels,
    currentLevels: levels[selectedChannel],
    isLogScale,
    setIsLogScale,
    histogramCanvasRef,
    previewEnabled,
    isApplying,
    updateLevel,
    handlePreviewToggle,
    handleReset,
    handleApply,
  };
}
