import { createClient, RedisClientType, RedisClientOptions } from 'redis'
import { TAGS_REGEX, getTagsFromFileName } from '@dbbs/next-cache-handler-common'
import type { CacheEntry, CacheStrategy } from '@dbbs/next-cache-handler-common'

export class RedisCache implements CacheStrategy {
  client: RedisClientType<any, any, any>

  constructor(options: RedisClientOptions) {
    this.client = createClient(options)
    this.client.connect()
  }

  async get(pageKey: string, cacheKey: string): Promise<CacheEntry | null> {
    let cursor = 0
    do {
      const result = await this.client.scan(0, { MATCH: `${pageKey}//${cacheKey}*`, COUNT: 100 })
      cursor = result.cursor
      for await (const key of result.keys) {
        if (key.replace(TAGS_REGEX, '') === `${pageKey}//${cacheKey}`) {
          const pageData = await this.client.get(key)
          if (!pageData) return null
          return JSON.parse(pageData)
        }
      }
    } while (cursor != 0)
    return null
  }

  async set(pageKey: string, cacheKey: string, data: CacheEntry): Promise<void> {
    await this.client.set(`${pageKey}//${cacheKey}`, JSON.stringify(data), {
      ...(data.revalidate ? { EX: Number(data.revalidate) } : undefined)
    })
  }

  async revalidateTag(tag: string): Promise<void> {
    let cursor = 0
    do {
      const { cursor: currentCursor, keys } = await this.client.scan(0, { MATCH: '*', COUNT: 100 })
      cursor = currentCursor
      for (const cacheKey of keys) {
        if (getTagsFromFileName(cacheKey).includes(tag)) {
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
