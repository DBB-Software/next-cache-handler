import path from 'path'
import cookieParser from 'cookie'
import parser from 'ua-parser-js'
import crypto from 'crypto'
import { pathToRegexp } from 'path-to-regexp'
import { NEXT_CACHE_IMPLICIT_TAG_ID } from 'next/dist/lib/constants'
import type {
  NextCacheHandlerContext,
  CacheHandlerContext,
  CacheEntry,
  IncrementalCacheValue,
  CacheConfig,
  CacheHandler
} from '../src/types'
import { ConsoleLogger } from './logger'
import { FileSystemCache } from './strategies/fileSystem'

export enum HEADER_DEVICE_TYPE {
  Desktop = 'cloudfront-is-desktop-viewer',
  Mobile = 'cloudfront-is-mobile-viewer',
  SmartTV = 'cloudfront-is-smarttv-viewer',
  Tablet = 'cloudfront-is-tablet-viewer'
}

// Custom error types for better error handling
export class CacheError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'CacheError'
  }
}

export class CacheKeyError extends CacheError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'CacheKeyError'
  }
}

export const CURRENT_CACHE_KEY_HEADER_NAME = 'x-current-cache-key'

export class Cache implements CacheHandler {
  private static config: CacheConfig = {
    cacheCookies: [],
    cacheQueries: [],
    enableDeviceSplit: false,
    noCacheMatchers: [],
    cache: new FileSystemCache(),
    logger: new ConsoleLogger()
  }

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

    const cacheKeys = keys.reduce<string[]>(
      (prev, curr) => (!data[curr] ? prev : [...prev, `${curr}=${data[curr]}`]),
      []
    )

    return !cacheKeys.length ? '' : `${prefix}(${cacheKeys.join('-')})`
  }

  buildCookiesCacheKey() {
    const parsedCookies = cookieParser.parse((this.nextOptions._requestHeaders.cookie as string) || '')
    return this.buildCacheKey(Cache.config.cacheCookies.toSorted(), parsedCookies, 'cookie')
  }

  buildQueryCacheKey(): string {
    try {
      const currentQueryString = this.nextOptions._requestHeaders?.['x-invoke-query']
      if (!currentQueryString) {
        return ''
      }

      const parsedQuery = this.parseQueryString(currentQueryString as string)
      return this.buildCacheKey(Cache.config.cacheQueries.toSorted(), parsedQuery, 'query')
    } catch (error) {
      throw new CacheKeyError('Failed to build query cache key', error)
    }
  }

  private parseQueryString(queryString: string): Record<string, string> {
    try {
      return JSON.parse(decodeURIComponent(queryString))
    } catch (error) {
      Cache.config.logger.error('Could not parse request query.')
      return {}
    }
  }

  getCurrentDeviceType() {
    if (!Cache.config.enableDeviceSplit) return ''
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
    }

    return parser(headers['user-agent'] as string)?.device?.type ?? ''
  }

  buildPageCacheKey() {
    return crypto
      .createHash('md5')
      .update([this.deviceCacheKey, this.cookieCacheKey, this.queryCacheKey].filter(Boolean).join('-'))
      .digest('hex')
  }

  checkIsStaleCache(pageData: CacheEntry) {
    if (pageData?.revalidate) {
      return Date.now() > pageData.lastModified + pageData.revalidate * 1000
    }

    return false
  }

  checkIsPathToCache(pageKey: string) {
    return !Cache.config.noCacheMatchers.some((matcher) => matcher.exec(pageKey))
  }

  removeSlashFromStart(value: string) {
    return value.startsWith('/') ? value.substring(1) : value
  }

  async get(pageKey: string): Promise<CacheEntry | null> {
    try {
      if (!this.checkIsPathToCache(pageKey)) {
        return null
      }

      Cache.config.logger.info(`Reading cache data for ${pageKey}`)

      const data = await Cache.config.cache.get(this.removeSlashFromStart(pageKey), this.buildPageCacheKey(), {
        serverCacheDirPath: this.serverCacheDirPath,
        isAppRouter: this.isAppRouter
      })

      if (!data || this.checkIsStaleCache(data)) {
        Cache.config.logger.info(`No actual cache found for ${pageKey}`)
        return null
      }

      return this.transformCacheData(data)
    } catch (error) {
      Cache.config.logger.error(new CacheError(`Failed to read cache for ${pageKey}`).toString(), error)

      return null
    }
  }

  private transformCacheData(data: CacheEntry): CacheEntry {
    if (data.value?.kind === 'ROUTE') {
      return {
        ...data,
        value: {
          ...data.value,
          body: Buffer.from(data.value.body as unknown as string, 'base64')
        }
      }
    }
    return data
  }

  async set(pageKey: string, data: IncrementalCacheValue | null, ctx: CacheHandlerContext): Promise<void> {
    try {
      if (!this.checkIsPathToCache(pageKey) || ['IMAGE', 'REDIRECT', 'FETCH'].includes(data?.kind ?? '')) return

      Cache.config.logger.info(`Writing cache for ${pageKey}`)
      const context = {
        serverCacheDirPath: this.serverCacheDirPath,
        isAppRouter: this.isAppRouter
      }

      if (!data) {
        try {
          Cache.config.logger.info(`Deleting cache data for ${pageKey}`)
          await Cache.config.cache.delete(this.removeSlashFromStart(pageKey), this.buildPageCacheKey(), context)
        } catch (err) {
          Cache.config.logger.error(`Failed to delete cache data for ${pageKey}`, err)
        }
      } else {
        await Cache.config.cache.set(
          this.removeSlashFromStart(pageKey),
          this.buildPageCacheKey(),
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
      Cache.config.logger.error(`Failed to write cache for ${pageKey}`, err)
    }
  }

  async revalidateTag(tag: string) {
    try {
      if (tag.startsWith(NEXT_CACHE_IMPLICIT_TAG_ID)) {
        const [path, query] = tag.slice(NEXT_CACHE_IMPLICIT_TAG_ID.length).split('?')
        Cache.config.logger.info(`Revalidate by path ${path}`)

        if (query) {
          try {
            this.queryCacheKey = this.buildCacheKey(
              Cache.config.cacheQueries.toSorted(),
              Object.fromEntries(new URLSearchParams(query)),
              'query'
            )
          } catch (err) {
            Cache.config.logger.error('Error building cache key from path', err)
          }
        }

        const pageKey = this.removeSlashFromStart(path)

        await Cache.config.cache.deleteAllByKeyMatch(!pageKey.length ? 'index' : pageKey, this.buildPageCacheKey(), {
          serverCacheDirPath: this.serverCacheDirPath
        })
      } else {
        Cache.config.logger.info(`Revalidate by tag ${tag}`)
        // TODO: (ISSUE-1650)
        await Cache.config.cache.revalidateTag(tag, [], {
          serverCacheDirPath: this.serverCacheDirPath
        })
      }
    } catch (err) {
      Cache.config.logger.error(`Failed revalidate by ${tag}`, err)
      return
    }
  }

  static setConfig(
    config: Partial<Omit<CacheConfig, 'noCacheMatchers'> & { noCacheMatchers: (RegExp | string)[] }>
  ): typeof Cache {
    Cache.config = {
      ...Cache.config,
      ...config,
      noCacheMatchers: Array.isArray(config.noCacheMatchers)
        ? config.noCacheMatchers.map((matcher) => pathToRegexp(matcher))
        : []
    }
    return this
  }
}
