import React from 'react';
import styles from './StatusBar.module.css';

interface StatusBarProps {
  width?: number;
  height?: number;
  colorDepth?: number;
  zoom?: number;
  fileName?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  width,
  height,
  colorDepth,
  zoom = 100,
  fileName,
}) => {
  const hasImage = !!(width && height);

  return (
    <footer className={styles.bar}>
      <div className={styles.left}>
        {hasImage ? (
          <>
            <span className={styles.item}>{fileName}</span>
            <span className={styles.sep}>|</span>
            <span className={styles.item}>{width} × {height} пкс</span>
            <span className={styles.sep}>|</span>
            <span className={styles.item}>{colorDepth ?? 32} бит</span>
          </>
        ) : (
          <span className={styles.hint}>Откройте изображение для начала работы</span>
        )}
      </div>
      <div className={styles.right}>
        <span className={styles.item}>{zoom}%</span>
      </div>
    </footer>
  );
};
