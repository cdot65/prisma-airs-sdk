import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { syntheticPng, syntheticWav } from '../../scripts/e2e/runtime-media-fixtures.js';

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

describe('synthetic provider media fixtures', () => {
  it('uses valid PNG chunk checksums and an actual one-pixel scanline', async () => {
    const image = syntheticPng();
    expect(image.type).toBe('image/png');
    const bytes = Buffer.from(await image.arrayBuffer());
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const names = [];
    let offset = 8;
    while (offset < bytes.length) {
      const size = bytes.readUInt32BE(offset);
      const name = bytes.toString('ascii', offset + 4, offset + 8);
      names.push(name);
      expect(crc32(bytes.subarray(offset + 4, offset + 8 + size)), name).toBe(
        bytes.readUInt32BE(offset + 8 + size),
      );
      if (name === 'IHDR') {
        expect(bytes.readUInt32BE(offset + 8)).toBe(1);
        expect(bytes.readUInt32BE(offset + 12)).toBe(1);
      }
      if (name === 'IDAT')
        expect(inflateSync(bytes.subarray(offset + 8, offset + 8 + size))).toEqual(
          Buffer.from([1, 255, 255]),
        );
      offset += size + 12;
    }
    expect(offset).toBe(bytes.length);
    expect(names).toEqual(['IHDR', 'IDAT', 'IEND']);
  });
  it('uses a valid bounded PCM WAV header and silent samples', async () => {
    const audio = syntheticWav();
    expect(audio.type).toBe('audio/wav');
    const bytes = Buffer.from(await audio.arrayBuffer());
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.readUInt32LE(4)).toBe(bytes.length - 8);
    expect(bytes.toString('ascii', 8, 12)).toBe('WAVE');
    expect(bytes.toString('ascii', 12, 16)).toBe('fmt ');
    expect(bytes.readUInt32LE(16)).toBe(16);
    expect(bytes.readUInt16LE(20)).toBe(1);
    expect(bytes.readUInt16LE(22)).toBe(1);
    expect(bytes.readUInt32LE(24)).toBe(8000);
    expect(bytes.readUInt32LE(28)).toBe(16000);
    expect(bytes.readUInt16LE(32)).toBe(2);
    expect(bytes.readUInt16LE(34)).toBe(16);
    expect(bytes.toString('ascii', 36, 40)).toBe('data');
    expect(bytes.readUInt32LE(40)).toBe(bytes.length - 44);
    expect(bytes.subarray(44).every((byte) => byte === 0)).toBe(true);
    expect((bytes.length - 44) / 16000).toBe(0.1);
  });
});
