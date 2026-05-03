import React, { useState } from 'react';
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
    };

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

      <Section title="История">
        <p className={styles.empty}>История пуста</p>
      </Section>
    </aside>
  );
};
