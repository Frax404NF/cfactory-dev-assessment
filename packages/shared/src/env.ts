import { z } from 'zod'

export const envSchema = z.object({
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('image-processor'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  S3_PRESIGN_TTL: z.coerce.number().default(3600),
  MAX_FILE_SIZE: z.coerce.number().default(20_971_520),
  API_PORT: z.coerce.number().default(3000),
})

export type Env = z.infer<typeof envSchema>
