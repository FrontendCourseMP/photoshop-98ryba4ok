import React, { useState } from 'react';
import styles from './RightPanel.module.css';

interface RightPanelProps {
  width?: number;
  height?: number;
  colorDepth?: number;
  fileName?: string;
  format?: string;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setCollapsed(!collapsed)}>
        <span className={`${styles.arrow} ${collapsed ? styles.arrowClosed : ''}`}>▾</span>
        <span className={styles.sectionTitle}>{title}</span>
      </div>
      {!collapsed && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
};

export const RightPanel: React.FC<RightPanelProps> = ({
  width,
  height,
  colorDepth,
  fileName,
  format,
}) => {
  const hasImage = !!(width && height);

  return (
    <aside className={styles.panel}>
      <Section title="Информация">
        {hasImage ? (
          <dl className={styles.infoList}>
            <dt>Файл</dt>
            <dd title={fileName}>{fileName ?? '—'}</dd>
            <dt>Формат</dt>
            <dd>{format?.toUpperCase() ?? '—'}</dd>
            <dt>Ширина</dt>
            <dd>{width} пкс</dd>
            <dt>Высота</dt>
            <dd>{height} пкс</dd>
            <dt>Глубина</dt>
            <dd>{colorDepth ?? 32} бит</dd>
          </dl>
        ) : (
          <p className={styles.empty}>Изображение не загружено</p>
        )}
      </Section>

      <Section title="История">
        <p className={styles.empty}>История пуста</p>
      </Section>
    </aside>
  );
};
