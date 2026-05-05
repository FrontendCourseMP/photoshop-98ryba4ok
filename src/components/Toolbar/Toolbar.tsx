import React from 'react';
import type { ActiveTool } from '../../types';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
}

function PointerIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
      <path d="M3 2l10 6-5 1-2 5L3 2z" fill="currentColor" />
    </svg>
  );
}

function EyedropperIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
      <path
        d="M11 2a2 2 0 0 1 2.83 2.83L6 12.66 3 14l1.34-3L11 2z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="3.5" cy="13.5" r="1" fill="currentColor" />
    </svg>
  );
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolChange }) => {
  return (
    <aside className={styles.toolbar}>
      <button
        className={`${styles.btn} ${activeTool === 'pointer' ? styles.btnActive : ''}`}
        onClick={() => onToolChange('pointer')}
        title="Указатель (V)"
      >
        <PointerIcon />
      </button>
      <button
        className={`${styles.btn} ${activeTool === 'eyedropper' ? styles.btnActive : ''}`}
        onClick={() => onToolChange('eyedropper')}
        title="Пипетка (I)"
      >
        <EyedropperIcon />
      </button>
    </aside>
  );
};
