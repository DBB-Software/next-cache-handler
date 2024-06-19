/* eslint-disable @typescript-eslint/ban-ts-comment */
import { CacheEntry } from '@dbbs/next-cache-handler-common'
import { RedisCache } from '../src'
import { NEXT_CACHE_IMPLICIT_TAG_ID } from 'next/dist/lib/constants'

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
// @ts-ignore
const mockGetKeys = jest.fn().mockImplementation(() => [...store.keys()])
const mockReadKey = jest.fn().mockImplementation((path) => store.get(path))
const mockWriteKey = jest.fn().mockImplementation((path, data) => store.set(path, data))
const mockDeleteKey = jest.fn().mockImplementation((path) => store.delete(path))

jest.mock('redis', () => {
  return {
    createClient: jest.fn().mockReturnValue({
      connect: jest.fn(),
      keys: jest.fn((...params) => mockGetKeys(...params)),
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
    await redisCache.set(cacheKey, cacheKey, mockCacheEntry)
    expect(redisCache.client.set).toHaveBeenCalledTimes(1)
    expect(redisCache.client.set).toHaveBeenCalledWith(cacheKey, JSON.stringify(mockCacheEntry), {})

    const result = await redisCache.get(cacheKey, cacheKey)
    expect(result).toEqual(mockCacheEntry)
    expect(redisCache.client.get).toHaveBeenCalledTimes(1)
    expect(redisCache.client.get).toHaveBeenCalledWith(cacheKey)
  })

  it('should delete cache value', async () => {
    await redisCache.set(cacheKey, cacheKey, mockCacheEntry)
    expect(redisCache.client.set).toHaveBeenCalledTimes(1)
    expect(redisCache.client.set).toHaveBeenCalledWith(cacheKey, JSON.stringify(mockCacheEntry), {})

    const result = await redisCache.get(cacheKey, cacheKey)
    expect(result).toEqual(mockCacheEntry)
    expect(redisCache.client.get).toHaveBeenCalledTimes(1)
    expect(redisCache.client.get).toHaveBeenCalledWith(cacheKey)

    await redisCache.delete(cacheKey, cacheKey)
    const updatedResult = await redisCache.get(cacheKey, cacheKey)
    expect(updatedResult).toBeNull()
    expect(redisCache.client.del).toHaveBeenCalledTimes(1)
    expect(redisCache.client.del).toHaveBeenCalledWith(cacheKey)
  })

  it('should delete all cache entries by key match', async () => {
    await redisCache.set(cacheKey, cacheKey, mockCacheEntry)
    await redisCache.set(cacheKey2, cacheKey2, mockCacheEntry)

    const result1 = await redisCache.get(cacheKey, cacheKey)
    const result2 = await redisCache.get(cacheKey2, cacheKey2)
    expect(result1).toEqual(mockCacheEntry)
    expect(result2).toEqual(mockCacheEntry)

    await redisCache.deleteAllByKeyMatch(cacheKey)
    expect(redisCache.client.del).toHaveBeenCalledTimes(2)
    expect(redisCache.client.del).toHaveBeenNthCalledWith(1, cacheKey)
    expect(redisCache.client.del).toHaveBeenNthCalledWith(2, cacheKey2)

    const updatedResult1 = await redisCache.get(cacheKey, cacheKey)
    const updatedResult2 = await redisCache.get(cacheKey2, cacheKey)
    expect(updatedResult1).toBeNull()
    expect(updatedResult2).toBeNull()
  })

  it('should revalidate cache by tag', async () => {
    const mockCacheEntryWithTags = { ...mockCacheEntry, tags: [cacheKey, cacheKey2] }
    await redisCache.set(cacheKey, cacheKey, mockCacheEntryWithTags)
    await redisCache.set(cacheKey2, cacheKey2, mockCacheEntryWithTags)

    expect(await redisCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntryWithTags)
    expect(await redisCache.get(cacheKey2, cacheKey2)).toEqual(mockCacheEntryWithTags)

    await redisCache.revalidateTag(cacheKey)
    expect(redisCache.client.del).toHaveBeenCalledTimes(2)
    expect(redisCache.client.del).toHaveBeenNthCalledWith(1, cacheKey)
    expect(redisCache.client.del).toHaveBeenNthCalledWith(2, cacheKey2)

    expect(await redisCache.get(cacheKey, cacheKey)).toBeNull()
    expect(await redisCache.get(cacheKey2, cacheKey)).toBeNull()
  })

  it('should revalidate cache by path', async () => {
    await redisCache.set(cacheKey, cacheKey, mockCacheEntry)
    await redisCache.set(cacheKey2, cacheKey2, mockCacheEntry)

    expect(await redisCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntry)
    expect(await redisCache.get(cacheKey2, cacheKey2)).toEqual(mockCacheEntry)

    await redisCache.revalidateTag(`${NEXT_CACHE_IMPLICIT_TAG_ID}${cacheKey}`)
    expect(redisCache.client.del).toHaveBeenCalledTimes(1)
    expect(redisCache.client.del).toHaveBeenNthCalledWith(1, cacheKey)

    expect(await redisCache.get(cacheKey, cacheKey)).toBeNull()
    expect(await redisCache.get(cacheKey2, cacheKey2)).toEqual(mockCacheEntry)

    await redisCache.revalidateTag(`${NEXT_CACHE_IMPLICIT_TAG_ID}${cacheKey2}`)
    expect(redisCache.client.del).toHaveBeenCalledTimes(2)
    expect(redisCache.client.del).toHaveBeenNthCalledWith(2, cacheKey2)
    expect(await redisCache.get(cacheKey2, cacheKey2)).toBeNull()
  })
})
