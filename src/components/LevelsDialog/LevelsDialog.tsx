import React, { useEffect, useRef, useState } from 'react';
import { useLevels } from '../../hooks/useLevels';
import type { Channel } from '../../utils/levels';
import styles from './LevelsDialog.module.css';

interface LevelsDialogProps {
  isOpen: boolean;
  imageData: ImageData | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onApply: (imageData: ImageData) => void;
  onCancel: () => void;
}

const CHANNEL_LABELS: Record<Channel, string> = {
  master: 'Master (RGB)',
  r: 'Red',
  g: 'Green',
  b: 'Blue',
  a: 'Alpha',
};

export const LevelsDialog: React.FC<LevelsDialogProps> = ({
  isOpen,
  imageData,
  canvasRef,
  onApply,
  onCancel,
}) => {
  const {
    selectedChannel,
    setSelectedChannel,
    currentLevels,
    isLogScale,
    setIsLogScale,
    histogramCanvasRef,
    previewEnabled,
    isApplying,
    updateLevel,
    handlePreviewToggle,
    handleReset,
    handleApply,
  } = useLevels(isOpen, imageData, canvasRef, onApply);

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null);

  // Center on first open
  useEffect(() => {
    if (isOpen) {
      setPos({
        x: Math.round(window.innerWidth / 2 - 190),
        y: Math.round(window.innerHeight / 2 - 200),
      });
    }
  }, [isOpen]);

  const handleTitleMouseDown = (e: React.MouseEvent) => {
    if (!pos) return;
    e.preventDefault();
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      setPos({
        x: dragStart.current.posX + ev.clientX - dragStart.current.mouseX,
        y: dragStart.current.posY + ev.clientY - dragStart.current.mouseY,
      });
    };
    const onUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (!isOpen || !pos) return null;

  const isLoading = !imageData;
  const isBusy = isLoading || isApplying;

  return (
    <div
      className={styles.dialog}
      style={{ left: pos.x, top: pos.y }}
    >
      <div className={styles.titleBar} onMouseDown={handleTitleMouseDown}>
        <span>Уровни{isLoading ? ' — загрузка...' : isApplying ? ' — применение...' : ''}</span>
        <button className={styles.closeBtn} onMouseDown={(e) => e.stopPropagation()} onClick={onCancel}>✕</button>
      </div>

      <div className={styles.body}>
        <div className={styles.row}>
          <label className={styles.label}>Канал:</label>
          <select
            className={styles.select}
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value as Channel)}
          >
            {(Object.keys(CHANNEL_LABELS) as Channel[]).map((ch) => (
              <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
            ))}
          </select>
          <div className={styles.scaleBtns}>
            <button
              className={`${styles.scaleBtn} ${!isLogScale ? styles.scaleBtnActive : ''}`}
              onClick={() => setIsLogScale(false)}
            >Линейная</button>
            <button
              className={`${styles.scaleBtn} ${isLogScale ? styles.scaleBtnActive : ''}`}
              onClick={() => setIsLogScale(true)}
            >Лог</button>
          </div>
        </div>

        <div className={styles.histogramWrap}>
          <canvas ref={histogramCanvasRef} className={styles.histCanvas} width={256} height={100} />
        </div>

        <div className={styles.sliders}>
          <div className={styles.sliderRow}>
            <div className={styles.sliderHeader}>
              <span>Чёрная точка</span>
              <span>{currentLevels.black}</span>
            </div>
            <input
              type="range"
              className={styles.rangeInput}
              min={0}
              max={currentLevels.white - 1}
              value={currentLevels.black}
              onChange={(e) => updateLevel('black', Number(e.target.value))}
            />
          </div>

          <div className={styles.sliderRow}>
            <div className={styles.sliderHeader}>
              <span>Белая точка</span>
              <span>{currentLevels.white}</span>
            </div>
            <input
              type="range"
              className={styles.rangeInput}
              min={currentLevels.black + 1}
              max={255}
              value={currentLevels.white}
              onChange={(e) => updateLevel('white', Number(e.target.value))}
            />
          </div>

          <div className={styles.sliderRow}>
            <div className={styles.sliderHeader}>
              <span>Гамма</span>
              <span>{currentLevels.gamma.toFixed(1)}</span>
            </div>
            <input
              type="range"
              className={styles.rangeInput}
              min={0.1}
              max={9.9}
              step={0.1}
              value={currentLevels.gamma}
              onChange={(e) => updateLevel('gamma', Number(e.target.value))}
            />
          </div>
        </div>

        <div className={styles.inputs}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Чёрная точка</label>
            <input
              className={styles.numInput}
              type="number"
              min={0}
              max={currentLevels.white - 1}
              value={currentLevels.black}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) updateLevel('black', Math.max(0, Math.min(currentLevels.white - 1, v)));
              }}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Гамма</label>
            <input
              className={styles.numInput}
              type="number"
              min={0.1}
              max={9.9}
              step={0.1}
              value={currentLevels.gamma.toFixed(1)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) updateLevel('gamma', Math.max(0.1, Math.min(9.9, v)));
              }}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Белая точка</label>
            <input
              className={styles.numInput}
              type="number"
              min={currentLevels.black + 1}
              max={255}
              value={currentLevels.white}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) updateLevel('white', Math.max(currentLevels.black + 1, Math.min(255, v)));
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <label className={styles.previewLabel}>
          <input
            type="checkbox"
            checked={previewEnabled}
            onChange={(e) => handlePreviewToggle(e.target.checked)}
          />
          Предпросмотр
        </label>
        <div className={styles.footerBtns}>
          <button className={styles.btn} onClick={handleReset}>Сброс</button>
          <button className={styles.btn} onClick={onCancel}>Отмена</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleApply} disabled={isBusy}>
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};
