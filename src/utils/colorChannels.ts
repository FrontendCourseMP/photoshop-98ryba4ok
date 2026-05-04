import type { ChannelId } from '../types';

export function getChannelIds(colorDepth: number): ChannelId[] {
  if (colorDepth <= 8) return ['gray'];
  if (colorDepth <= 16) return ['gray', 'alpha'];
  if (colorDepth <= 24) return ['red', 'green', 'blue'];
  return ['red', 'green', 'blue', 'alpha'];
}

export function extractChannelPreview(imageData: ImageData, channelId: ChannelId): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const d = out.data;

  for (let i = 0; i < data.length; i += 4) {
    if (channelId === 'composite') {
      d[i] = data[i];
      d[i + 1] = data[i + 1];
      d[i + 2] = data[i + 2];
      d[i + 3] = data[i + 3];
      continue;
    }
    let v: number;
    if (channelId === 'red') v = data[i];
    else if (channelId === 'green') v = data[i + 1];
    else if (channelId === 'blue') v = data[i + 2];
    else if (channelId === 'alpha') v = data[i + 3];
    else /* gray */ v = data[i];
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  return out;
}

// Returns masked ImageData, or null if all channels are active (no masking needed).
export function applyChannelMask(
  imageData: ImageData,
  activeChannels: ReadonlySet<ChannelId>,
  availableChannels: ChannelId[],
): ImageData | null {
  const allActive = availableChannels.every((ch) => activeChannels.has(ch));
  if (allActive) return null;

  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const d = out.data;

  const isGrayscale = availableChannels.includes('gray');
  const hasAlpha = availableChannels.includes('alpha');
  const onlyAlpha = activeChannels.size === 1 && activeChannels.has('alpha');

  const showGray = activeChannels.has('gray');
  const showR = activeChannels.has('red');
  const showG = activeChannels.has('green');
  const showB = activeChannels.has('blue');
  const showAlpha = activeChannels.has('alpha');

  for (let i = 0; i < data.length; i += 4) {
    if (onlyAlpha) {
      // Show alpha channel as grayscale mask
      const a = data[i + 3];
      d[i] = a;
      d[i + 1] = a;
      d[i + 2] = a;
      d[i + 3] = 255;
    } else if (isGrayscale) {
      const v = showGray ? data[i] : 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = hasAlpha ? (showAlpha ? data[i + 3] : 255) : 255;
    } else {
      d[i] = showR ? data[i] : 0;
      d[i + 1] = showG ? data[i + 1] : 0;
      d[i + 2] = showB ? data[i + 2] : 0;
      d[i + 3] = hasAlpha ? (showAlpha ? data[i + 3] : 255) : 255;
    }
  }
  return out;
}
