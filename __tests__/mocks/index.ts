import { IncrementalCacheValue, CacheHandlerContext } from '../../src'

export const mockPageData = {
  pageData: {},
  html: '',
  kind: 'PAGE',
  postponed: undefined,
  headers: undefined,
  status: 200
} satisfies IncrementalCacheValue

export const mockNextHandlerContext: CacheHandlerContext = {
  revalidatedTags: [],
  experimental: {
    ppr: false
  },
  _appDir: true,
  _pagesDir: false,
  _requestHeaders: {},
  serverDistDir: __dirname
}

export const mockHandlerMethodContext = { tags: ['page'], serverAppPath: '' }
