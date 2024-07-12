import { RedisClientOptions } from 'redis'
import type { CacheEntry, CacheStrategy } from '@dbbs/next-cache-handler-common'
import { chunkArray } from '@dbbs/next-cache-handler-common'
import { RedisString } from './RedisString'
import { RedisStack } from './RedisStack'
import { CHUNK_LIMIT } from './constants'

export enum RedisAdapter {
  RedisStack,
  RedisString
}

export class RedisCache implements CacheStrategy {
  redisAdapter: RedisString | RedisStack

  constructor(options: RedisClientOptions, strategy: RedisAdapter = RedisAdapter.RedisString) {
    const client = strategy === RedisAdapter.RedisStack ? RedisStack : RedisString
    this.redisAdapter = new client(options)
  }

  async deleteObjects(keysToDelete: string[]): Promise<void> {
    await Promise.allSettled(
      chunkArray(keysToDelete, CHUNK_LIMIT).map((chunk) => this.redisAdapter.client.unlink(chunk))
    )
  }

  get(pageKey: string, cacheKey: string): Promise<CacheEntry | null> {
    return this.redisAdapter.get(pageKey, cacheKey)
  }

  set(pageKey: string, cacheKey: string, data: CacheEntry): Promise<void> {
    return this.redisAdapter.set(pageKey, cacheKey, data)
  }

  async revalidateTag(tag: string): Promise<void> {
    return this.deleteObjects(await this.redisAdapter.findByTag(tag))
  }

  async delete(pageKey: string, cacheKey: string): Promise<void> {
    await this.redisAdapter.client.unlink(`${pageKey}//${cacheKey}`)
  }

  async deleteAllByKeyMatch(key: string): Promise<void> {
    const keysToDelete: string[] = []
    let cursor = 0
    do {
      const result = await this.redisAdapter.client.scan(cursor, { MATCH: `${key}//*`, COUNT: CHUNK_LIMIT })
      cursor = result.cursor
      keysToDelete.push(...result.keys)
    } while (cursor != 0)
    return this.deleteObjects(keysToDelete)
  }
}
