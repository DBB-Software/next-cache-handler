import { CacheStrategy } from '@dbbs/next-cache-handler-common'

interface RedisJSONArray extends Array<RedisJSON> {}

interface RedisJSONObject {
  [key: string]: RedisJSON
}

export type RedisJSON = string | number | boolean | null | RedisJSONArray | RedisJSONObject

export interface RedisAdapter extends Pick<CacheStrategy, 'set' | 'get'> {
  findCacheKeys(tag: string, cacheKeys: string[]): Promise<string[]>
}
