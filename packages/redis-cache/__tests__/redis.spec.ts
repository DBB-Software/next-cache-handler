import { CacheEntry } from 'next-cache-handler-types'
import { RedisCache } from '../src'

export const mockCacheEntry: CacheEntry = {
  value: {
    pageData: {},
    html: '',
    kind: 'PAGE',
    postponed: undefined,
    headers: undefined,
    status: 200
  },
  lastModified: 100000
}

const store = new Map()
const mockReadKey = jest.fn().mockImplementation((path) => store.get(path))
const mockWriteKey = jest.fn().mockImplementation((path, data) => store.set(path, data))
const mockDeleteKey = jest.fn().mockImplementation((path) => store.delete(path))

jest.mock('redis', () => {
  return {
    createClient: jest.fn().mockReturnValue({
      connect: jest.fn(),
      get: jest.fn((...params) => mockReadKey(...params)),
      set: jest.fn((...params) => mockWriteKey(...params)),
      del: jest.fn((...params) => mockDeleteKey(...params)),
      scanIterator: jest.fn().mockImplementation(() => store.keys())
    })
  }
})

const redisCache = new RedisCache({ url: 'mock-url' })
const cacheKey = 'test'
const cacheKey2 = 'test-2'

describe('RedisCache', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  afterAll(() => {
    jest.restoreAllMocks()
  })
  it('should set and read the cache', async () => {
    await redisCache.set(cacheKey, mockCacheEntry)
    expect(redisCache.client.set).toHaveBeenCalledTimes(1)
    expect(redisCache.client.set).toHaveBeenCalledWith(cacheKey, JSON.stringify(mockCacheEntry))

    const result = await redisCache.get(cacheKey)
    expect(result).toEqual(mockCacheEntry)
    expect(redisCache.client.get).toHaveBeenCalledTimes(1)
    expect(redisCache.client.get).toHaveBeenCalledWith(cacheKey)
  })

  it('should delete cache value', async () => {
    await redisCache.set(cacheKey, mockCacheEntry)
    expect(redisCache.client.set).toHaveBeenCalledTimes(1)
    expect(redisCache.client.set).toHaveBeenCalledWith(cacheKey, JSON.stringify(mockCacheEntry))

    const result = await redisCache.get(cacheKey)
    expect(result).toEqual(mockCacheEntry)
    expect(redisCache.client.get).toHaveBeenCalledTimes(1)
    expect(redisCache.client.get).toHaveBeenCalledWith(cacheKey)

    await redisCache.delete(cacheKey)
    const updatedResult = await redisCache.get(cacheKey)
    expect(updatedResult).toBeNull()
    expect(redisCache.client.del).toHaveBeenCalledTimes(1)
    expect(redisCache.client.del).toHaveBeenCalledWith(cacheKey)
  })

  it('should delete all cache entries by key match', async () => {
    await redisCache.set(cacheKey, mockCacheEntry)
    await redisCache.set(cacheKey2, mockCacheEntry)

    const result1 = await redisCache.get(cacheKey)
    const result2 = await redisCache.get(cacheKey2)
    expect(result1).toEqual(mockCacheEntry)
    expect(result2).toEqual(mockCacheEntry)

    await redisCache.deleteAllByKeyMatch(cacheKey)
    expect(redisCache.client.del).toHaveBeenCalledTimes(2)
    expect(redisCache.client.del).toHaveBeenNthCalledWith(1, cacheKey)
    expect(redisCache.client.del).toHaveBeenNthCalledWith(2, cacheKey2)

    const updatedResult1 = await redisCache.get(cacheKey)
    const updatedResult2 = await redisCache.get(cacheKey2)
    expect(updatedResult1).toBeNull()
    expect(updatedResult2).toBeNull()
  })
})
