import React from 'react';
import styles from './StatusBar.module.css';

type StatusBarProps = { zoom: number } & (
  | { hasImage: false }
  | {
      hasImage: true;
      width: number;
      height: number;
      colorDepth: number;
      fileName: string;
      format: string;
    }
);

export const StatusBar: React.FC<StatusBarProps> = (props) => {
  return (
    <footer className={styles.bar}>
      <div className={styles.left}>
        {props.hasImage ? (
          <>
            <span className={styles.item}>{props.fileName}</span>
            <span className={styles.sep}>|</span>
            <span className={styles.item}>{props.width} × {props.height} пкс</span>
            <span className={styles.sep}>|</span>
            <span className={styles.item}>{props.format === 'gb7' ? 8 : props.colorDepth} бит</span>
          </>
        ) : (
          <span className={styles.hint}>Откройте изображение для начала работы</span>
        )}
      </div>
      <div className={styles.right}>
        <span className={styles.item}>{props.zoom}%</span>
      </div>
    </footer>
  );
};
