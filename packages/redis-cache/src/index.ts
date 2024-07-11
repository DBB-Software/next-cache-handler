import { RedisClientOptions } from 'redis'
import type { CacheEntry, CacheStrategy } from '@dbbs/next-cache-handler-common'
import { RedisString } from './RedisString'
import { RedisStack } from './RedisStack'
import { CHUNK_LIMIT } from './types'

export enum RedisStrategy {
  RedisStack,
  RedisString
}

export class RedisCache implements CacheStrategy {
  redisClient: RedisString | RedisStack
  constructor(options: RedisClientOptions, strategy: RedisStrategy = RedisStrategy.RedisString) {
    const client = strategy === RedisStrategy.RedisStack ? RedisStack : RedisString
    this.redisClient = new client(options)
  }

  deleteObjects(keysToDelete: string[]): Promise<void> {
    return this.redisClient.deleteObjects(keysToDelete)
  }
  get(pageKey: string, cacheKey: string): Promise<CacheEntry | null> {
    return this.redisClient.get(pageKey, cacheKey)
  }

  set(pageKey: string, cacheKey: string, data: CacheEntry): Promise<void> {
    return this.redisClient.set(pageKey, cacheKey, data)
  }

  revalidateTag(tag: string): Promise<void> {
    return this.redisClient.revalidateTag(tag)
  }

  delete(pageKey: string, cacheKey: string): Promise<void> {
    return this.redisClient.delete(pageKey, cacheKey)
  }

  async deleteAllByKeyMatch(key: string): Promise<void> {
    const keysToDelete: string[] = []
    let cursor = 0
    do {
      const result = await this.redisClient.client.scan(cursor, { MATCH: `${key}//*`, COUNT: CHUNK_LIMIT })
      cursor = result.cursor
      keysToDelete.push(...result.keys)
    } while (cursor != 0)
    return this.deleteObjects(keysToDelete)
  }
}
