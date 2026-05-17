// Decodes ImageBitmap → ImageData in a Web Worker via OffscreenCanvas.
// Avoids blocking the main thread with synchronous GPU→CPU readback.
export function decodePixels(bitmap: ImageBitmap): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const code = `
      self.onmessage = ({ data: { bitmap } }) => {
        try {
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0);
          const w = bitmap.width, h = bitmap.height;
          const imageData = ctx.getImageData(0, 0, w, h);
          bitmap.close();
          self.postMessage({ ok: true, buffer: imageData.data.buffer, w, h }, [imageData.data.buffer]);
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
        resolve(new ImageData(new Uint8ClampedArray(data.buffer), data.w, data.h));
      } else {
        reject(new Error(data.error));
      }
    };

    worker.onerror = (err) => {
      URL.revokeObjectURL(url);
      worker.terminate();
      reject(new Error(String(err)));
    };

    // Clone bitmap before transferring — main thread keeps original for rendering
    createImageBitmap(bitmap).then(
      copy => worker.postMessage({ bitmap: copy }, [copy]),
      err => { URL.revokeObjectURL(url); worker.terminate(); reject(err); },
    );
  });
}
