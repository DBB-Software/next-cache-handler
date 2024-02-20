import { createClient, RedisClientType, RedisClientOptions } from 'redis'
import { CacheStrategy } from './base'

export class RedisCache implements CacheStrategy {
  client: RedisClientType<any, any, any>

  constructor(options: RedisClientOptions) {
    this.client = createClient(options)
    // TODO: inject custom logger
    this.client.on('error', (err) => console.error('Failed to connect redis client', err)).connect()
  }

  async get(cacheKey: string) {
    try {
      const pageData = await this.client.get(cacheKey)
      if (!pageData) return null
      return JSON.parse(pageData)
    } catch (err) {
      console.warn(`Failed to get page data from redis for ${cacheKey}`, err)
      return null
    }
  }

  async set(...params: Parameters<CacheStrategy['set']>) {
    const [cacheKey, data, ctx] = params
    try {
      if (data) {
        await this.client.set(
          cacheKey,
          JSON.stringify({
            value: data,
            lastModified: Date.now(),
            tags: ctx.tags
          })
        )
      } else {
        try {
          await this.client.del(cacheKey)
        } catch (err) {
          console.warn(`Failed to delete page data from redis for ${cacheKey}`, err)
        }
      }
    } catch (err) {
      console.warn(`Failed to set page data to redis for ${cacheKey}`, err)
    }
  }
}
