import React, { useState } from 'react';
import type { ChannelId, PickedPixel } from '../../types';
import { ChannelsPanel } from '../ChannelsPanel/ChannelsPanel';
import { EyedropperInfo } from '../EyedropperInfo/EyedropperInfo';
import styles from './RightPanel.module.css';

type RightPanelProps =
  | { hasImage: false }
  | {
      hasImage: true;
      width: number;
      height: number;
      colorDepth: number;
      fileName: string;
      format: string;
      imageData: ImageData;
      activeChannels: ReadonlySet<ChannelId>;
      onChannelToggle: (channelId: ChannelId) => void;
      pickedPixel: PickedPixel | null;
    };

const Section: React.FC<{ title: string; children: React.ReactNode; noPad?: boolean }> = ({
  title,
  children,
  noPad,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setCollapsed(!collapsed)}>
        <span className={`${styles.arrow} ${collapsed ? styles.arrowClosed : ''}`}>▾</span>
        <span className={styles.sectionTitle}>{title}</span>
      </div>
      {!collapsed && (
        <div className={noPad ? styles.sectionBodyNoPad : styles.sectionBody}>{children}</div>
      )}
    </div>
  );
};

export const RightPanel: React.FC<RightPanelProps> = (props) => {
  return (
    <aside className={styles.panel}>
      <Section title="Информация">
        {props.hasImage ? (
          <dl className={styles.infoList}>
            <dt>Файл</dt>
            <dd title={props.fileName}>{props.fileName}</dd>
            <dt>Формат</dt>
            <dd>{props.format.toUpperCase()}</dd>
            <dt>Ширина</dt>
            <dd>{props.width} пкс</dd>
            <dt>Высота</dt>
            <dd>{props.height} пкс</dd>
            <dt>Глубина</dt>
            <dd>{props.colorDepth} бит</dd>
          </dl>
        ) : (
          <p className={styles.empty}>Изображение не загружено</p>
        )}
      </Section>

      <Section title="Каналы" noPad>
        {props.hasImage ? (
          <ChannelsPanel
            imageData={props.imageData}
            colorDepth={props.colorDepth}
            activeChannels={props.activeChannels}
            onToggle={props.onChannelToggle}
          />
        ) : (
          <p className={styles.empty} style={{ padding: '8px' }}>Изображение не загружено</p>
        )}
      </Section>

      <Section title="Пипетка">
        {props.hasImage ? (
          <EyedropperInfo pixel={props.pickedPixel} />
        ) : (
          <p className={styles.empty}>Изображение не загружено</p>
        )}
      </Section>
    </aside>
  );
};
