import { RedisStack } from '../src/RedisStack'
import { mockCacheEntry, mockDeleteKey, mockReadKey, mockScan, mockWriteKey } from './mocks'
import { CacheEntry } from '@dbbs/next-cache-handler-common'
jest.mock('redis', () => {
  return {
    createClient: jest.fn().mockReturnValue({
      connect: jest.fn(),
      unlink: jest.fn((...params) => mockDeleteKey(...params)),
      json: {
        get: jest.fn((...params) => mockReadKey(...params)),
        set: jest.fn((...params) => mockWriteKey(params?.[0], params?.[2]))
      },
      scan: jest.fn((...params) => mockScan(...params)),
      ft: {
        search: jest.fn(() => ({ documents: [{ id: mockedDocumentId }] }))
      }
    })
  }
})

const mockedCacheEntry: CacheEntry = {
  ...mockCacheEntry,
  value: {
    ...mockCacheEntry.value,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    headers: ['level-page']
  },
  tags: ['level']
}
const mockedDocumentId = '123'
const cacheKey = 'test'
const cacheKey2 = 'test-2'

const redisCache = new RedisStack({ url: 'mock-url' })
describe('RedisCache', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  afterAll(() => {
    jest.restoreAllMocks()
  })
  it('should set and read the cache', async () => {
    await redisCache.set(cacheKey, cacheKey, mockedCacheEntry)
    expect(redisCache.client.json.set).toHaveBeenCalledTimes(1)
    expect(redisCache.client.json.set).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`, '.', mockedCacheEntry)

    const result = await redisCache.get(cacheKey, cacheKey)
    expect(result).toEqual(mockedCacheEntry)
    expect(redisCache.client.json.get).toHaveBeenCalledTimes(1)
    expect(redisCache.client.json.get).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`)
  })

  it('should delete cache value', async () => {
    await redisCache.set(cacheKey, cacheKey, mockedCacheEntry)
    expect(redisCache.client.json.set).toHaveBeenCalledTimes(1)
    expect(redisCache.client.json.set).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`, '.', mockedCacheEntry)

    const result = await redisCache.get(cacheKey, cacheKey)
    expect(result).toEqual(mockedCacheEntry)
    expect(redisCache.client.json.get).toHaveBeenCalledTimes(1)
    expect(redisCache.client.json.get).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`)

    await redisCache.delete(cacheKey, cacheKey)
    const updatedResult = await redisCache.get(cacheKey, cacheKey)
    expect(updatedResult).toBeNull()
    expect(redisCache.client.unlink).toHaveBeenCalledTimes(1)
    expect(redisCache.client.unlink).toHaveBeenCalledWith(`${cacheKey}//${cacheKey}`)
  })

  it('should delete all cache entries by key match', async () => {
    await redisCache.set(cacheKey, cacheKey, mockedCacheEntry)

    const result1 = await redisCache.get(cacheKey, cacheKey)
    expect(result1).toEqual(mockedCacheEntry)

    await redisCache.deleteAllByKeyMatch(cacheKey)
    expect(redisCache.client.unlink).toHaveBeenCalledTimes(1)
    expect(redisCache.client.unlink).toHaveBeenNthCalledWith(1, [`${cacheKey}//${cacheKey}`])

    expect(await redisCache.get(cacheKey, cacheKey)).toBeNull()
  })

  it('should revalidate cache by tag', async () => {
    const mockCacheEntryWithTags = { ...mockedCacheEntry, tags: [cacheKey, cacheKey2] }
    await redisCache.set(cacheKey, cacheKey, mockCacheEntryWithTags)

    expect(await redisCache.get(cacheKey, cacheKey)).toEqual(mockCacheEntryWithTags)

    await redisCache.revalidateTag(cacheKey)
    expect(redisCache.client.ft.search).toHaveBeenCalledTimes(1)
    expect(redisCache.client.ft.search).toHaveBeenNthCalledWith(1, 'idx:tags', `@tag:"${cacheKey}"`, {
      LIMIT: { from: 0, size: 100 }
    })
    expect(redisCache.client.unlink).toHaveBeenCalledTimes(1)
    expect(redisCache.client.unlink).toHaveBeenNthCalledWith(1, [mockedDocumentId])
  })

  it('should revalidate cache by path', async () => {
    await redisCache.set(cacheKey, cacheKey, mockedCacheEntry)

    expect(await redisCache.get(cacheKey, cacheKey)).toEqual(mockedCacheEntry)

    await redisCache.deleteAllByKeyMatch(cacheKey)
    expect(redisCache.client.unlink).toHaveBeenCalledTimes(1)
    expect(redisCache.client.unlink).toHaveBeenNthCalledWith(1, [`${cacheKey}//${cacheKey}`])

    expect(await redisCache.get(cacheKey, cacheKey)).toBeNull()
  })
})
