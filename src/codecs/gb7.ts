const SIGNATURE = [0x47, 0x42, 0x37, 0x1d];
const HEADER_SIZE = 12;

export function decodeGB7(buffer: ArrayBuffer): ImageData {
  const bytes = new Uint8Array(buffer);

  if (bytes.length < HEADER_SIZE) {
    throw new Error('Файл слишком короткий для формата GB7');
  }

  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== SIGNATURE[i]) {
      throw new Error('Неверная сигнатура файла GB7');
    }
  }

  const version = bytes[4];
  if (version !== 0x01) {
    throw new Error(`Неподдерживаемая версия GB7: ${version}`);
  }

  const flag = bytes[5];
  const hasMask = (flag & 0x01) === 1;

  const width = (bytes[6] << 8) | bytes[7];
  const height = (bytes[8] << 8) | bytes[9];

  if (width === 0 || height === 0) {
    throw new Error('Нулевые размеры изображения');
  }

  if (bytes.length < HEADER_SIZE + width * height) {
    throw new Error('Файл усечён или повреждён');
  }

  const imageData = new ImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const byte = bytes[HEADER_SIZE + i];
    const gray7 = byte & 0x7f;
    const maskBit = (byte >> 7) & 0x01;

    const gray8 = Math.round((gray7 / 127) * 255);
    const alpha = hasMask ? (maskBit === 1 ? 255 : 0) : 255;

    const offset = i * 4;
    data[offset] = gray8;
    data[offset + 1] = gray8;
    data[offset + 2] = gray8;
    data[offset + 3] = alpha;
  }

  return imageData;
}
