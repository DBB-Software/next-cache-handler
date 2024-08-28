import {
  IncrementalCacheValue,
  NextCacheHandlerContext,
  CacheEntry,
  CacheContext,
  CacheHandlerContext
} from '@dbbs/next-cache-handler-common'

export const mockNextHandlerContext: NextCacheHandlerContext = {
  revalidatedTags: [],
  experimental: {
    ppr: false
  },
  _appDir: false,
  _pagesDir: true,
  _requestHeaders: {},
  serverDistDir: 'path-to-cache'
}

export const mockHandlerMethodContext: CacheHandlerContext = {
  tags: ['page'],
  revalidate: 60,
  serverCacheDirPath: `${mockNextHandlerContext.serverDistDir}/cacheData`
}

export const mockPageData: IncrementalCacheValue = {
  pageData: {},
  html: '',
  kind: 'PAGE',
  postponed: undefined,
  headers: undefined,
  status: 200
}

export const mockCacheEntry: CacheEntry = {
  value: mockPageData,
  lastModified: 100000
}

export const mockCacheStrategyContext: CacheContext = {
  serverCacheDirPath: mockHandlerMethodContext.serverCacheDirPath,
  isAppRouter: false
}
