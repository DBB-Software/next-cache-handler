import { RedisClientOptions } from 'redis'
import type { CacheEntry, CacheStrategy } from '@dbbs/next-cache-handler-common'
import { RedisString } from './RedisString'
import { RedisStack } from './RedisStack'
import { CHUNK_LIMIT } from './constants'
import { CacheContext } from '@dbbs/next-cache-handler-common'

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

  get(pageKey: string, cacheKey: string): Promise<CacheEntry | null> {
    return this.redisAdapter.get(pageKey, cacheKey)
  }

  set(pageKey: string, cacheKey: string, data: CacheEntry): Promise<void> {
    return this.redisAdapter.set(pageKey, cacheKey, data)
  }

  async revalidateTag(tag: string, _ctx: CacheContext | undefined, allowCacheKeys: string[]): Promise<void> {
    const keysToDelete = await this.redisAdapter.findByTag(tag)
    await this.redisAdapter.client.unlink(
      allowCacheKeys.length
        ? keysToDelete.filter((key) => allowCacheKeys.some((allowKey) => key.endsWith(allowKey)))
        : keysToDelete
    )
  }

  async delete(pageKey: string, cacheKey: string): Promise<void> {
    await this.redisAdapter.client.unlink(`${pageKey}//${cacheKey}`)
  }

  async deleteAllByKeyMatch(key: string, _ctx: CacheContext | undefined, allowCacheKeys: string[]): Promise<void> {
    const keysToDelete: string[] = []
    let cursor = 0
    do {
      const result = await this.redisAdapter.client.scan(cursor, { MATCH: `${key}//*`, COUNT: CHUNK_LIMIT })
      cursor = result.cursor

      if (allowCacheKeys.length) {
        keysToDelete.push(...result.keys.filter((key) => allowCacheKeys.some((allowKey) => key.endsWith(allowKey))))
      } else {
        keysToDelete.push(...result.keys)
      }
    } while (cursor != 0)
    await this.redisAdapter.client.unlink(keysToDelete)
    return
  }
}
