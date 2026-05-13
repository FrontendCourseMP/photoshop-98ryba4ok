export type Channel = 'master' | 'r' | 'g' | 'b' | 'a';

export interface LevelValues {
  black: number;
  white: number;
  gamma: number;
}

export const defaultLevels: Record<Channel, LevelValues> = {
  master: { black: 0, white: 255, gamma: 1 },
  r: { black: 0, white: 255, gamma: 1 },
  g: { black: 0, white: 255, gamma: 1 },
  b: { black: 0, white: 255, gamma: 1 },
  a: { black: 0, white: 255, gamma: 1 },
};

export function makeLUT(black: number, gamma: number, white: number): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const minValue = Math.max(0, Math.min(255, black));
  const maxValue = Math.max(0, Math.min(255, white));
  const range = Math.max(1, maxValue - minValue);

  for (let i = 0; i < 256; i++) {
    if (i <= minValue) {
      lut[i] = 0;
    } else if (i >= maxValue) {
      lut[i] = 255;
    } else {
      const normalized = (i - minValue) / range;
      const corrected = Math.pow(normalized, 1 / gamma);
      lut[i] = Math.round(Math.max(0, Math.min(255, corrected * 255)));
    }
  }

  return lut;
}

export function applyLevels(imageData: ImageData, levels: Record<Channel, LevelValues>): ImageData {
  const out = new ImageData(imageData.width, imageData.height);
  applyLevelsInto(imageData, levels, out);
  return out;
}

// Writes result into an existing ImageData buffer — no allocation, no GC pressure.
export function applyLevelsInto(
  src: ImageData,
  levels: Record<Channel, LevelValues>,
  dst: ImageData,
): void {
  const lutR = makeLUT(levels.r.black, levels.r.gamma, levels.r.white);
  const lutG = makeLUT(levels.g.black, levels.g.gamma, levels.g.white);
  const lutB = makeLUT(levels.b.black, levels.b.gamma, levels.b.white);
  const lutA = makeLUT(levels.a.black, levels.a.gamma, levels.a.white);

  const s = src.data;
  const d = dst.data;

  for (let i = 0; i < s.length; i += 4) {
    d[i]     = lutR[s[i]];
    d[i + 1] = lutG[s[i + 1]];
    d[i + 2] = lutB[s[i + 2]];
    d[i + 3] = lutA[s[i + 3]];
  }
}

export function computeHistogram(imageData: ImageData, channel: Channel): number[] {
  const hist = new Array(256).fill(0);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    let value: number;
    if (channel === 'master') {
      value = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    } else if (channel === 'r') {
      value = r;
    } else if (channel === 'g') {
      value = g;
    } else if (channel === 'b') {
      value = b;
    } else {
      value = a;
    }

    hist[value]++;
  }

  return hist;
}

// Runs applyLevels in a Web Worker so the pixel loop doesn't block the main thread.
// Transfers the src buffer (zero-copy) — src.data becomes detached after the call.
export function applyLevelsInWorker(
  src: ImageData,
  levels: Record<Channel, LevelValues>,
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const code = `
      function makeLUT(black, gamma, white) {
        const lut = new Uint8ClampedArray(256);
        const lo = Math.max(0, Math.min(255, black));
        const hi = Math.max(0, Math.min(255, white));
        const range = Math.max(1, hi - lo);
        for (let i = 0; i < 256; i++) {
          if (i <= lo) lut[i] = 0;
          else if (i >= hi) lut[i] = 255;
          else lut[i] = Math.round(Math.max(0, Math.min(255, Math.pow((i - lo) / range, 1 / gamma) * 255)));
        }
        return lut;
      }
      self.onmessage = ({ data: { src, w, h, levels } }) => {
        try {
          const s = new Uint8ClampedArray(src);
          const d = new Uint8ClampedArray(s.length);
          const lutR = makeLUT(levels.r.black, levels.r.gamma, levels.r.white);
          const lutG = makeLUT(levels.g.black, levels.g.gamma, levels.g.white);
          const lutB = makeLUT(levels.b.black, levels.b.gamma, levels.b.white);
          const lutA = makeLUT(levels.a.black, levels.a.gamma, levels.a.white);
          for (let i = 0; i < s.length; i += 4) {
            d[i]     = lutR[s[i]];
            d[i + 1] = lutG[s[i + 1]];
            d[i + 2] = lutB[s[i + 2]];
            d[i + 3] = lutA[s[i + 3]];
          }
          self.postMessage({ ok: true, buf: d.buffer, w, h }, [d.buffer]);
        } catch (e) {
          self.postMessage({ ok: false, error: String(e) });
        }
      };
    `;
    const url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    const worker = new Worker(url);

    worker.onmessage = ({ data }) => {
      URL.revokeObjectURL(url);
      worker.terminate();
      if (data.ok) {
        resolve(new ImageData(new Uint8ClampedArray(data.buf), data.w, data.h));
      } else {
        reject(new Error(data.error));
      }
    };
    worker.onerror = (err) => {
      URL.revokeObjectURL(url);
      worker.terminate();
      reject(new Error(String(err)));
    };

    // Transfer a copy so the caller's imageData remains usable (histogram, etc.)
    const copy = src.data.slice().buffer;
    worker.postMessage({ src: copy, w: src.width, h: src.height, levels }, [copy]);
  });
}

export function drawHistogram(canvas: HTMLCanvasElement, histogram: number[], isLog: boolean): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const maxValue = Math.max(...histogram);
  const scale = canvas.height / (isLog ? Math.log(maxValue + 1) : maxValue);

  ctx.fillStyle = '#888888';
  for (let i = 0; i < 256; i++) {
    const height = isLog ? Math.log(histogram[i] + 1) * scale : histogram[i] * scale;
    ctx.fillRect(i, canvas.height - height, 1, height);
  }
}
