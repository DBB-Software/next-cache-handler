import { RedisCache } from '../src/cacheStrategy/redis'
import { mockPageData, mockHandlerMethodContext } from './mocks'

const store = new Map()
const mockReadKey = jest.fn().mockImplementation((path) => store.get(path))
const mockWriteKey = jest.fn().mockImplementation((path, data) => store.set(path, data))
const mockDeleteKey = jest.fn().mockImplementation((path) => store.delete(path))

jest.mock('redis', () => {
  return {
    createClient: jest.fn().mockReturnValue({
      on: jest.fn(() => ({ connect: jest.fn() })),
      get: jest.fn((...params) => mockReadKey(...params)),
      set: jest.fn((...params) => mockWriteKey(...params)),
      del: jest.fn((...params) => mockDeleteKey(...params))
    })
  }
})

global.console.warn = jest.fn()

const memoryCache = new RedisCache({ url: 'mock-url' })
const cacheKey = 'test'

describe('RedisCache', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  afterAll(() => {
    jest.restoreAllMocks()
  })
  it('should set and read the cache', async () => {
    await memoryCache.set(cacheKey, mockPageData, mockHandlerMethodContext)

    const result = await memoryCache.get(cacheKey)
    expect(result?.value).toEqual(mockPageData)
  })

  it('should clear cache for given key', async () => {
    await memoryCache.set(cacheKey, mockPageData, mockHandlerMethodContext)
    const result = await memoryCache.get(cacheKey)
    expect(result?.value).toEqual(mockPageData)

    await memoryCache.set(cacheKey, null, mockHandlerMethodContext)
    expect(await memoryCache.get(cacheKey)).toBeNull()
  })

  it('should fail to read cache value', async () => {
    mockReadKey.mockRejectedValueOnce('Error to read')
    expect(await memoryCache.get(cacheKey)).toBeNull()

    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(`Failed to get page data from redis for ${cacheKey}`, 'Error to read')
  })

  it('should fail to write cache value', async () => {
    mockWriteKey.mockRejectedValueOnce('Error to write')
    await memoryCache.set(cacheKey, mockPageData, mockHandlerMethodContext)

    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(`Failed to set page data to redis for ${cacheKey}`, 'Error to write')
  })

  it('should fail to clear cache value', async () => {
    mockDeleteKey.mockRejectedValueOnce('Error to delete')
    await memoryCache.set(cacheKey, null, mockHandlerMethodContext)

    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(
      `Failed to delete page data from redis for ${cacheKey}`,
      'Error to delete'
    )
  })
})
