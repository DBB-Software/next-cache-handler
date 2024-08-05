import { RedisCache } from '../src'
import { mockCacheEntry, mockDeleteKey, mockGetKeys, mockReadKey, mockScan, mockWriteKey } from './mocks'
jest.mock('redis', () => {
  return {
    createClient: jest.fn().mockReturnValue({
      connect: jest.fn(),
      keys: jest.fn((...params) => mockGetKeys(...params)),
      get: jest.fn((...params) => mockReadKey(...params)),
      set: jest.fn((...params) => mockWriteKey(...params)),
      del: jest.fn((...params) => mockDeleteKey(...params)),
      scan: jest.fn((...params) => mockScan(...params)),
      unlink: jest.fn((...params) => mockDeleteKey(...params))
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
    await redisCache.set(cacheKey, cacheKey, mockCacheEntry)
    expect(redisCache.redisAdapter.client.set).toHaveBeenCalledTimes(1)
    expect(redisCache.redisAdapter.client.set).toHaveBeenCalledWith(
      `${cacheKey}//${cacheKey}`,
      JSON.stringify(mockCacheEntry),
      {}
    )

    const result = await redisCache.get(cacheKey, cacheKey)
    expect(result).toEqual(mockCacheEntry)
    expect(redisCache.redisAdapter.client.get).toHaveBeenCalledTimes(1)
    expect(redisCache.redisAdapter.client.get).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`)
  })

  it('should delete cache value', async () => {
    await redisCache.set(cacheKey, cacheKey, mockCacheEntry)
    expect(redisCache.redisAdapter.client.set).toHaveBeenCalledTimes(1)
    expect(redisCache.redisAdapter.client.set).toHaveBeenCalledWith(
      `${cacheKey}//${cacheKey}`,
      JSON.stringify(mockCacheEntry),
      {}
    )

    const result = await redisCache.get(cacheKey, cacheKey)
    expect(result).toEqual(mockCacheEntry)
    expect(redisCache.redisAdapter.client.get).toHaveBeenCalledTimes(1)
    expect(redisCache.redisAdapter.client.get).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`)

    await redisCache.delete(cacheKey, cacheKey)
    const updatedResult = await redisCache.get(cacheKey, cacheKey)
    expect(updatedResult).toBeNull()
    expect(redisCache.redisAdapter.client.unlink).toHaveBeenCalledTimes(1)
    expect(redisCache.redisAdapter.client.unlink).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`)
  })

  it('should delete all cache entries by key match', async () => {
    await redisCache.set(cacheKey, cacheKey, mockCacheEntry)

    const result1 = await redisCache.get(cacheKey, cacheKey)
    expect(result1).toEqual(mockCacheEntry)

    await redisCache.deleteAllByKeyMatch(cacheKey, undefined, [])
    expect(redisCache.redisAdapter.client.unlink).toHaveBeenCalledTimes(1)
    expect(redisCache.redisAdapter.client.unlink).toHaveBeenNthCalledWith(1, [`${cacheKey}//${cacheKey}`])

    expect(await redisCache.get(cacheKey, cacheKey)).toBeNull()
  })

  it('should revalidate cache by tag', async () => {
    const mockCacheEntryWithTags = { ...mockCacheEntry, tags: [cacheKey, cacheKey2] }
    await redisCache.set(cacheKey, cacheKey, mockCacheEntryWithTags)

    expect(await redisCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntryWithTags)

    await redisCache.revalidateTag(cacheKey, undefined, [])
    expect(redisCache.redisAdapter.client.unlink).toHaveBeenCalledTimes(1)
    expect(redisCache.redisAdapter.client.unlink).toHaveBeenNthCalledWith(1, [`${cacheKey}//${cacheKey}`])

    expect(await redisCache.get(cacheKey, cacheKey)).toBeNull()
  })

  it('should revalidate cache by path', async () => {
    await redisCache.set(cacheKey, cacheKey, mockCacheEntry)

    expect(await redisCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntry)

    await redisCache.deleteAllByKeyMatch(cacheKey, undefined, [])
    expect(redisCache.redisAdapter.client.unlink).toHaveBeenCalledTimes(1)
    expect(redisCache.redisAdapter.client.unlink).toHaveBeenNthCalledWith(1, [`${cacheKey}//${cacheKey}`])

    expect(await redisCache.get(cacheKey, cacheKey)).toBeNull()
  })
})
