import { useState, useEffect } from 'react';

interface Mem { used: number; total: number }

function mb(b: number) { return (b / 1024 / 1024).toFixed(0); }

declare global {
  interface Window { gc?: () => void }
  interface Performance { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }
}

export function DebugPanel() {
  const [mem, setMem] = useState<Mem | null>(null);

  useEffect(() => {
    const snap = () => {
      const m = performance.memory;
      if (m) setMem({ used: m.usedJSHeapSize, total: m.totalJSHeapSize });
    };
    snap();
    const id = setInterval(snap, 800);
    return () => clearInterval(id);
  }, []);

  if (!performance.memory) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: 8, zIndex: 9000,
      background: 'rgba(0,0,0,0.85)', color: '#4dff4d',
      fontFamily: 'monospace', fontSize: 11,
      padding: '3px 8px', borderRadius: 4,
      display: 'flex', gap: 8, alignItems: 'center',
    }}>
      JS heap: {mem ? `${mb(mem.used)} / ${mb(mem.total)} MB` : '…'}
      {window.gc && (
        <button
          onClick={() => window.gc?.()}
          title="Форсировать GC (нужен --expose-gc)"
          style={{ fontSize: 10, cursor: 'pointer', background: '#1a1a1a', color: '#4dff4d', border: '1px solid #4dff4d', borderRadius: 2, padding: '1px 5px' }}
        >
          GC
        </button>
      )}
    </div>
  );
}
