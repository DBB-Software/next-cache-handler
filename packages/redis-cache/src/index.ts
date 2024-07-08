import { createClient, RedisClientType, RedisClientOptions } from 'redis'
import type { CacheEntry, CacheStrategy } from '@dbbs/next-cache-handler-common'
import { checkHeaderTags, chunkArray } from '@dbbs/next-cache-handler-common'

const CHUNK_LIMIT = 100

export class RedisCache implements CacheStrategy {
  client: RedisClientType<any, any, any>

  constructor(options: RedisClientOptions) {
    this.client = createClient(options)
    this.client.connect()
  }

  async deleteObjects(keysToDelete: string[]) {
    await Promise.allSettled(chunkArray(keysToDelete, CHUNK_LIMIT).map((chunk) => this.client.del(chunk)))
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
    const keysToDelete: string[] = []
    let cursor = 0
    do {
      const { cursor: currentCursor, keys } = await this.client.scan(cursor, { MATCH: '*', COUNT: CHUNK_LIMIT })
      cursor = currentCursor

      keysToDelete.push(
        ...(await [...keys].reduce<Promise<string[]>>(async (acc, key) => {
          const data = await this.client.get(key)
          if (!data) return acc

          const pageData: CacheEntry | null = JSON.parse(data)
          if (pageData?.tags?.includes(tag) || checkHeaderTags(pageData?.value || null, tag)) {
            return [...(await acc), key]
          }
          return acc
        }, Promise.resolve([])))
      )
    } while (cursor)
    await this.deleteObjects(keysToDelete)
    return
  }

  async delete(pageKey: string, cacheKey: string): Promise<void> {
    await this.client.del(`${pageKey}//${cacheKey}`)
  }

  async deleteAllByKeyMatch(key: string): Promise<void> {
    const keysToDelete: string[] = []
    let cursor = 0
    do {
      const result = await this.client.scan(cursor, { MATCH: `${key}//*`, COUNT: CHUNK_LIMIT })
      cursor = result.cursor
      keysToDelete.push(...result.keys)
    } while (cursor != 0)
    await this.deleteObjects(keysToDelete)
    return
  }
}
