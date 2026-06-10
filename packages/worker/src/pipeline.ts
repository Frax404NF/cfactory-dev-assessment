import sharp from 'sharp'

export async function processImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize({
      width: 1280,
      height: 1280,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer()
}
