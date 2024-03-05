import type { CacheEntry, CacheStrategy } from '../types'

const mapCache = new Map()

export interface MemoryCacheConstructorProps {
  sizeLimit?: number
}

export class MemoryCache implements CacheStrategy {
  #sizeLimit = 512
  #totalSize = 0

  constructor(props?: MemoryCacheConstructorProps) {
    if (props?.sizeLimit) {
      this.#sizeLimit = props.sizeLimit
    }
  }

  #getItemSizeInMB(data: CacheEntry) {
    return Buffer.byteLength(JSON.stringify(data)) / 1024 / 1024
  }

  #setAndValidateTotalSize(data: CacheEntry) {
    const currentEntrySize = this.#getItemSizeInMB(data)
    const finalSize = currentEntrySize + this.#totalSize
    const shouldClearCache = finalSize > this.#sizeLimit

    if (shouldClearCache) {
      mapCache.clear()
    }

    this.#totalSize = shouldClearCache ? currentEntrySize : finalSize
  }

  get(cacheKey: string) {
    const data = mapCache.get(cacheKey)
    return data ? JSON.parse(data) : null
  }

  async set(key: string, data: CacheEntry) {
    this.#setAndValidateTotalSize(data)
    mapCache.set(key, JSON.stringify(data))
  }

  async delete(key: string) {
    const currentItemSize = this.#getItemSizeInMB(mapCache.get(key))
    this.#totalSize = this.#totalSize - currentItemSize

    mapCache.delete(key)
  }

  async deleteAllByKeyMatch(key: string) {
    const allKeys = [...mapCache.keys()]

    allKeys.forEach((cacheKey) => {
      if (cacheKey.startsWith(key)) {
        this.delete(cacheKey)
      }
    })
  }
}
