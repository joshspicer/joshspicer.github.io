import { readFileSync } from 'node:fs';

const cache = new Map();

const readPng = (buffer) => {
  if (buffer.length < 24) return undefined;
  if (buffer.readUInt32BE(0) !== 0x89504e47) return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

const readGif = (buffer) => {
  if (buffer.length < 10) return undefined;
  if (buffer.toString('ascii', 0, 3) !== 'GIF') return undefined;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
};

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

const EXIF_ORIENTATION_TAG = 0x0112;

/** Reads the EXIF orientation out of an APP1 segment, if it declares one. */
const readExifOrientation = (buffer, start, length) => {
  if (buffer.toString('ascii', start, start + 6) !== 'Exif\0\0') return undefined;

  const tiff = start + 6;
  const byteOrder = buffer.toString('ascii', tiff, tiff + 2);
  const littleEndian = byteOrder === 'II';
  if (!littleEndian && byteOrder !== 'MM') return undefined;

  const readShort = (at) =>
    littleEndian ? buffer.readUInt16LE(at) : buffer.readUInt16BE(at);
  const readLong = (at) =>
    littleEndian ? buffer.readUInt32LE(at) : buffer.readUInt32BE(at);

  const directory = tiff + readLong(tiff + 4);
  const end = start + length;
  if (directory + 2 > end) return undefined;

  const entries = readShort(directory);
  for (let index = 0; index < entries; index += 1) {
    const entry = directory + 2 + index * 12;
    if (entry + 12 > end) break;
    if (readShort(entry) === EXIF_ORIENTATION_TAG) return readShort(entry + 8);
  }

  return undefined;
};

const readJpeg = (buffer) => {
  if (buffer.length < 4 || buffer.readUInt16BE(0) !== 0xffd8) return undefined;

  let offset = 2;
  let orientation;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (SOF_MARKERS.has(marker)) {
      const width = buffer.readUInt16BE(offset + 7);
      const height = buffer.readUInt16BE(offset + 5);
      // Orientations 5-8 rotate by a quarter turn, so the rendered size is
      // transposed relative to the stored size.
      return orientation && orientation >= 5 && orientation <= 8
        ? { width: height, height: width }
        : { width, height };
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) return undefined;
    if (marker === 0xe1) {
      orientation ??= readExifOrientation(buffer, offset + 4, segmentLength - 2);
    }
    offset += 2 + segmentLength;
  }

  return undefined;
};

const readWebp = (buffer) => {
  if (buffer.length < 30) return undefined;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return undefined;
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') return undefined;

  const format = buffer.toString('ascii', 12, 16);
  if (format === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (format === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }
  if (format === 'VP8X') {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }

  return undefined;
};

const readSvg = (buffer) => {
  const markup = buffer.toString('utf8', 0, 2048);
  const viewBox =
    /viewBox\s*=\s*["']\s*[\d.+-]+[,\s]+[\d.+-]+[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(
      markup,
    );
  if (viewBox) {
    return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  }

  const width = /\bwidth\s*=\s*["']([\d.]+)/i.exec(markup);
  const height = /\bheight\s*=\s*["']([\d.]+)/i.exec(markup);
  if (width && height) {
    return { width: Number(width[1]), height: Number(height[1]) };
  }

  return undefined;
};

const readers = [readPng, readGif, readJpeg, readWebp, readSvg];

/**
 * Reads the intrinsic pixel size of an image without pulling in a dependency.
 * Supported formats cover everything the site ships: PNG, JPEG, GIF, WebP, SVG.
 */
export function getImageSize(filePath) {
  if (cache.has(filePath)) {
    return cache.get(filePath);
  }

  let size;
  try {
    const buffer = readFileSync(filePath);
    for (const reader of readers) {
      const result = reader(buffer);
      if (result?.width && result?.height) {
        size = { width: Math.round(result.width), height: Math.round(result.height) };
        break;
      }
    }
  } catch {
    size = undefined;
  }

  cache.set(filePath, size);
  return size;
}
