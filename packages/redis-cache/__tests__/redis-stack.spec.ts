import { mockCacheEntry, mockDeleteKey, mockReadKey, mockScan, mockWriteKey } from './mocks'
import { CacheEntry } from '@dbbs/next-cache-handler-core'
import { RedisAdapter, RedisCache } from '../src'
import { RedisStack } from '../lib/RedisStack'

const SEPARATOR = ','
jest.mock('redis', () => {
  return {
    createClient: jest.fn().mockReturnValue({
      connect: jest.fn(() => Promise.resolve()),
      unlink: jest.fn((...params) => mockDeleteKey(...params)),
      json: {
        get: jest.fn((...params) => mockReadKey(...params)),
        set: jest.fn((...params) => mockWriteKey(params?.[0], params?.[2]))
      },
      scan: jest.fn((...params) => mockScan(...params)),
      ft: {
        search: jest.fn(() => ({ documents: [{ id: mockedDocumentId }] })),
        _list: jest.fn(() => Promise.resolve([])),
        create: jest.fn(() => Promise.resolve())
      }
    }),
    SchemaFieldTypes: {
      TAG: 1
    }
  }
})

const mockedCacheEntry: CacheEntry = {
  ...mockCacheEntry,
  value: {
    ...mockCacheEntry.value,
    headers: {
      NEXT_CACHE_TAGS_HEADER: ['level-page']
    }
  } as never,
  tags: ['level']
}
const mockedDocumentId = '123'
const cacheKey = 'test'
const cacheKey2 = 'test-2'

const redisCache = new RedisCache({ url: 'mock-url' }, RedisAdapter.RedisStack)
const redisClient = (redisCache.redisAdapter as RedisStack).client
describe('RedisCache', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  afterAll(() => {
    jest.restoreAllMocks()
  })
  it('should set and read the cache', async () => {
    await redisCache.set(cacheKey, cacheKey, mockedCacheEntry)
    expect(redisClient.json.set).toHaveBeenCalledTimes(1)
    expect(redisClient.json.set).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`, '.', {
      ...mockedCacheEntry,
      currentCacheKey: cacheKey,
      generalTags: mockedCacheEntry?.tags?.join(SEPARATOR)
    })

    const result = await redisCache.get(cacheKey, cacheKey)
    expect(result).toEqual(mockedCacheEntry)
    expect(redisClient.json.get).toHaveBeenCalledTimes(1)
    expect(redisClient.json.get).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`)
  })

  it('should delete cache value', async () => {
    await redisCache.set(cacheKey, cacheKey, mockedCacheEntry)
    expect(redisClient.json.set).toHaveBeenCalledTimes(1)
    expect(redisClient.json.set).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`, '.', {
      ...mockedCacheEntry,
      currentCacheKey: cacheKey,
      generalTags: mockedCacheEntry?.tags?.join(SEPARATOR)
    })

    const result = await redisCache.get(cacheKey, cacheKey)
    expect(result).toEqual(mockedCacheEntry)
    expect(redisClient.json.get).toHaveBeenCalledTimes(1)
    expect(redisClient.json.get).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`)

    await redisCache.delete(cacheKey, cacheKey)
    const updatedResult = await redisCache.get(cacheKey, cacheKey)
    expect(updatedResult).toBeNull()
    expect(redisClient.unlink).toHaveBeenCalledTimes(1)
    expect(redisClient.unlink).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`)
  })

  it('should delete all cache entries by key match', async () => {
    await redisCache.set(cacheKey, cacheKey, mockedCacheEntry)

    const result1 = await redisCache.get(cacheKey, cacheKey)
    expect(result1).toEqual(mockedCacheEntry)

    await redisCache.deleteAllByKeyMatch(cacheKey, [])
    expect(redisClient.unlink).toHaveBeenCalledTimes(1)
    expect(redisClient.unlink).toHaveBeenNthCalledWith(1, [`${cacheKey}//${cacheKey}`])

    expect(await redisCache.get(cacheKey, cacheKey)).toBeNull()
  })

  it('should revalidate cache by tag', async () => {
    const mockCacheEntryWithTags = { ...mockedCacheEntry, tags: [cacheKey, cacheKey2] }
    await redisCache.set(cacheKey, cacheKey, mockCacheEntryWithTags)

    expect(await redisCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntryWithTags)

    await redisCache.revalidateTag(cacheKey, [])
    expect(redisClient.ft.search).toHaveBeenCalledTimes(1)
    expect(redisClient.ft.search).toHaveBeenNthCalledWith(1, 'idx:revalidateByTag', `@tag:{${cacheKey}}`, {
      LIMIT: { from: 0, size: 100 }
    })
    expect(redisClient.unlink).toHaveBeenCalledTimes(1)
    expect(redisClient.unlink).toHaveBeenNthCalledWith(1, [mockedDocumentId])
  })

  it('should revalidate cache by path', async () => {
    await redisCache.set(cacheKey, cacheKey, mockedCacheEntry)

    expect(await redisCache.get(cacheKey, cacheKey)).toEqual(mockedCacheEntry)

    await redisCache.deleteAllByKeyMatch(cacheKey, [])
    expect(redisClient.unlink).toHaveBeenCalledTimes(1)
    expect(redisClient.unlink).toHaveBeenNthCalledWith(1, [`${cacheKey}//${cacheKey}`])

    expect(await redisCache.get(cacheKey, cacheKey)).toBeNull()
  })
})
