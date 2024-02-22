import { MemoryCache } from '../src/cacheStrategy/memory'
import { mockCacheEntry } from './mocks'

const memoryCache = new MemoryCache()
const cacheKey = 'test'
const cacheKey2 = 'test-2'

describe('MemoryCache', () => {
  it('should set and read the cache', () => {
    memoryCache.set(cacheKey, mockCacheEntry)
    expect(memoryCache.get(cacheKey)).toEqual(mockCacheEntry)
  })

  it('should delete cache entry', () => {
    memoryCache.set(cacheKey, mockCacheEntry)
    expect(memoryCache.get(cacheKey)).toEqual(mockCacheEntry)

    memoryCache.delete(cacheKey)
    expect(memoryCache.get(cacheKey)).toBeFalsy()
  })

  it('should delete entries by kay match', () => {
    memoryCache.set(cacheKey, mockCacheEntry)
    memoryCache.set(cacheKey2, mockCacheEntry)

    expect(memoryCache.get(cacheKey)).toEqual(mockCacheEntry)
    expect(memoryCache.get(cacheKey2)).toEqual(mockCacheEntry)

    memoryCache.deleteAllByKeyMatch(cacheKey)

    expect(memoryCache.get(cacheKey)).toBeFalsy()
    expect(memoryCache.get(cacheKey2)).toBeFalsy()
  })
})
