import type { ConverterInterface } from './ConverterInterface';

export const webpConverter: ConverterInterface = {
  async decode(data: Uint8Array): Promise<ImageData> {
    const { default: sharp } = await import('sharp');

    return sharp(data)
      .ensureAlpha()
      .raw()
      .toBuffer({
        resolveWithObject: true,
      })
      .then(({ data, info }) => {
        return {
          colorSpace: 'srgb',
          data: new Uint8ClampedArray(data),
          height: info.height,
          width: info.width,
        };
      });
  },
  async encode(data: ImageData): Promise<Uint8Array> {
    const { default: sharp } = await import('sharp');

    return sharp(data.data, {
      raw: {
        channels: 4,
        height: data.height,
        width: data.width,
      },
    })
      .webp({ effort: 9, quality: 80 })
      .toBuffer();
  },
};
