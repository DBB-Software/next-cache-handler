import { MemoryCache } from '../src/cacheStrategy/memory'
import { mockPageData, mockHandlerMethodContext } from './mocks'

const memoryCache = new MemoryCache()
const cacheKey = 'test'

describe('MemoryCache', () => {
  it('should set and read the cache', () => {
    memoryCache.set(cacheKey, mockPageData, mockHandlerMethodContext)

    const result = memoryCache.get(cacheKey)
    expect(result.value).toEqual(mockPageData)
    expect(result.lastModified).toBeDefined()
    expect(result.tags).toEqual(mockHandlerMethodContext.tags)
  })

  it('should clear cache for given key', () => {
    memoryCache.set(cacheKey, mockPageData, mockHandlerMethodContext)

    const result = memoryCache.get(cacheKey)
    expect(result.value).toEqual(mockPageData)
    expect(result.lastModified).toBeDefined()
    expect(result.tags).toEqual(mockHandlerMethodContext.tags)

    memoryCache.set(cacheKey, null, mockHandlerMethodContext)
    expect(memoryCache.get(cacheKey)).toBeNull()
  })
})
