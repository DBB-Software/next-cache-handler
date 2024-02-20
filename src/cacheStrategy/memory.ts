import { type CacheStrategy } from './base'
import { ConsoleLogger, type BaseLogger } from '../logger'

const mapCache = new Map()

export class MemoryCache implements CacheStrategy {
  logger: BaseLogger

  constructor(logger?: BaseLogger) {
    this.logger = logger || new ConsoleLogger()
  }

  get(cacheKey: string) {
    return mapCache.get(cacheKey) ?? null
  }

  async set(...params: Parameters<CacheStrategy['set']>) {
    const [cacheKey, data, ctx] = params
    if (data) {
      mapCache.set(cacheKey, {
        value: data,
        lastModified: Date.now(),
        tags: ctx.tags
      })
    } else {
      mapCache.delete(cacheKey)
    }
  }
}
