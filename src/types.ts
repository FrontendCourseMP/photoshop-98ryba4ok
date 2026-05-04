export interface ImageState {
  data: ImageData | null;
  width: number | null;
  height: number | null;
  colorDepth: number | null;
  fileName: string | null;
  format: 'png' | 'jpg' | 'gb7' | null;
}

export type ChannelId = 'composite' | 'red' | 'green' | 'blue' | 'alpha' | 'gray';

export interface PickedPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
  lab: { L: number; a: number; b: number };
}

export type ActiveTool = 'pointer' | 'eyedropper';
