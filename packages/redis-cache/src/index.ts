import { createClient, RedisClientType, RedisClientOptions } from 'redis'
import type { CacheEntry, CacheStrategy } from '@dbbs/next-cache-handler-common'
import { NEXT_CACHE_IMPLICIT_TAG_ID } from 'next/dist/lib/constants'

export class RedisCache implements CacheStrategy {
  client: RedisClientType<any, any, any>

  constructor(options: RedisClientOptions) {
    this.client = createClient(options)
    this.client.connect()
  }

  async get(_pageKey: string, cacheKey: string): Promise<CacheEntry | null> {
    const pageData = await this.client.get(cacheKey)
    if (!pageData) return null
    return JSON.parse(pageData)
  }

  async set(_pageKey: string, cacheKey: string, data: CacheEntry): Promise<void> {
    await this.client.set(cacheKey, JSON.stringify(data), {
      ...(data.revalidate ? { EX: Number(data.revalidate) } : undefined)
    })
  }

  async revalidateTag(tag: string): Promise<void> {
    const allKeys = await this.client.keys('*')

    for (const cacheKey of allKeys) {
      if (tag.startsWith(NEXT_CACHE_IMPLICIT_TAG_ID) && tag === `${NEXT_CACHE_IMPLICIT_TAG_ID}${cacheKey}`) {
        await this.delete('', cacheKey)
        return
      }

      const pageData: CacheEntry | null = await this.get('', cacheKey)
      if (pageData?.tags?.includes(tag)) {
        await this.delete('', cacheKey)
      }
    }
    return
  }

  async delete(_pageKey: string, cacheKey: string): Promise<void> {
    await this.client.del(cacheKey)
  }

  async deleteAllByKeyMatch(key: string): Promise<void> {
    const allKeys = this.client.scanIterator({ MATCH: key })

    for await (const cacheKey of allKeys) {
      this.client.del(cacheKey)
    }
  }
}
