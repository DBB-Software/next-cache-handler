import { NEXT_CACHE_IMPLICIT_TAG_ID } from 'next/dist/lib/constants'
import { Cache, FileSystemCache, BaseLogger } from '../src'
import { mockNextHandlerContext, mockPageData, mockHandlerMethodContext, mockCacheStrategyContext } from './mocks'

const mockGetData = jest.fn()
const mockSetData = jest.fn()
const mockDeleteData = jest.fn()
const mockRevalidateTagData = jest.fn()
const mockDeleteAllByKeyMatchData = jest.fn()

jest.mock('../src/strategies/fileSystem', () => {
  return {
    FileSystemCache: jest.fn().mockImplementation(() => ({
      get: jest.fn((...params) => mockGetData(...params)),
      set: jest.fn((...params) => mockSetData(...params)),
      delete: jest.fn((...params) => mockDeleteData(...params)),
      revalidateTag: jest.fn((...params) => mockRevalidateTagData(...params)),
      deleteAllByKeyMatch: jest.fn((...params) => mockDeleteAllByKeyMatchData(...params))
    }))
  }
})

jest.mock('crypto', () => {
  return {
    createHash: jest.fn().mockImplementation(() => ({
      update: jest.fn((value: string) => ({
        digest: jest.fn(() => value)
      }))
    }))
  }
})

const mockLogger: BaseLogger = {
  info: jest.fn(),
  error: jest.fn()
}

const mockCacheKey = 'test'

const RegExpMatcher = /^(\/api\/.*|\/_next\/static\/.*|\/_next\/image\/.*|\/favicon\.ico)$/
const NonMatchedPaths = [
  '/api/users',
  '/api/v1/login',
  '/_next/static/css/main.css',
  '/_next/static/js/bundle.js',
  '/_next/image/file.png',
  '/_next/image/optimized/photo.jpg',
  '/favicon.ico'
]
const matchedPaths = [
  '/home',
  '/user/profile',
  '/static/_next/css/main.css',
  '/image/_next/file.png',
  '/favicon.png',
  '/next/static/js/bundle.js',
  '/image/file.png'
]

