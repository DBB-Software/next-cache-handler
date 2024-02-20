import { CacheHandler, MemoryCache } from '../src'
import { mockNextHandlerContext, mockPageData } from './mocks'

jest.mock('../src/cacheStrategy/memory', () => {
  return {
    MemoryCache: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      set: jest.fn()
    }))
  }
})

describe('CacheHandler', () => {
  afterEach(() => {
    CacheHandler.cacheCookies = []
    CacheHandler.cacheQueries = []
    CacheHandler.enableDeviceSplit = false
    jest.clearAllMocks()
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  it.each([
    {
      cacheStrategy: new MemoryCache(),
      addDeviceSplit: false,
      overrideHeaders: {},
      expectedCacheSuffix: '',
      description: 'without split cache'
    },
    {
      cacheCookie: 'abtest',
      cacheStrategy: new MemoryCache(),
      addDeviceSplit: false,
      overrideHeaders: {},
      expectedCacheSuffix: '',
      description: 'with cookie key and without cookie header'
    },
    {
      cacheCookie: 'user',
      cacheStrategy: new MemoryCache(),
      addDeviceSplit: false,
      overrideHeaders: {
        cookie: 'user=guest;'
      },
      expectedCacheSuffix: 'cookie(user=guest)',
      description: 'with cookie key and header'
    },
    {
      cacheQuery: 'feature',
      cacheStrategy: new MemoryCache(),
      addDeviceSplit: false,
      overrideHeaders: {},
      expectedCacheSuffix: '',
      description: 'with query key and without headers'
    },
    {
      cacheQuery: 'feature',
      cacheStrategy: new MemoryCache(),
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
      cacheStrategy: new MemoryCache(),
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
      const handlerMethodContext = { serverAppPath: mockNextHandlerContext.serverDistDir! }

      cacheHandler.get(pageKey, handlerMethodContext)
      expect(cacheStrategy.get).toHaveBeenCalledTimes(1)
      expect(cacheStrategy.get).toHaveBeenCalledWith(currentCacheKey, handlerMethodContext)

      cacheHandler.set(pageKey, mockPageData, handlerMethodContext)
      expect(cacheStrategy.set).toHaveBeenCalledTimes(1)
      expect(cacheStrategy.set).toHaveBeenCalledWith(currentCacheKey, mockPageData, handlerMethodContext)
    }
  )
})
