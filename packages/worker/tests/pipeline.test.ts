import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { processImage } from '../src/pipeline.js'

async function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .jpeg()
    .toBuffer()
}

describe('processImage', () => {
  it('outputs WebP format', async () => {
    const input = await createTestImage(800, 600)
    const output = await processImage(input)
    const metadata = await sharp(output).metadata()
    expect(metadata.format).toBe('webp')
  })

  it('resizes a large image so the longest side is at most 1280px', async () => {
    const input = await createTestImage(2000, 1500)
    const output = await processImage(input)
    const metadata = await sharp(output).metadata()
    const longest = Math.max(metadata.width ?? 0, metadata.height ?? 0)
    expect(longest).toBeLessThanOrEqual(1280)
  })

  it('preserves aspect ratio when resizing', async () => {
    const input = await createTestImage(2000, 1000)
    const output = await processImage(input)
    const metadata = await sharp(output).metadata()
    expect(metadata.width).toBe(1280)
    expect(metadata.height).toBe(640)
  })

  it('does not upscale images smaller than 1280px', async () => {
    const input = await createTestImage(400, 300)
    const output = await processImage(input)
    const metadata = await sharp(output).metadata()
    expect(metadata.width).toBe(400)
    expect(metadata.height).toBe(300)
  })
})
