import { createClient, RedisClientType, RedisClientOptions } from 'redis'
import type { CacheContext, CacheEntry, CacheStrategy } from '../types'

export class RedisCache implements CacheStrategy {
  client: RedisClientType<any, any, any>

  constructor(options: RedisClientOptions) {
    this.client = createClient(options)
    this.client.connect()
  }

  async get(key: string): Promise<CacheEntry | null> {
    const pageData = await this.client.get(key)
    if (!pageData) return null
    return JSON.parse(pageData)
  }

  async set(key: string, data: CacheEntry): Promise<void> {
    await this.client.set(key, JSON.stringify(data))
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key)
  }

  async deleteAllByKeyMatch(key: string, ctx: CacheContext): Promise<void> {}
}
