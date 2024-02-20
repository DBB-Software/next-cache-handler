import { createClient, RedisClientType, RedisClientOptions } from 'redis'
import { type CacheStrategy } from './base'
import { ConsoleLogger, type BaseLogger } from '../logger'

export class RedisCache implements CacheStrategy {
  client: RedisClientType<any, any, any>
  logger: BaseLogger

  constructor(options: RedisClientOptions, logger?: BaseLogger) {
    this.logger = logger || new ConsoleLogger()
    this.client = createClient(options)
    this.client.on('error', (err) => this.logger.error('Failed to connect redis client', err)).connect()
  }

  async get(cacheKey: string) {
    try {
      const pageData = await this.client.get(cacheKey)
      if (!pageData) return null
      return JSON.parse(pageData)
    } catch (err) {
      this.logger.info(`Failed to get page data from redis for ${cacheKey}`, err)
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
          this.logger.info(`Failed to delete page data from redis for ${cacheKey}`, err)
        }
      }
    } catch (err) {
      this.logger.info(`Failed to set page data to redis for ${cacheKey}`, err)
    }
  }
}
