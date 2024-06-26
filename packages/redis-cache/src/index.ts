import { NEXT_CACHE_IMPLICIT_TAG_ID, NEXT_CACHE_TAGS_HEADER } from 'next/dist/lib/constants'
import { createClient, RedisClientType, RedisClientOptions } from 'redis'
import type { CacheEntry, CacheStrategy } from '@dbbs/next-cache-handler-common'

export class RedisCache implements CacheStrategy {
  client: RedisClientType<any, any, any>

  constructor(options: RedisClientOptions) {
    this.client = createClient(options)
    this.client.connect()
  }

  async get(pageKey: string, cacheKey: string): Promise<CacheEntry | null> {
    const pageData = await this.client.get(`${pageKey}//${cacheKey}`)
    if (!pageData) return null
    return JSON.parse(pageData)
  }

  async set(pageKey: string, cacheKey: string, data: CacheEntry): Promise<void> {
    await this.client.set(`${pageKey}//${cacheKey}`, JSON.stringify(data), {
      ...(data.revalidate ? { EX: Number(data.revalidate) } : undefined)
    })
  }

  async revalidateTag(tag: string): Promise<void> {
    // Revalidate by Path
    if (tag.startsWith(NEXT_CACHE_IMPLICIT_TAG_ID)) {
      await this.deleteAllByKeyMatch(tag.slice(NEXT_CACHE_IMPLICIT_TAG_ID.length))
      return
    }

    // Revalidate by Tag
    let cursor = 0
    do {
      const { cursor: currentCursor, keys } = await this.client.scan(0, { MATCH: '*', COUNT: 100 })
      cursor = currentCursor
      for (const cacheKey of keys) {
        const data = await this.client.get(cacheKey)
        if (!data) continue

        const pageData: CacheEntry | null = JSON.parse(data)
        if (
          pageData?.tags?.includes(tag) ||
          (pageData?.value?.kind === 'PAGE' &&
            pageData.value?.headers?.[NEXT_CACHE_TAGS_HEADER]?.toString()?.split(',').includes(tag))
        ) {
          await this.client.del(cacheKey)
        }
      }
    } while (cursor)
    return
  }

  async delete(pageKey: string, cacheKey: string): Promise<void> {
    await this.client.del(`${pageKey}//${cacheKey}`)
  }

  async deleteAllByKeyMatch(key: string): Promise<void> {
    let cursor = 0
    do {
      const result = await this.client.scan(0, { MATCH: `${key}//*`, COUNT: 100 })
      cursor = result.cursor
      for await (const cacheKey of result.keys) {
        await this.client.del(cacheKey)
      }
    } while (cursor != 0)
  }
}
