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

function ChannelThumbnail({ imageData, channelId }: { imageData: ImageData; channelId: ChannelId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preview = extractChannelPreview(imageData, channelId);
    const tmp = document.createElement('canvas');
    tmp.width = imageData.width;
    tmp.height = imageData.height;
    tmp.getContext('2d')!.putImageData(preview, 0, 0);

    const aspect = imageData.height / imageData.width;
    canvas.width = THUMB_W;
    canvas.height = Math.max(1, Math.round(THUMB_W * aspect));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  }, [imageData, channelId]);

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
  imageData: ImageData;
  channelId: ChannelId;
  active: boolean;
  onClick: () => void;
}

function ChannelRow({ imageData, channelId, active, onClick }: ChannelRowProps) {
  return (
    <div
      className={`${styles.row} ${active ? styles.rowActive : styles.rowInactive}`}
      onClick={onClick}
      role="button"
      aria-pressed={active}
    >
      <EyeIcon visible={active} />
      <div className={styles.thumbWrap}>
        <ChannelThumbnail imageData={imageData} channelId={channelId} />
      </div>
      <span className={styles.label}>{CHANNEL_LABELS[channelId]}</span>
    </div>
  );
}

export interface ChannelsPanelProps {
  imageData: ImageData;
  colorDepth: number;
  activeChannels: ReadonlySet<ChannelId>;
  onToggle: (channelId: ChannelId) => void;
}

export const ChannelsPanel: React.FC<ChannelsPanelProps> = ({
  imageData,
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
          imageData={imageData}
          channelId="composite"
          active={allActive}
          onClick={() => onToggle('composite')}
        />
      )}
      {channelIds.map((ch) => (
        <ChannelRow
          key={ch}
          imageData={imageData}
          channelId={ch}
          active={activeChannels.has(ch)}
          onClick={() => onToggle(ch)}
        />
      ))}
    </div>
  );
};
