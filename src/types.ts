export interface ImageState {
  data: ImageData | null;
  width: number | null;
  height: number | null;
  colorDepth: number | null;
  fileName: string | null;
  format: 'png' | 'jpg' | 'gb7' | null;
}
