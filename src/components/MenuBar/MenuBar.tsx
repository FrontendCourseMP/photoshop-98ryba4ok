import React, { useState, useRef, useEffect } from 'react';
import styles from './MenuBar.module.css';

interface MenuBarProps {
  onOpen: () => void;
  onSaveAsPNG: () => void;
  onSaveAsJPG: () => void;
  onSaveAsGB7: () => void;
  isImageLoaded: boolean;
}

type OpenMenu = 'file' | 'edit' | 'image' | 'view' | null;

export const MenuBar: React.FC<MenuBarProps> = ({
  onOpen,
  onSaveAsPNG,
  onSaveAsJPG,
  onSaveAsGB7,
  isImageLoaded,
}) => {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (name: OpenMenu) =>
    setOpenMenu((prev) => (prev === name ? null : name));

  const act = (fn: () => void) => {
    setOpenMenu(null);
    fn();
  };

  return (
    <nav className={styles.menuBar} ref={barRef}>
      <div className={styles.menuItem}>
        <button
          className={`${styles.menuBtn} ${openMenu === 'file' ? styles.menuBtnActive : ''}`}
          onClick={() => toggle('file')}
        >
          Файл
        </button>
        {openMenu === 'file' && (
          <div className={styles.dropdown}>
            <button className={styles.dropItem} onClick={() => act(onOpen)}>
              Открыть…
              <span className={styles.shortcut}>Ctrl+O</span>
            </button>
            <div className={styles.divider} />
            <button
              className={styles.dropItem}
              onClick={() => isImageLoaded && act(onSaveAsPNG)}
              disabled={!isImageLoaded}
            >
              Сохранить как PNG
              <span className={styles.shortcut}>Ctrl+S</span>
            </button>
            <button
              className={styles.dropItem}
              onClick={() => isImageLoaded && act(onSaveAsJPG)}
              disabled={!isImageLoaded}
            >
              Сохранить как JPG
            </button>
            <button
              className={styles.dropItem}
              onClick={() => isImageLoaded && act(onSaveAsGB7)}
              disabled={!isImageLoaded}
            >
              Сохранить как GB7
            </button>
          </div>
        )}
      </div>

      <div className={styles.menuItem}>
        <button
          className={`${styles.menuBtn} ${openMenu === 'edit' ? styles.menuBtnActive : ''}`}
          onClick={() => toggle('edit')}
        >
          Правка
        </button>
        {openMenu === 'edit' && (
          <div className={styles.dropdown}>
            <button className={styles.dropItem} disabled>
              Отменить
              <span className={styles.shortcut}>Ctrl+Z</span>
            </button>
            <button className={styles.dropItem} disabled>
              Повторить
              <span className={styles.shortcut}>Ctrl+Y</span>
            </button>
          </div>
        )}
      </div>

      <div className={styles.menuItem}>
        <button
          className={`${styles.menuBtn} ${openMenu === 'image' ? styles.menuBtnActive : ''}`}
          onClick={() => toggle('image')}
        >
          Изображение
        </button>
        {openMenu === 'image' && (
          <div className={styles.dropdown}>
            <button className={styles.dropItem} disabled>Размер изображения…</button>
            <button className={styles.dropItem} disabled>Размер холста…</button>
          </div>
        )}
      </div>

      <div className={styles.menuItem}>
        <button
          className={`${styles.menuBtn} ${openMenu === 'view' ? styles.menuBtnActive : ''}`}
          onClick={() => toggle('view')}
        >
          Вид
        </button>
        {openMenu === 'view' && (
          <div className={styles.dropdown}>
            <button className={styles.dropItem} disabled>
              Увеличить
              <span className={styles.shortcut}>Ctrl++</span>
            </button>
            <button className={styles.dropItem} disabled>
              Уменьшить
              <span className={styles.shortcut}>Ctrl+−</span>
            </button>
            <button className={styles.dropItem} disabled>
              По размеру экрана
              <span className={styles.shortcut}>Ctrl+0</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
