import { RedisClientOptions } from 'redis'
import type { CacheEntry, CacheStrategy } from '@dbbs/next-cache-handler-common'
import { RedisString } from './RedisString'
import { RedisStack } from './RedisStack'

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

  async deleteObjects(keysToDelete: string[]) {
    await this.redisClient.deleteObjects(keysToDelete)
  }
  async get(pageKey: string, cacheKey: string): Promise<CacheEntry | null> {
    return this.redisClient.get(pageKey, cacheKey)
  }

  async set(pageKey: string, cacheKey: string, data: CacheEntry): Promise<void> {
    return this.redisClient.set(pageKey, cacheKey, data)
  }

  async revalidateTag(tag: string): Promise<void> {
    return this.redisClient.revalidateTag(tag)
  }

  async delete(pageKey: string, cacheKey: string): Promise<void> {
    return this.redisClient.delete(pageKey, cacheKey)
  }

  async deleteAllByKeyMatch(key: string): Promise<void> {
    return this.redisClient.deleteAllByKeyMatch(key)
  }
}
