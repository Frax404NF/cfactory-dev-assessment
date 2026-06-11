import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Env, StorageService } from '@image-processor/shared'

function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/tiff': 'tiff',
  }
  return map[mime] ?? 'bin'
}

interface StorageConfig {
  endpoint: string
  publicEndpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
  presignTtl: number
}

class S3StorageService implements StorageService {
  private client: S3Client
  private presignClient: S3Client
  private bucket: string
  private presignTtl: number

  constructor(config: StorageConfig) {
    this.bucket = config.bucket
    this.presignTtl = config.presignTtl
    const credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    }
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials,
    })
    this.presignClient = new S3Client({
      endpoint: config.publicEndpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials,
    })
  }

  async putOriginal(id: string, bytes: Buffer, mime: string): Promise<string> {
    const ext = extensionFromMime(mime)
    const key = `originals/${id}.${ext}`

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: mime,
      }),
    )

    return key
  }

  async putProcessed(id: string, bytes: Buffer): Promise<string> {
    const key = `processed/${id}.webp`

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: 'image/webp',
      }),
    )

    return key
  }

  async getOriginal(ref: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: ref,
      }),
    )

    const stream = response.Body
    if (!stream) {
      throw new Error(`Empty response body for key: ${ref}`)
    }

    const chunks: Uint8Array[] = []
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }

  async getDownloadUrl(ref: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: ref,
    })

    return getSignedUrl(this.presignClient, command, { expiresIn: this.presignTtl })
  }
}

export function createStorageService(env: Env): StorageService {
  return new S3StorageService({
    endpoint: env.S3_ENDPOINT,
    publicEndpoint: env.S3_PUBLIC_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    presignTtl: env.S3_PRESIGN_TTL,
  })
}
