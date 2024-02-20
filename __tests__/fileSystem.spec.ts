import { FileSystemCache } from '../src/cacheStrategy/fileSystem'
import { mockPageData, mockHandlerMethodContext } from './mocks'

const memoryCache = new FileSystemCache()
const cacheKey = 'test'

const store = new Map()
const mockReadFile = jest.fn().mockImplementation((path) => store.get(path))
const mockWriteFile = jest.fn().mockImplementation((path, data) => store.set(path, data))
const mockUnlink = jest.fn().mockImplementation((path) => store.delete(path))

jest.mock('fs/promises', () => {
  return {
    readFile: jest.fn((...params) => mockReadFile(...params)),
    writeFile: jest.fn((...params) => mockWriteFile(...params)),
    unlink: jest.fn((...params) => mockUnlink(...params))
  }
})

global.console.warn = jest.fn()

describe('FileSystemCache', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  afterAll(() => {
    jest.restoreAllMocks()
  })
  it('should set and read the cache', async () => {
    await memoryCache.set(cacheKey, mockPageData, mockHandlerMethodContext)

    const result = await memoryCache.get(cacheKey, mockHandlerMethodContext)
    expect(result?.value).toEqual(mockPageData)
  })

  it('should clear cache for given key', async () => {
    await memoryCache.set(cacheKey, mockPageData, mockHandlerMethodContext)
    const result = await memoryCache.get(cacheKey, mockHandlerMethodContext)
    expect(result?.value).toEqual(mockPageData)

    await memoryCache.set(cacheKey, null, mockHandlerMethodContext)
    expect(await memoryCache.get(cacheKey, mockHandlerMethodContext)).toBeNull()
  })

  it('should fail to read cache value', async () => {
    mockReadFile.mockRejectedValueOnce('Error to read')
    expect(await memoryCache.get(cacheKey, mockHandlerMethodContext)).toBeNull()

    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(`Failed to read cache for ${cacheKey}`, 'Error to read')
  })

  it('should fail to write cache value', async () => {
    mockWriteFile.mockRejectedValueOnce('Error to write')
    await memoryCache.set(cacheKey, mockPageData, mockHandlerMethodContext)

    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(`Failed to set cache for ${cacheKey}`, 'Error to write')
  })

  it('should fail to clear cache value', async () => {
    mockUnlink.mockRejectedValueOnce('Error to delete')
    await memoryCache.set(cacheKey, null, mockHandlerMethodContext)

    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(`Failed to delete cache for ${cacheKey}`, 'Error to delete')
  })
})
