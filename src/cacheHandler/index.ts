import cookieParser from 'cookie'
import parser from 'ua-parser-js'
import type {
  CacheHandler as CacheHandlerType,
  BaseLogger,
  NextCacheHandlerContext,
  CacheStrategy,
  CacheHandlerContext,
  CacheEntry,
  IncrementalCacheValue
} from '../types'
import path from 'path'

export class CacheHandler implements CacheHandlerType {
  static cacheCookies: string[] = []

  static cacheQueries: string[] = []

  static enableDeviceSplit = false

  static cache: CacheStrategy

  static logger: BaseLogger

  nextOptions: NextCacheHandlerContext

  cookieCacheKey: string

  queryCacheKey: string

  device?: string

  serverCacheDirPath: string

  constructor(nextOptions: NextCacheHandlerContext) {
    this.nextOptions = nextOptions
    this.cookieCacheKey = this.buildCookiesCacheKey()
    this.queryCacheKey = this.buildQueryCacheKey()
    this.serverCacheDirPath = path.join(nextOptions.serverDistDir!, 'cacheData')

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

  checkIsStaleCache(pageData: CacheEntry | null) {
    if (pageData?.revalidate) {
      return Date.now() > pageData.lastModified + pageData.revalidate * 1000
    }

    return false
  }

  async get(cacheKey: string): Promise<CacheEntry | null> {
    try {
      CacheHandler.logger.info(`Reading cache data for ${cacheKey}`)

      const data = await CacheHandler.cache.get(this.getPageCacheKey(cacheKey), {
        serverCacheDirPath: this.serverCacheDirPath
      })

      const isStaleData = this.checkIsStaleCache(data)

      // Send page to revalidate
      if (isStaleData || !data) return null

      return data
    } catch (err) {
      CacheHandler.logger.error(`Failed read cache for ${cacheKey}`, err)

      return null
    }
  }

  async set(cacheKey: string, data: IncrementalCacheValue | null, ctx: CacheHandlerContext): Promise<void> {
    try {
      CacheHandler.logger.info(`Writing cache for ${cacheKey}`)

      const key = this.getPageCacheKey(cacheKey)
      const context = {
        serverCacheDirPath: this.serverCacheDirPath
      }

      if (!data) {
        try {
          CacheHandler.logger.info(`Deleting cache data for ${cacheKey}`)
          await CacheHandler.cache.delete(key, context)
        } catch (err) {
          CacheHandler.logger.error(`Failed to delete cache data for ${cacheKey}`, err)
        }
      } else {
        await CacheHandler.cache.set(
          key,
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
      CacheHandler.logger.error(`Failed to write cache for ${cacheKey}`, err)
    }
  }

  static addCookie(value: string) {
    CacheHandler.cacheCookies.push(value)

    return this
  }

  static addQuery(value: string) {
    CacheHandler.cacheQueries.push(value)

    return this
  }

  static addDeviceSplit() {
    CacheHandler.enableDeviceSplit = true

    return this
  }

  static setCacheStrategy(cache: CacheStrategy) {
    CacheHandler.cache = cache

    return this
  }

  static setLogger(logger: BaseLogger) {
    CacheHandler.logger = logger

    return this
  }
}
