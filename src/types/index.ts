import type { IncrementalCacheKindHint, IncrementalCacheValue } from 'next/dist/server/response-cache'
import type { CacheHandlerContext as NextCacheHandlerContext } from 'next/dist/server/lib/incremental-cache'

export { NextCacheHandlerContext, IncrementalCacheValue, IncrementalCacheKindHint }

export type LoggerInputParams = Parameters<typeof console.log>

export interface BaseLogger {
  info(...params: LoggerInputParams): void
  error(...params: LoggerInputParams): void
}

export interface CacheEntry {
  value: IncrementalCacheValue | null
  lastModified: number // time when data was saved
  tags?: string[]
  revalidate?: number | false // time when data was saved + revalidate value, this is used to check of cache is stale or not.
}

export interface CacheContext {
  serverCacheDirPath: string
}

export interface CacheStrategy {
  get(key: string, ctx: CacheContext): Promise<CacheEntry | null>
  set(key: string, data: CacheEntry, ctx: CacheContext): Promise<void>
  delete(key: string, ctx: CacheContext): Promise<void>
  deleteAllByKeyMatch(key: string, ctx: CacheContext): Promise<void>
}

export interface CacheHandlerContext {
  kindHint?: IncrementalCacheKindHint
  revalidate?: number | false
  fetchUrl?: string
  fetchIdx?: number
  tags?: string[]
  softTags?: string[]
  serverCacheDirPath: string
}

export declare class CacheHandler {
  static logger: BaseLogger
  static cacheCookies: string[]
  static cacheQueries: string[]
  static cache: CacheStrategy

  nextOptions: NextCacheHandlerContext
  cookieCacheKey: string
  queryCacheKey: string
  device?: string
  serverCacheDirPath: string

  constructor(context: NextCacheHandlerContext)

  get(cacheKey: string, ctx: CacheHandlerContext): Promise<CacheEntry | null>
  set(cacheKey: string, data: IncrementalCacheValue | null, ctx: CacheHandlerContext): Promise<void>
}
