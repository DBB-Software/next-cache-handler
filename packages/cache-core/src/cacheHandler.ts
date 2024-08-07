import path from 'path'
import cookieParser from 'cookie'
import parser from 'ua-parser-js'
import crypto from 'crypto'
import { pathToRegexp, Path } from 'path-to-regexp'
import { NEXT_CACHE_IMPLICIT_TAG_ID } from 'next/dist/lib/constants'
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

export enum HEADER_DEVICE_TYPE {
  Desktop = 'cloudfront-is-desktop-viewer',
  Mobile = 'cloudfront-is-mobile-viewer',
  SmartTV = 'cloudfront-is-smarttv-viewer',
  Tablet = 'cloudfront-is-tablet-viewer'
}

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

  deviceCacheKey: string

  serverCacheDirPath: string

  isAppRouter: boolean

  constructor(nextOptions: NextCacheHandlerContext) {
    this.nextOptions = nextOptions
    this.cookieCacheKey = this.buildCookiesCacheKey()
    this.queryCacheKey = this.buildQueryCacheKey()
    this.deviceCacheKey = this.getCurrentDeviceType()
    this.serverCacheDirPath = path.join(nextOptions.serverDistDir!, 'cacheData')
    this.pageCacheKey = this.buildPageCacheKey()
    this.isAppRouter = !!nextOptions._appDir
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
    if (!Cache.enableDeviceSplit) return ''
    const headers = this.nextOptions._requestHeaders

    if (headers['user-agent'] === 'Amazon CloudFront') {
      if (headers[HEADER_DEVICE_TYPE.Desktop] === 'true') {
        return ''
      } else if (headers[HEADER_DEVICE_TYPE.Mobile] === 'true') {
        return 'mobile'
      } else if (headers[HEADER_DEVICE_TYPE.Tablet] === 'true') {
        return 'tablet'
      } else if (headers[HEADER_DEVICE_TYPE.SmartTV] === 'true') {
        return 'smarttv'
      }
      return ''
    }

    return parser(headers['user-agent'] as string)?.device?.type ?? ''
  }

  buildPageCacheKey() {
    return [this.deviceCacheKey, this.cookieCacheKey, this.queryCacheKey].filter(Boolean).join('-')
  }

  getPageCacheKey(pageKey: string) {
    return crypto
      .createHash('md5')
      .update([pageKey.split('/').at(-1), this.pageCacheKey].filter(Boolean).join('-'))
      .digest('hex')
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

  removeSlashFromStart(value: string) {
    return value.startsWith('/') ? value.substring(1) : value
  }

  async get(pageKey: string): Promise<CacheEntry | null> {
    try {
      if (!this.checkIsPathToCache(pageKey)) {
        return null
      }

      Cache.logger.info(`Reading cache data for ${pageKey}`)

      const data = await Cache.cache.get(this.removeSlashFromStart(pageKey), this.getPageCacheKey(pageKey), {
        serverCacheDirPath: this.serverCacheDirPath,
        isAppRouter: this.isAppRouter
      })

      // Send page to revalidate
      if (!data || this.checkIsStaleCache(data)) {
        Cache.logger.info(`No actual cache found for ${pageKey}`)
        return null
      }

      if (data.value?.kind === 'ROUTE') {
        return { ...data, value: { ...data.value, body: Buffer.from(data.value.body as unknown as string, 'base64') } }
      }

      return data
    } catch (err) {
      Cache.logger.error(`Failed read cache for ${pageKey}`, err)

      return null
    }
  }

  async set(pageKey: string, data: IncrementalCacheValue | null, ctx: CacheHandlerContext): Promise<void> {
    try {
      if (!this.checkIsPathToCache(pageKey) || ['IMAGE', 'REDIRECT', 'FETCH'].includes(data?.kind ?? '')) return

      Cache.logger.info(`Writing cache for ${pageKey}`)
      const context = {
        serverCacheDirPath: this.serverCacheDirPath,
        isAppRouter: this.isAppRouter
      }

      if (!data) {
        try {
          Cache.logger.info(`Deleting cache data for ${pageKey}`)
          await Cache.cache.delete(this.removeSlashFromStart(pageKey), this.getPageCacheKey(pageKey), context)
        } catch (err) {
          Cache.logger.error(`Failed to delete cache data for ${pageKey}`, err)
        }
      } else {
        await Cache.cache.set(
          this.removeSlashFromStart(pageKey),
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

  async revalidateTag(tag: string) {
    try {
      if (tag.startsWith(NEXT_CACHE_IMPLICIT_TAG_ID)) {
        const path = tag.slice(NEXT_CACHE_IMPLICIT_TAG_ID.length)
        Cache.logger.info(`Revalidate by path ${path}`)
        const pageKey = this.removeSlashFromStart(path)
        await Cache.cache.deleteAllByKeyMatch(!pageKey.length ? 'index' : pageKey, {
          serverCacheDirPath: this.serverCacheDirPath
        })
      } else {
        Cache.logger.info(`Revalidate by tag ${tag}`)
        await Cache.cache.revalidateTag(tag, {
          serverCacheDirPath: this.serverCacheDirPath
        })
      }
    } catch (err) {
      Cache.logger.error(`Failed revalidate by ${tag}`, err)
      return
    }
  }

  static addCookies(value: string[]) {
    Cache.cacheCookies.push(...value)

    return this
  }

  static addQueries(value: string[]) {
    Cache.cacheQueries.push(...value)

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
