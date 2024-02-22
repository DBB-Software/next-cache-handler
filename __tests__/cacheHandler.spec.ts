import { CacheHandler, FileSystemCache } from '../src'
import { mockNextHandlerContext, mockPageData, mockHandlerMethodContext, mockCacheStrategyContext } from './mocks'

jest.mock('../src/cacheStrategy/fileSystem', () => {
  return {
    FileSystemCache: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      set: jest.fn()
    }))
  }
})

describe('CacheHandler', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(Date.now())
  })

  afterEach(() => {
    CacheHandler.cacheCookies = []
    CacheHandler.cacheQueries = []
    CacheHandler.enableDeviceSplit = false
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
    ({ cacheCookie, cacheQuery, cacheStrategy, addDeviceSplit, overrideHeaders, expectedCacheSuffix }) => {
      if (cacheCookie) {
        CacheHandler.addCookie(cacheCookie)
      }
      if (cacheQuery) {
        CacheHandler.addQuery(cacheQuery)
      }
      CacheHandler.enableDeviceSplit = addDeviceSplit
      CacheHandler.addCacheStrategy(cacheStrategy)

      const cacheHandler = new CacheHandler({
        ...mockNextHandlerContext,
        _requestHeaders: overrideHeaders
      })
      const pageKey = 'index'
      const currentCacheKey = [pageKey, expectedCacheSuffix].filter(Boolean).join('-')

      cacheHandler.get(pageKey)
      expect(cacheStrategy.get).toHaveBeenCalledTimes(1)
      expect(cacheStrategy.get).toHaveBeenCalledWith(currentCacheKey, mockCacheStrategyContext)

      cacheHandler.set(pageKey, mockPageData, mockHandlerMethodContext)
      expect(cacheStrategy.set).toHaveBeenCalledTimes(1)
      expect(cacheStrategy.set).toHaveBeenCalledWith(
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
})
