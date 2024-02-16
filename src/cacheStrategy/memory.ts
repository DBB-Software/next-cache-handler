import { CacheStrategy } from './base'

const cache = new Map()

export class MemoryCache implements CacheStrategy {
    constructor () {}

    get(cacheKey: string) {
        return cache.get(cacheKey)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set(...params: Parameters<CacheStrategy['set']>): Promise<any> {
      const [key, data, ctx] = params  
      cache.set(key, {
        value: data,
        lastModified: Date.now(),
        tags: ctx.tags
      })
      return Promise.resolve(true)
    }
}
