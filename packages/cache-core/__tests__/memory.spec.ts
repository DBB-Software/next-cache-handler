import { MemoryCache } from '../src'
import { mockCacheEntry } from './mocks'

const memoryCache = new MemoryCache()
const cacheKey = 'test'
const cacheKey2 = 'test-2'
const sizeOfMockEntry = Buffer.byteLength(JSON.stringify(mockCacheEntry)) / 1024 / 1024

describe('MemoryCache', () => {
  it('should set and read the cache', () => {
    memoryCache.set(cacheKey, cacheKey, mockCacheEntry)
    expect(memoryCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntry)
  })

  it('should delete cache entry', () => {
    memoryCache.set(cacheKey, cacheKey, mockCacheEntry)
    expect(memoryCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntry)

    memoryCache.delete(cacheKey, `${cacheKey}/${cacheKey}`)
    expect(memoryCache.get(cacheKey, cacheKey)).toBeFalsy()
  })

  it('should delete entries by kay match', () => {
    memoryCache.set(cacheKey, cacheKey, mockCacheEntry)
    memoryCache.set(cacheKey2, cacheKey2, mockCacheEntry)

    expect(memoryCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntry)
    expect(memoryCache.get(cacheKey2, cacheKey2)).toEqual(mockCacheEntry)

    memoryCache.deleteAllByKeyMatch(cacheKey, undefined, [])

    expect(memoryCache.get(cacheKey, cacheKey)).toBeFalsy()
    expect(memoryCache.get(cacheKey2, cacheKey2)).toEqual(mockCacheEntry)

    memoryCache.deleteAllByKeyMatch(cacheKey2, undefined, [])
    expect(memoryCache.get(cacheKey2, cacheKey2)).toBeFalsy()
  })

  it('should clear data if reached memory limit', () => {
    const cache = new MemoryCache({ sizeLimit: sizeOfMockEntry * 2 })
    const overLimitedCacheKey = 'cache-with-overLimited-data'

    cache.set(cacheKey, cacheKey, mockCacheEntry)
    cache.set(cacheKey2, cacheKey2, mockCacheEntry)

    expect(memoryCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntry)
    expect(memoryCache.get(cacheKey2, cacheKey2)).toEqual(mockCacheEntry)

    cache.set(overLimitedCacheKey, overLimitedCacheKey, mockCacheEntry)

    expect(memoryCache.get(cacheKey, cacheKey)).toBeNull()
    expect(memoryCache.get(cacheKey2, cacheKey2)).toBeNull()
    expect(memoryCache.get(overLimitedCacheKey, overLimitedCacheKey)).toEqual(mockCacheEntry)
  })

  it('should revalidate cache by tag', async () => {
    const mockCacheEntryWithTags = { ...mockCacheEntry, tags: [cacheKey, cacheKey2] }
    memoryCache.set(cacheKey, cacheKey, mockCacheEntryWithTags)
    memoryCache.set(cacheKey2, cacheKey2, mockCacheEntryWithTags)

    expect(memoryCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntryWithTags)
    expect(memoryCache.get(cacheKey2, cacheKey2)).toEqual(mockCacheEntryWithTags)

    await memoryCache.revalidateTag(cacheKey, undefined, [])

    expect(memoryCache.get(cacheKey, cacheKey)).toBeFalsy()
    expect(memoryCache.get(cacheKey2, cacheKey2)).toBeFalsy()
  })

  it('should revalidate cache by path', async () => {
    memoryCache.set(cacheKey, cacheKey, mockCacheEntry)
    memoryCache.set(cacheKey2, cacheKey2, mockCacheEntry)

    expect(memoryCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntry)
    expect(memoryCache.get(cacheKey2, cacheKey2)).toEqual(mockCacheEntry)

    await memoryCache.deleteAllByKeyMatch(cacheKey, undefined, [])
    expect(memoryCache.get(cacheKey, cacheKey)).toBeFalsy()
    expect(memoryCache.get(cacheKey2, cacheKey2)).toEqual(mockCacheEntry)

    await memoryCache.deleteAllByKeyMatch(cacheKey2, undefined, [])
    expect(memoryCache.get(cacheKey2, cacheKey2)).toBeFalsy()
  })
})
