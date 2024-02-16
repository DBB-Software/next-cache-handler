import cookieParser from 'cookie'
import parser from 'ua-parser-js'
import type { CacheHandlerContext } from 'next/dist/server/lib/incremental-cache'
import { CacheStrategy } from '../cacheStrategy/base'

export class CacheHandler implements CacheStrategy {
  static cacheCookies: string[] = []

  static cacheQueries: string[] = []

  static enableDeviceSplit = false

  static cache: CacheStrategy

  nextOptions: CacheHandlerContext

  cookieCacheKey: string

  queryCacheKey: string

  device?: string

  constructor(nextOptions: CacheHandlerContext) {
    this.nextOptions = nextOptions
    this.cookieCacheKey = this.buildCookiesCacheKey()
    this.queryCacheKey = this.buildQueryCacheKey()
    if (CacheHandler.enableDeviceSplit) {
      this.device = this.getCurrentDeviceType()
    }
  }

  buildCookiesCacheKey() {
    const parsedCookies = cookieParser.parse((this.nextOptions._requestHeaders.cookie as string) || '')

    return CacheHandler.cacheCookies.reduce((prev, curr) => {
      if (!parsedCookies[curr]) {
        return prev
      }
      return `${prev}-${curr}=${parsedCookies[curr]}`
    }, '')
  }

  buildQueryCacheKey() {
    try {
      const parsedQuery = JSON.parse(encodeURIComponent(this.nextOptions._requestHeaders['x-invoke-query'] as string))

      return CacheHandler.cacheQueries.reduce((prev, curr) => {
        if (!parsedQuery[curr]) {
          return prev
        }
        return `${prev}-${curr}=${parsedQuery[curr]}`
      }, '')
    } catch (_e) {
      console.warn('Could not parse request query.')
      return ''
    }
  }

  getCurrentDeviceType() {
    return parser(this.nextOptions._requestHeaders['user-agent'] as string)?.device?.type ?? ''
  }

  buildCustomCacheKey(key: string) {
    return [key, this.device, this.cookieCacheKey, this.queryCacheKey].filter(Boolean).join('-')
  }

  async get(...params: Parameters<CacheStrategy['get']>) {
    const [key] = params
    return CacheHandler.cache.get(this.buildCustomCacheKey(key))
  }

  async set(...params: Parameters<CacheStrategy['set']>) {
    return CacheHandler.cache.set(...params)
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
