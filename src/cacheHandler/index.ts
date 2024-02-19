import cookieParser from 'cookie'
import parser from 'ua-parser-js'
import type { CacheHandlerContext } from 'next/dist/server/lib/incremental-cache'
import { CacheStrategy } from '../cacheStrategy/base'

export type { CacheHandlerContext }

export class CacheHandler implements CacheStrategy {
  static cacheCookies: string[] = []

  static cacheQueries: string[] = []

  static enableDeviceSplit = false

  static cache: CacheStrategy

  nextOptions: CacheHandlerContext

  cookieCacheKey: string

  queryCacheKey: string

  device?: string

  serverAppPath: string

  constructor(nextOptions: CacheHandlerContext) {
    this.nextOptions = nextOptions
    this.cookieCacheKey = this.buildCookiesCacheKey()
    this.queryCacheKey = this.buildQueryCacheKey()
    this.serverAppPath = nextOptions.serverDistDir || ''
    if (CacheHandler.enableDeviceSplit) {
      this.device = this.getCurrentDeviceType()
    }
  }

  buildCacheKey(keys: string[], data: Record<string, string>, prefix: string) {
    if (!keys.length) return ''

    const cacheKey = keys.reduce((prev, curr) => {
      if (!data[curr]) {
        return prev
      }
      return `${prev ? '-' : ''}${curr}=${data[curr]}`
    }, '')

    if (!cacheKey) return ''

    return `${prefix}(${cacheKey})`
  }

  buildCookiesCacheKey() {
    const parsedCookies = cookieParser.parse((this.nextOptions._requestHeaders.cookie as string) || '')
    return this.buildCacheKey(CacheHandler.cacheCookies, parsedCookies, 'cookie')
  }

  buildQueryCacheKey() {
    try {
      const currentQueryString = this.nextOptions._requestHeaders?.['x-invoke-query']
      if (!currentQueryString) return ''

      const parsedQuery = JSON.parse(decodeURIComponent(currentQueryString as string))

      return this.buildCacheKey(CacheHandler.cacheQueries, parsedQuery, 'query')
    } catch (_e) {
      console.warn('Could not parse request query.')
      return ''
    }
  }

  getCurrentDeviceType() {
    return parser(this.nextOptions._requestHeaders['user-agent'] as string)?.device?.type ?? ''
  }

  getPageCacheKey(key: string) {
    return [key, this.device, this.cookieCacheKey, this.queryCacheKey].filter(Boolean).join('-')
  }

  async get(...params: Parameters<CacheStrategy['get']>) {
    const [key, ctx] = params
    return CacheHandler.cache.get(this.getPageCacheKey(key), { ...ctx, serverAppPath: this.serverAppPath })
  }

  async set(...params: Parameters<CacheStrategy['set']>) {
    const [cacheKey, data, ctx] = params
    return CacheHandler.cache.set(this.getPageCacheKey(cacheKey), data, { ...ctx, serverAppPath: this.serverAppPath })
  }

  // TODO: check re-validation
  //   async revalidateTag(tag: string) {
  //     cache.forEach((value, key) => {
  //       if (value.tag.includes(tag)) {
  //         cache.delete(key)
  //       }
  //     })
  //   }

  static addCookie(value: string) {
    this.cacheCookies = [...new Set([...CacheHandler.cacheCookies, value])]
    return this
  }

  static addQuery(value: string) {
    this.cacheQueries = [...new Set([...CacheHandler.cacheQueries, value])]

    return this
  }

  static addDeviceSplit() {
    CacheHandler.enableDeviceSplit = true

    return this
  }

  static addCacheStrategy(cache: CacheStrategy) {
    CacheHandler.cache = cache

    return this
  }
}
