import { RedisCache } from '../src/cacheStrategy/redis'
import { mockCacheEntry } from './mocks'

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
      del: jest.fn((...params) => mockDeleteKey(...params))
    })
  }
})

const redisCache = new RedisCache({ url: 'mock-url' })
const cacheKey = 'test'

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
})
