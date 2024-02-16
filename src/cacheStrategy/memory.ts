import { CacheStrategy } from './base'

const cache = new Map()

export class MemoryCache implements CacheStrategy {
  constructor() {}

  get(cacheKey: string) {
    return cache.get(cacheKey) ?? null
  }

  async set(...params: Parameters<CacheStrategy['set']>) {
    const [cacheKey, data, ctx] = params
    if (data) {
      cache.set(cacheKey, {
        value: data,
        lastModified: Date.now(),
        tags: ctx.tags
      })
    } else {
      cache.delete(cacheKey)
    }
  }
}
