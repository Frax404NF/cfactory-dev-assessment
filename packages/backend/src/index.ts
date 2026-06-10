import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { envSchema } from '@image-processor/shared'
import { createStorageService } from './storage.js'
import { createJobStore } from './job-store.js'
import { createJobQueue } from './queue.js'
import { createRoutes } from './routes.js'

const env = envSchema.parse(process.env)
const storage = createStorageService(env)
const jobStore = createJobStore(env.REDIS_URL)
const queue = createJobQueue(env.REDIS_URL)

const app = new Hono()
app.use(cors())
app.route('/', createRoutes(storage, jobStore, queue, env))

serve({ fetch: app.fetch, port: env.API_PORT }, (info: { port: number }) => {
  console.log(`API running on http://localhost:${info.port}`)
})
