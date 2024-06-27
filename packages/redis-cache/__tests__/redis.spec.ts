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
      scan: jest.fn().mockImplementation(() => ({ cursor: 0, keys: store.keys() }))
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
    expect(redisCache.client.set).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`, JSON.stringify(mockCacheEntry), {})

    const result = await redisCache.get(cacheKey, cacheKey)
    expect(result).toEqual(mockCacheEntry)
    expect(redisCache.client.get).toHaveBeenCalledTimes(1)
    expect(redisCache.client.get).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`)
  })

  it('should delete cache value', async () => {
    await redisCache.set(cacheKey, cacheKey, mockCacheEntry)
    expect(redisCache.client.set).toHaveBeenCalledTimes(1)
    expect(redisCache.client.set).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`, JSON.stringify(mockCacheEntry), {})

    const result = await redisCache.get(cacheKey, cacheKey)
    expect(result).toEqual(mockCacheEntry)
    expect(redisCache.client.get).toHaveBeenCalledTimes(1)
    expect(redisCache.client.get).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`)

    await redisCache.delete(cacheKey, cacheKey)
    const updatedResult = await redisCache.get(cacheKey, cacheKey)
    expect(updatedResult).toBeNull()
    expect(redisCache.client.del).toHaveBeenCalledTimes(1)
    expect(redisCache.client.del).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`)
  })

  it('should delete all cache entries by key match', async () => {
    await redisCache.set(cacheKey, cacheKey, mockCacheEntry)

    const result1 = await redisCache.get(cacheKey, cacheKey)
    expect(result1).toEqual(mockCacheEntry)

    await redisCache.deleteAllByKeyMatch(cacheKey)
    expect(redisCache.client.del).toHaveBeenCalledTimes(1)
    expect(redisCache.client.del).toHaveBeenNthCalledWith(1, `${cacheKey}//${cacheKey}`)

    expect(await redisCache.get(cacheKey, cacheKey)).toBeNull()
  })

  it('should revalidate cache by tag', async () => {
    const mockCacheEntryWithTags = { ...mockCacheEntry, tags: [cacheKey, cacheKey2] }
    await redisCache.set(cacheKey, cacheKey, mockCacheEntryWithTags)

    expect(await redisCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntryWithTags)

    await redisCache.revalidateTag(cacheKey)
    expect(redisCache.client.del).toHaveBeenCalledTimes(1)
    expect(redisCache.client.del).toHaveBeenNthCalledWith(1, `${cacheKey}//${cacheKey}`)

    expect(await redisCache.get(cacheKey, cacheKey)).toBeNull()
  })

  it('should revalidate cache by path', async () => {
    await redisCache.set(cacheKey, cacheKey, mockCacheEntry)

    expect(await redisCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntry)

    await redisCache.revalidateTag(`${NEXT_CACHE_IMPLICIT_TAG_ID}${cacheKey}`)
    expect(redisCache.client.del).toHaveBeenCalledTimes(1)
    expect(redisCache.client.del).toHaveBeenNthCalledWith(1, `${cacheKey}//${cacheKey}`)

    expect(await redisCache.get(cacheKey, cacheKey)).toBeNull()
  })
})
