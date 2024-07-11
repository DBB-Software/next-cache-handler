interface RedisJSONArray extends Array<RedisJSON> {}
interface RedisJSONObject {
  [key: string]: RedisJSON
}
export type RedisJSON = string | number | boolean | null | RedisJSONArray | RedisJSONObject
export const CHUNK_LIMIT = 100