describe('CacheHandler', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(Date.now())
  })

  afterEach(() => {
    Cache.setConfig({
      cacheCookies: [],
      cacheQueries: [],
      enableDeviceSplit: false,
      noCacheMatchers: [],
      cache: new FileSystemCache(),
      logger: mockLogger
    })
    jest.clearAllMocks()
  })

  afterAll(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it.each([
    {
      cacheStrategy: new FileSystemCache(),
      addDeviceSplit: false,
      overrideHeaders: {},
      expectedCacheSuffix: '',
      description: 'without split cache'
    },
    {
      cacheCookie: 'abtest',
      cacheStrategy: new FileSystemCache(),
      addDeviceSplit: false,
      overrideHeaders: {},
      expectedCacheSuffix: '',
      description: 'with cookie key and without cookie header'
    },
    {
      cacheCookie: 'user',
      cacheStrategy: new FileSystemCache(),
      addDeviceSplit: false,
      overrideHeaders: {
        cookie: 'user=guest;'
      },
      expectedCacheSuffix: 'cookie(user=guest)',
      description: 'with cookie key and header'
    },
    {
      cacheQuery: 'feature',
      cacheStrategy: new FileSystemCache(),
      addDeviceSplit: false,
      overrideHeaders: {},
      expectedCacheSuffix: '',
      description: 'with query key and without headers'
    },
    {
      cacheQuery: 'feature',
      cacheStrategy: new FileSystemCache(),
      addDeviceSplit: false,
      overrideHeaders: {
        'x-invoke-query': encodeURIComponent(JSON.stringify({ feature: '123' }))
      },
      expectedCacheSuffix: 'query(feature=123)',
      description: 'with query key and headers'
    },
    {
      cacheCookie: 'abtest',
      cacheQuery: 'feature',
      cacheStrategy: new FileSystemCache(),
      addDeviceSplit: false,
      overrideHeaders: {
        cookie: 'abtest=1;',
        'x-invoke-query': encodeURIComponent(JSON.stringify({ feature: '2' }))
      },
      expectedCacheSuffix: 'cookie(abtest=1)-query(feature=2)',
      description: 'with cookie and query'
    }
  ])(
    'should handle cache $description',
    async ({ cacheCookie, cacheQuery, cacheStrategy, addDeviceSplit, overrideHeaders, expectedCacheSuffix }) => {
      Cache.setConfig({
        enableDeviceSplit: addDeviceSplit,
        cacheCookies: cacheCookie ? [cacheCookie] : [],
        cacheQueries: cacheQuery ? [cacheQuery] : [],
        cache: cacheStrategy,
        logger: mockLogger
      })

      const cacheHandler = new Cache({
        ...mockNextHandlerContext,
        _requestHeaders: overrideHeaders
      })
      const pageKey = 'index'
      const currentCacheKey = [expectedCacheSuffix].filter(Boolean).join('-')

      await cacheHandler.get(pageKey)
      expect(cacheStrategy.get).toHaveBeenCalledTimes(1)
      expect(cacheStrategy.get).toHaveBeenCalledWith(pageKey, currentCacheKey, mockCacheStrategyContext)

      await cacheHandler.set(pageKey, mockPageData, mockHandlerMethodContext)
      expect(cacheStrategy.set).toHaveBeenCalledTimes(1)
      expect(cacheStrategy.set).toHaveBeenCalledWith(
        pageKey,
        currentCacheKey,
        {
          value: mockPageData,
          lastModified: Date.now(),
          tags: mockHandlerMethodContext.tags,
          revalidate: mockHandlerMethodContext.revalidate
        },
        mockCacheStrategyContext
      )
    }
  )

  it('should log when read data from cache', async () => {
    Cache.setConfig({
      logger: mockLogger,
      cache: new FileSystemCache()
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    const result = await cacheHandler.get(mockCacheKey)

    expect(mockLogger.info).toHaveBeenCalledTimes(2)
    expect(mockLogger.info).toHaveBeenCalledWith(`Reading cache data for ${mockCacheKey}`)
    expect(mockLogger.info).toHaveBeenCalledWith(`No actual cache found for ${mockCacheKey}`)
    expect(result).toBeNull()
  })

  it('should log when failed to read data from cache', async () => {
    const errorMessage = 'Error reading'
    mockGetData.mockRejectedValueOnce(errorMessage)

    Cache.setConfig({
      logger: mockLogger,
      cache: new FileSystemCache()
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.get(mockCacheKey)

    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenCalledWith(`Reading cache data for ${mockCacheKey}`)

    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(`CacheError: Failed to read cache for ${mockCacheKey}`, errorMessage)
  })

  it('should log when set data to cache', async () => {
    Cache.setConfig({
      logger: mockLogger,
      cache: new FileSystemCache()
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.set(mockCacheKey, mockPageData, mockCacheStrategyContext)

    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenCalledWith(`Writing cache for ${mockCacheKey}`)
  })

  it('should log when failed to set data to cache', async () => {
    const errorMessage = 'Error writing'
    mockSetData.mockRejectedValueOnce(errorMessage)

    Cache.setConfig({
      logger: mockLogger,
      cache: new FileSystemCache()
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.set(mockCacheKey, mockPageData, mockCacheStrategyContext)

    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenCalledWith(`Writing cache for ${mockCacheKey}`)

    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(`Failed to write cache for ${mockCacheKey}`, errorMessage)
  })

  it('should delete page cache if data was not passed', async () => {
    Cache.setConfig({
      logger: mockLogger,
      cache: new FileSystemCache()
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.set(mockCacheKey, null, mockCacheStrategyContext)

    expect(mockDeleteData).toHaveBeenCalledTimes(1)
    expect(mockDeleteData).toHaveBeenCalledWith(mockCacheKey, '', mockCacheStrategyContext)

    expect(mockLogger.info).toHaveBeenCalledTimes(2)
    expect(mockLogger.info).toHaveBeenNthCalledWith(1, `Writing cache for ${mockCacheKey}`)
    expect(mockLogger.info).toHaveBeenNthCalledWith(2, `Deleting cache data for ${mockCacheKey}`)
  })

  it('should log when failed to delete page cache data', async () => {
    const errorMessage = 'error deleting'
    mockDeleteData.mockRejectedValueOnce(errorMessage)

    Cache.setConfig({
      logger: mockLogger,
      cache: new FileSystemCache()
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.set(mockCacheKey, null, mockCacheStrategyContext)

    expect(mockLogger.info).toHaveBeenCalledTimes(2)
    expect(mockLogger.info).toHaveBeenNthCalledWith(1, `Writing cache for ${mockCacheKey}`)
    expect(mockLogger.info).toHaveBeenNthCalledWith(2, `Deleting cache data for ${mockCacheKey}`)

    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(`Failed to delete cache data for ${mockCacheKey}`, errorMessage)
  })

  it('should skip reading / writing data if route listed as no cache using value', async () => {
    Cache.setConfig({
      noCacheMatchers: [mockCacheKey],
      cache: new FileSystemCache(),
      logger: mockLogger
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.set(mockCacheKey, mockPageData, mockHandlerMethodContext)
    const res = await cacheHandler.get(mockCacheKey)
    expect(mockLogger.info).toHaveBeenCalledTimes(0)
    expect(res).toBeNull()
  })

  it('should skip reading / writing data if route listed as no cache using regular expressions)', async () => {
    Cache.setConfig({
      noCacheMatchers: [RegExpMatcher],
      cache: new FileSystemCache(),
      logger: mockLogger
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    for (const nonMatchedPath of NonMatchedPaths) {
      await cacheHandler.set(nonMatchedPath, mockPageData, mockHandlerMethodContext)
      await cacheHandler.get(nonMatchedPath)
    }

    expect(mockLogger.info).toHaveBeenCalledTimes(0)

    for (const matchedPath of matchedPaths) {
      await cacheHandler.set(matchedPath, mockPageData, mockHandlerMethodContext)
      await cacheHandler.get(matchedPath)
    }

    expect(mockLogger.info).toHaveBeenCalledTimes(21)
  })

  it('should skip reading / writing data if route listed as no cache using regular expressions and additional value)', async () => {
    Cache.setConfig({
      noCacheMatchers: [RegExpMatcher, '/home'],
      cache: new FileSystemCache(),
      logger: mockLogger
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    for (const nonMatchedPath of NonMatchedPaths) {
      await cacheHandler.set(nonMatchedPath, mockPageData, mockHandlerMethodContext)
      await cacheHandler.get(nonMatchedPath)
    }

    expect(mockLogger.info).toHaveBeenCalledTimes(0)

    for (const matchedPath of matchedPaths) {
      await cacheHandler.set(matchedPath, mockPageData, mockHandlerMethodContext)
      await cacheHandler.get(matchedPath)
    }

    expect(mockLogger.info).toHaveBeenCalledTimes(18)
  })

  it('should skip reading / writing data if route listed as no cache using regular expressions and additional matcher)', async () => {
    Cache.setConfig({
      noCacheMatchers: [RegExpMatcher, '/:path'],
      cache: new FileSystemCache(),
      logger: mockLogger
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    for (const nonMatchedPath of NonMatchedPaths) {
      await cacheHandler.set(nonMatchedPath, mockPageData, mockHandlerMethodContext)
      await cacheHandler.get(nonMatchedPath)
    }

    expect(mockLogger.info).toHaveBeenCalledTimes(0)

    for (const matchedPath of matchedPaths) {
      await cacheHandler.set(matchedPath, mockPageData, mockHandlerMethodContext)
      await cacheHandler.get(matchedPath)
    }

    expect(mockLogger.info).toHaveBeenCalledTimes(15)
  })

  it('should log when revalidate path', async () => {
    Cache.setConfig({
      logger: mockLogger,
      cache: new FileSystemCache()
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.revalidateTag(`_N_T_${mockCacheKey}`)

    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenNthCalledWith(1, `Revalidate by path ${mockCacheKey}`)
  })

  it('should log when revalidate tag', async () => {
    Cache.setConfig({
      logger: mockLogger,
      cache: new FileSystemCache()
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.revalidateTag(mockCacheKey)

    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenNthCalledWith(1, `Revalidate by tag ${mockCacheKey}`)
  })

  it('should log when failed to revalidate tag', async () => {
    const errorMessage = 'error revalidate'
    mockRevalidateTagData.mockRejectedValueOnce(errorMessage)

    Cache.setConfig({
      logger: mockLogger,
      cache: new FileSystemCache()
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.revalidateTag(mockCacheKey)

    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenNthCalledWith(1, `Revalidate by tag ${mockCacheKey}`)

    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(`Failed revalidate by ${mockCacheKey}`, errorMessage)
  })

  it('should log when failed to revalidate path', async () => {
    const errorMessage = 'error revalidate'
    mockDeleteAllByKeyMatchData.mockRejectedValueOnce(errorMessage)

    Cache.setConfig({
      logger: mockLogger,
      cache: new FileSystemCache()
    })
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.revalidateTag(`${NEXT_CACHE_IMPLICIT_TAG_ID}${mockCacheKey}`)

    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenNthCalledWith(1, `Revalidate by path ${mockCacheKey}`)

    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Failed revalidate by ${NEXT_CACHE_IMPLICIT_TAG_ID}${mockCacheKey}`,
      errorMessage
    )
  })
})
