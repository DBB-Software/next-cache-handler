import { createClient, RedisClientType, RedisClientOptions } from 'redis'
import type { CacheEntry } from '@dbbs/next-cache-handler-core'
import { checkHeaderTags } from '@dbbs/next-cache-handler-common'
import { RedisAdapter } from './types'
import { CHUNK_LIMIT } from './constants'

export class RedisString implements RedisAdapter {
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

  async findCacheKeys(tag: string, cacheKeys: string[]): Promise<string[]> {
    const keysToDelete: string[] = []
    const cacheKeysToScan = cacheKeys.length ? cacheKeys : ['']
    for (const cacheKey of cacheKeysToScan) {
      let cursor = 0
      do {
        const { cursor: currentCursor, keys } = await this.client.scan(cursor, {
          MATCH: `*${cacheKey}`,
          COUNT: CHUNK_LIMIT
        })
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
    }
    return keysToDelete
  }
}
