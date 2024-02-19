import { CacheStrategy } from './base'

export const mapCache = new Map()

export class MemoryCache implements CacheStrategy {
  constructor() {}

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
