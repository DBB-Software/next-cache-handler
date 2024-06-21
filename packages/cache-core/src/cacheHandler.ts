import path from 'path'
import cookieParser from 'cookie'
import parser from 'ua-parser-js'
import { pathToRegexp, Path } from 'path-to-regexp'
import type {
  CacheHandler,
  BaseLogger,
  NextCacheHandlerContext,
  CacheStrategy,
  CacheHandlerContext,
  CacheEntry,
  IncrementalCacheValue
} from '@dbbs/next-cache-handler-common'
import { ConsoleLogger } from './logger'
import { FileSystemCache } from './strategies/fileSystem'

export class Cache implements CacheHandler {
  static cacheCookies: string[] = []

  static cacheQueries: string[] = []

  static enableDeviceSplit = false

  static noCacheMatchers: RegExp[] = []

  static cache: CacheStrategy = new FileSystemCache()

  static logger: BaseLogger = new ConsoleLogger()

  nextOptions: NextCacheHandlerContext

  cookieCacheKey: string

  queryCacheKey: string

  pageCacheKey: string

  device?: string

  serverCacheDirPath: string

  constructor(nextOptions: NextCacheHandlerContext) {
    this.nextOptions = nextOptions
    this.cookieCacheKey = this.buildCookiesCacheKey()
    this.queryCacheKey = this.buildQueryCacheKey()
    this.pageCacheKey = this.buildPageCacheKey()
    this.serverCacheDirPath = path.join(nextOptions.serverDistDir!, 'cacheData')

    if (Cache.enableDeviceSplit) {
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
    return this.buildCacheKey(Cache.cacheCookies, parsedCookies, 'cookie')
  }

  buildQueryCacheKey() {
    try {
      const currentQueryString = this.nextOptions._requestHeaders?.['x-invoke-query']
      if (!currentQueryString) return ''

      const parsedQuery = JSON.parse(decodeURIComponent(currentQueryString as string))

      return this.buildCacheKey(Cache.cacheQueries, parsedQuery, 'query')
    } catch (_e) {
      console.warn('Could not parse request query.')
      return ''
    }
  }

  getCurrentDeviceType() {
    return parser(this.nextOptions._requestHeaders['user-agent'] as string)?.device?.type ?? ''
  }

  buildPageCacheKey() {
    return [this.device, this.cookieCacheKey, this.queryCacheKey].filter(Boolean).join('-')
  }

  getPageCacheKey(pageKey: string) {
    return [pageKey.replace('/', ''), this.pageCacheKey].filter(Boolean).join('-')
  }

  checkIsStaleCache(pageData: CacheEntry) {
    if (pageData?.revalidate) {
      return Date.now() > pageData.lastModified + pageData.revalidate * 1000
    }

    return false
  }

  checkIsPathToCache(pageKey: string) {
    return !Cache.noCacheMatchers.some((matcher) => matcher.exec(pageKey))
  }

  async get(pageKey: string): Promise<CacheEntry | null> {
    try {
      if (!this.checkIsPathToCache(pageKey)) {
        return null
      }

      Cache.logger.info(`Reading cache data for ${pageKey}`)

      const data = await Cache.cache.get(pageKey, this.getPageCacheKey(pageKey), {
        serverCacheDirPath: this.serverCacheDirPath
      })

      // Send page to revalidate
      if (!data || this.checkIsStaleCache(data)) {
        Cache.logger.info(`No actual cache found for ${pageKey}`)
        return null
      }

      return data
    } catch (err) {
      Cache.logger.error(`Failed read cache for ${pageKey}`, err)

      return null
    }
  }

  async set(pageKey: string, data: IncrementalCacheValue | null, ctx: CacheHandlerContext): Promise<void> {
    try {
      if (!this.checkIsPathToCache(pageKey) || ['IMAGE', 'REDIRECT'].includes(data?.kind ?? '')) return

      Cache.logger.info(`Writing cache for ${pageKey}`)
      const context = {
        serverCacheDirPath: this.serverCacheDirPath
      }

      if (!data) {
        try {
          Cache.logger.info(`Deleting cache data for ${pageKey}`)
          await Cache.cache.delete(pageKey, this.getPageCacheKey(pageKey), context)
        } catch (err) {
          Cache.logger.error(`Failed to delete cache data for ${pageKey}`, err)
        }
      } else {
        await Cache.cache.set(
          pageKey,
          this.getPageCacheKey(pageKey),
          {
            value: data,
            lastModified: Date.now(),
            tags: ctx.tags,
            revalidate: ctx.revalidate
          },
          context
        )
      }
    } catch (err) {
      Cache.logger.error(`Failed to write cache for ${pageKey}`, err)
    }
  }

  static addCookie(value: string) {
    Cache.cacheCookies.push(value)

    return this
  }

  static addQuery(value: string) {
    Cache.cacheQueries.push(value)

    return this
  }

  static addDeviceSplit() {
    Cache.enableDeviceSplit = true

    return this
  }

  static setCacheStrategy(cache: CacheStrategy) {
    Cache.cache = cache

    return this
  }

  static setLogger(logger: BaseLogger) {
    Cache.logger = logger

    return this
  }

  static addNoCacheMatchers(matchers: Path | Path[]) {
    const regexps = Array.isArray(matchers)
      ? matchers.map((matcher) => pathToRegexp(matcher))
      : [pathToRegexp(matchers)]
    Cache.noCacheMatchers.push(...regexps)

    return this
  }
}
