import React from 'react';
import type { PickedPixel } from '../../types';
import styles from './EyedropperInfo.module.css';

interface EyedropperInfoProps {
  pixel: PickedPixel | null;
}

function swatch(r: number, g: number, b: number) {
  return `rgb(${r},${g},${b})`;
}

export const EyedropperInfo: React.FC<EyedropperInfoProps> = ({ pixel }) => {
  if (!pixel) {
    return <p className={styles.hint}>Выберите инструмент «Пипетка» и кликните по изображению</p>;
  }

  const { x, y, r, g, b, a, lab } = pixel;

  return (
    <div className={styles.info}>
      <div className={styles.swatchRow}>
        <span className={styles.swatch} style={{ background: swatch(r, g, b) }} />
        <span className={styles.hex}>
          #{r.toString(16).padStart(2, '0')}{g.toString(16).padStart(2, '0')}{b.toString(16).padStart(2, '0')}
        </span>
      </div>
      <dl className={styles.list}>
        <dt>X</dt><dd>{x}</dd>
        <dt>Y</dt><dd>{y}</dd>
        <dt>R</dt><dd>{r}</dd>
        <dt>G</dt><dd>{g}</dd>
        <dt>B</dt><dd>{b}</dd>
        <dt>A</dt><dd>{a}</dd>
        <dt>L*</dt><dd>{lab.L}</dd>
        <dt>a*</dt><dd>{lab.a}</dd>
        <dt>b*</dt><dd>{lab.b}</dd>
      </dl>
    </div>
  );
};
