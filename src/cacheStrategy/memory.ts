import type { CacheEntry, CacheStrategy } from '../types'

const mapCache = new Map()

export class MemoryCache implements CacheStrategy {
  get(cacheKey: string) {
    return mapCache.get(cacheKey) ?? null
  }

  async set(key: string, data: CacheEntry) {
    mapCache.set(key, data)
  }

  async delete(key: string) {
    mapCache.delete(key)
  }

  async deleteAllByKeyMatch(key: string) {
    const allKeys = mapCache.keys()

    for (const cacheKey in allKeys) {
      if (cacheKey.startsWith(key)) {
        mapCache.delete(cacheKey)
      }
    }
  }
}
