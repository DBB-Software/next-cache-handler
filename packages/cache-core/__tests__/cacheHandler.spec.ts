import { Cache, FileSystemCache, BaseLogger } from '../src'
import { mockNextHandlerContext, mockPageData, mockHandlerMethodContext, mockCacheStrategyContext } from './mocks'

const mockGetData = jest.fn()
const mockSetData = jest.fn()
const mockDeleteData = jest.fn()

jest.mock('../src/strategies/fileSystem', () => {
  return {
    FileSystemCache: jest.fn().mockImplementation(() => ({
      get: jest.fn((...params) => mockGetData(...params)),
      set: jest.fn((...params) => mockSetData(...params)),
      delete: jest.fn((...params) => mockDeleteData(...params))
    }))
  }
})

const mockLogger: BaseLogger = {
  info: jest.fn(),
  error: jest.fn()
}

const mockCacheKey = 'test'

describe('CacheHandler', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(Date.now())
  })

  afterEach(() => {
    Cache.cacheCookies = []
    Cache.cacheQueries = []
    Cache.enableDeviceSplit = false
    Cache.noCacheRoutes = []
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
      if (cacheCookie) {
        Cache.addCookie(cacheCookie)
      }
      if (cacheQuery) {
        Cache.addQuery(cacheQuery)
      }
      Cache.enableDeviceSplit = addDeviceSplit
      Cache.setCacheStrategy(cacheStrategy)
      Cache.setLogger(mockLogger)

      const cacheHandler = new Cache({
        ...mockNextHandlerContext,
        _requestHeaders: overrideHeaders
      })
      const pageKey = 'index'
      const currentCacheKey = [pageKey, expectedCacheSuffix].filter(Boolean).join('-')

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
    Cache.setCacheStrategy(new FileSystemCache())
    Cache.setLogger(mockLogger)
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.get(mockCacheKey)

    expect(mockLogger.info).toHaveBeenCalledTimes(2)
    expect(mockLogger.info).toHaveBeenCalledWith(`Reading cache data for ${mockCacheKey}`)
    expect(mockLogger.info).toHaveBeenCalledWith(`No actual cache found for ${mockCacheKey}`)
  })

  it('should log when failed to read data from cache', async () => {
    const errorMessage = 'Error reading'
    mockGetData.mockRejectedValueOnce(errorMessage)

    Cache.setCacheStrategy(new FileSystemCache())
    Cache.setLogger(mockLogger)
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.get(mockCacheKey)

    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenCalledWith(`Reading cache data for ${mockCacheKey}`)

    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(`Failed read cache for ${mockCacheKey}`, errorMessage)
  })

  it('should log when set data to cache', async () => {
    Cache.setCacheStrategy(new FileSystemCache())
    Cache.setLogger(mockLogger)
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.set(mockCacheKey, mockPageData, mockCacheStrategyContext)

    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenCalledWith(`Writing cache for ${mockCacheKey}`)
  })

  it('should log when failed to set data to cache', async () => {
    const errorMessage = 'Error writing'
    mockSetData.mockRejectedValueOnce(errorMessage)

    Cache.setCacheStrategy(new FileSystemCache())
    Cache.setLogger(mockLogger)
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.set(mockCacheKey, mockPageData, mockCacheStrategyContext)

    expect(mockLogger.info).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenCalledWith(`Writing cache for ${mockCacheKey}`)

    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(`Failed to write cache for ${mockCacheKey}`, errorMessage)
  })

  it('should delete page cache if data was not passed', async () => {
    Cache.setCacheStrategy(new FileSystemCache())
    Cache.setLogger(mockLogger)
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.set(mockCacheKey, null, mockCacheStrategyContext)

    expect(mockDeleteData).toHaveBeenCalledTimes(1)
    expect(mockDeleteData).toHaveBeenCalledWith(mockCacheKey, mockCacheKey, mockCacheStrategyContext)

    expect(mockLogger.info).toHaveBeenCalledTimes(2)
    expect(mockLogger.info).toHaveBeenNthCalledWith(1, `Writing cache for ${mockCacheKey}`)
    expect(mockLogger.info).toHaveBeenNthCalledWith(2, `Deleting cache data for ${mockCacheKey}`)
  })

  it('should log when failed to delete page cache data', async () => {
    const errorMessage = 'error deleting'
    mockDeleteData.mockRejectedValueOnce(errorMessage)

    Cache.setCacheStrategy(new FileSystemCache())
    Cache.setLogger(mockLogger)
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.set(mockCacheKey, null, mockCacheStrategyContext)

    expect(mockLogger.info).toHaveBeenCalledTimes(2)
    expect(mockLogger.info).toHaveBeenNthCalledWith(1, `Writing cache for ${mockCacheKey}`)
    expect(mockLogger.info).toHaveBeenNthCalledWith(2, `Deleting cache data for ${mockCacheKey}`)

    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(`Failed to delete cache data for ${mockCacheKey}`, errorMessage)
  })

  it('should skip reading / writing data if route listed as no cache', async () => {
    Cache.setCacheStrategy(new FileSystemCache())
    Cache.addNoCacheRoute(mockCacheKey)
    const cacheHandler = new Cache(mockNextHandlerContext)

    await cacheHandler.set(mockCacheKey, mockPageData, mockHandlerMethodContext)
    const res = await cacheHandler.get(mockCacheKey)
    expect(res).toBeNull()
  })
})
