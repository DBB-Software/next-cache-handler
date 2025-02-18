import { CacheEntry, CachedRouteKind } from '@dbbs/next-cache-handler-core'
export const mockCacheEntry: CacheEntry = {
  value: {
    pageData: {},
    html: '',
    kind: CachedRouteKind.PAGE,
    headers: undefined,
    status: 200
  },
  lastModified: 100000
}

const store = new Map()

export const mockGetKeys = jest.fn().mockImplementation(() => [...store.keys()])
export const mockReadKey = jest.fn().mockImplementation((path) => store.get(path))
export const mockWriteKey = jest.fn().mockImplementation((path, data) => store.set(path, data))
export const mockDeleteKey = jest.fn().mockImplementation((path) => {
  if (Array.isArray(path)) {
    path.forEach((key) => store.delete(key))
  } else {
    store.delete(path)
  }
})
export const mockScan = jest.fn().mockImplementation(() => ({ cursor: 0, keys: store.keys() }))
