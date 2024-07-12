import { CacheContext, CacheStrategy } from '@dbbs/next-cache-handler-common'

interface RedisJSONArray extends Array<RedisJSON> {}

interface RedisJSONObject {
  [key: string]: RedisJSON
}

export type RedisJSON = string | number | boolean | null | RedisJSONArray | RedisJSONObject

export interface RedisAdapter
  extends Omit<CacheStrategy, 'deleteAllByKeyMatch' | 'deleteObjects' | 'delete' | 'revalidateTag'> {
  findByTag(tag: string, ctx: CacheContext): Promise<string[]>
}
