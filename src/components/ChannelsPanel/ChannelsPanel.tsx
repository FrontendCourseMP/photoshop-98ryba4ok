import React, { useRef, useEffect } from 'react';
import type { ChannelId } from '../../types';
import { getChannelIds, extractChannelPreview } from '../../utils/colorChannels';
import styles from './ChannelsPanel.module.css';

const CHANNEL_LABELS: Record<ChannelId, string> = {
  composite: 'Совмещенный',
  red: 'Красный',
  green: 'Зеленый',
  blue: 'Синий',
  alpha: 'Альфа',
  gray: 'Серый',
};

const THUMB_W = 52;

function ChannelThumbnail({ bitmap, channelId, width, height }: {
  bitmap: ImageBitmap;
  channelId: ChannelId;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const aspect = height / width;
    const thumbW = THUMB_W;
    const thumbH = Math.max(1, Math.round(thumbW * aspect));
    canvas.width = thumbW;
    canvas.height = thumbH;

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;

    // Draw scaled-down bitmap — fast GPU operation
    ctx.drawImage(bitmap, 0, 0, thumbW, thumbH);

    if (channelId !== 'composite') {
      // getImageData on ~2000 pixels (52px thumb), not millions
      const thumbData = ctx.getImageData(0, 0, thumbW, thumbH);
      const preview = extractChannelPreview(thumbData, channelId);
      ctx.putImageData(preview, 0, 0);
    }
  }, [bitmap, channelId, width, height]);

  return <canvas ref={canvasRef} className={styles.thumbnail} />;
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg className={styles.eyeIcon} viewBox="0 0 16 12" fill="none" aria-hidden>
      {visible ? (
        <>
          <path d="M1 6C3 2 13 2 15 6C13 10 3 10 1 6Z" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="6" r="2.2" fill="currentColor" />
        </>
      ) : (
        <>
          <path d="M1 6C3 2 13 2 15 6C13 10 3 10 1 6Z" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
          <line x1="2" y1="11" x2="14" y2="1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

interface ChannelRowProps {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  channelId: ChannelId;
  active: boolean;
  onClick: () => void;
}

const CHANNEL_COLOR_CLASS: Partial<Record<ChannelId, string>> = {
  red:   styles.channelRed,
  green: styles.channelGreen,
  blue:  styles.channelBlue,
  alpha: styles.channelAlpha,
};

function ChannelRow({ bitmap, width, height, channelId, active, onClick }: ChannelRowProps) {
  const colorClass = active ? (CHANNEL_COLOR_CLASS[channelId] ?? '') : '';
  return (
    <div
      className={`${styles.row} ${active ? styles.rowActive : styles.rowInactive} ${colorClass}`}
      onClick={onClick}
      role="button"
      aria-pressed={active}
    >
      <EyeIcon visible={active} />
      <div className={styles.thumbWrap}>
        <ChannelThumbnail bitmap={bitmap} channelId={channelId} width={width} height={height} />
      </div>
      <span className={styles.label}>{CHANNEL_LABELS[channelId]}</span>
    </div>
  );
}

export interface ChannelsPanelProps {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  colorDepth: number;
  activeChannels: ReadonlySet<ChannelId>;
  onToggle: (channelId: ChannelId) => void;
}

export const ChannelsPanel: React.FC<ChannelsPanelProps> = ({
  bitmap,
  width,
  height,
  colorDepth,
  activeChannels,
  onToggle,
}) => {
  const channelIds = getChannelIds(colorDepth);
  const hasComposite = channelIds.includes('red');
  const allActive = channelIds.every((ch) => activeChannels.has(ch));

  return (
    <div className={styles.panel}>
      {hasComposite && (
        <ChannelRow
          bitmap={bitmap}
          width={width}
          height={height}
          channelId="composite"
          active={allActive}
          onClick={() => onToggle('composite')}
        />
      )}
      {channelIds.map((ch) => (
        <ChannelRow
          key={ch}
          bitmap={bitmap}
          width={width}
          height={height}
          channelId={ch}
          active={activeChannels.has(ch)}
          onClick={() => onToggle(ch)}
        />
      ))}
    </div>
  );
};
