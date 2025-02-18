import type { IncrementalCacheKindHint } from 'next/dist/server/response-cache'
import type { OutgoingHttpHeaders } from 'http'
import type { CacheHandlerContext as NextCacheHandlerContext } from 'next/dist/server/lib/incremental-cache'
import type { BaseLogger } from '../logger'

export { NextCacheHandlerContext, IncrementalCacheKindHint }

export type AnyObject = Record<string, any>

export const enum CachedRouteKind {
  APP_PAGE = 'APP_PAGE',
  APP_ROUTE = 'APP_ROUTE',
  ROUTE = 'ROUTE',
  PAGES = 'PAGES',
  PAGE = 'PAGE',
  FETCH = 'FETCH',
  REDIRECT = 'REDIRECT',
  IMAGE = 'IMAGE'
}

export type CachedFetchData = {
  headers: Record<string, string>
  body: string
  url: string
  status?: number
}

export interface CachedFetchValue {
  kind: CachedRouteKind.FETCH
  data: CachedFetchData
  tags?: string[]
  revalidate: number
}
export interface CachedRedirectValue {
  kind: CachedRouteKind.REDIRECT
  props: AnyObject
}

export interface IncrementalCachedAppPageValue {
  kind: CachedRouteKind.APP_PAGE
  html: string
  rscData: Buffer | undefined
  headers: OutgoingHttpHeaders | undefined
  postponed: string | undefined
  status: number | undefined
  segmentData: Map<string, Buffer> | undefined
}
export interface IncrementalCachedPageValue {
  kind: CachedRouteKind.PAGES | CachedRouteKind.PAGE
  html: string
  pageData: AnyObject
  headers: OutgoingHttpHeaders | undefined
  status: number | undefined
}

export interface CachedRouteValue {
  kind: CachedRouteKind.APP_ROUTE | CachedRouteKind.ROUTE
  body: Buffer
  status: number
  headers: OutgoingHttpHeaders
}
export interface CachedImageValue {
  kind: CachedRouteKind.IMAGE
  etag: string
  upstreamEtag: string
  buffer: Buffer
  extension: string
  isMiss?: boolean
  isStale?: boolean
}

export type IncrementalCacheValue =
  | CachedRedirectValue
  | IncrementalCachedPageValue
  | IncrementalCachedAppPageValue
  | CachedImageValue
  | CachedFetchValue
  | CachedRouteValue

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
  deleteAllByKeyMatch(pageKey: string, cacheKey: string, ctx: CacheContext): Promise<void>
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

// Configuration interface
export interface CacheConfig {
  cacheCookies: string[]
  cacheQueries: string[]
  enableDeviceSplit: boolean
  noCacheMatchers: RegExp[]
  cache: CacheStrategy
  logger: BaseLogger
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
