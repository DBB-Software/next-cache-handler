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
  isAppRouter?: boolean
}

export interface CacheStrategy {
  get(pageKey: string, cacheKey: string, ctx: CacheContext): Promise<CacheEntry | null>
  set(pageKey: string, cacheKey: string, data: CacheEntry, ctx: CacheContext): Promise<void>
  delete(pageKey: string, cacheKey: string, ctx: CacheContext): Promise<void>
  revalidateTag(tag: string, allowCacheKeys: string[], ctx: CacheContext): Promise<void>
  deleteAllByKeyMatch(pageKey: string, allowCacheKeys: string[], ctx: CacheContext): Promise<void>
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

  get(pageKey: string, ctx: CacheHandlerContext): Promise<CacheEntry | null>
  set(pageKey: string, data: IncrementalCacheValue | null, ctx: CacheHandlerContext): Promise<void>
  revalidateTag(tag: string): Promise<void>
}
