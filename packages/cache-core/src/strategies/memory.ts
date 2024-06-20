import { NEXT_CACHE_IMPLICIT_TAG_ID } from 'next/dist/lib/constants'
import type { CacheEntry, CacheStrategy } from '@dbbs/next-cache-handler-common'

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

  get(_pageKey: string, cacheKey: string) {
    const data = mapCache.get(cacheKey)
    return data ? JSON.parse(data) : null
  }

  async set(_pageKey: string, cacheKey: string, data: CacheEntry) {
    this.#setAndValidateTotalSize(data)
    mapCache.set(cacheKey, JSON.stringify(data))
  }

  async revalidateTag(tag: string): Promise<void> {
    for (const cacheKey of [...mapCache.keys()]) {
      if (tag.startsWith(NEXT_CACHE_IMPLICIT_TAG_ID) && tag === `${NEXT_CACHE_IMPLICIT_TAG_ID}${cacheKey}`) {
        await this.delete('', cacheKey)
        return
      }

      const pageData: CacheEntry = JSON.parse(mapCache.get(cacheKey))
      if (pageData?.tags?.includes(tag)) {
        await this.delete('', cacheKey)
      }
    }
    return
  }

  async delete(_pageKey: string, cacheKey: string) {
    const currentItemSize = this.#getItemSizeInMB(mapCache.get(cacheKey))
    this.#totalSize = this.#totalSize - currentItemSize

    mapCache.delete(cacheKey)
  }

  async deleteAllByKeyMatch(pageKey: string) {
    const allKeys = [...mapCache.keys()]

    allKeys.forEach((cacheKey) => {
      if (cacheKey.startsWith(pageKey)) {
        this.delete(pageKey, cacheKey)
      }
    })
  }
}
