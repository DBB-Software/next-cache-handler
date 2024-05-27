import { FileSystemCache } from '../src/'
import { mockCacheEntry, mockCacheStrategyContext } from './mocks'

const fileSystemCache = new FileSystemCache()
const cacheKey = 'test'
const cacheKey2 = 'test-2'

const cacheFilePath = `${mockCacheStrategyContext.serverCacheDirPath}/${cacheKey}.json`
const cacheFile2Path = `${mockCacheStrategyContext.serverCacheDirPath}/${cacheKey2}.json`

const store = new Map()
const mockReadFile = jest.fn().mockImplementation((path) => store.get(path))
const mockWriteFile = jest.fn().mockImplementation((path, data) => store.set(path, data))
const mockRm = jest.fn().mockImplementation((path) => store.delete(path))
const mockReaddir = jest
  .fn()
  .mockImplementation(() =>
    [...store.keys()].map((k) => k.replace(`${mockCacheStrategyContext.serverCacheDirPath}/`, ''))
  )

jest.mock('fs/promises', () => {
  return {
    readFile: jest.fn((...params) => mockReadFile(...params)),
    writeFile: jest.fn((...params) => mockWriteFile(...params)),
    rm: jest.fn((...params) => mockRm(...params)),
    readdir: jest.fn((...params) => mockReaddir(...params))
  }
})

describe('FileSystemCache', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  afterAll(() => {
    jest.restoreAllMocks()
  })
  it('should set and read the cache', async () => {
    await fileSystemCache.set(cacheKey, mockCacheEntry, mockCacheStrategyContext)
    expect(mockWriteFile).toHaveBeenCalledTimes(1)
    expect(mockWriteFile).toHaveBeenCalledWith(cacheFilePath, JSON.stringify(mockCacheEntry))

    const result = await fileSystemCache.get(cacheKey, mockCacheStrategyContext)
    expect(result).toEqual(mockCacheEntry)
    expect(mockReadFile).toHaveBeenCalledTimes(1)
    expect(mockReadFile).toHaveBeenCalledWith(cacheFilePath, { encoding: 'utf-8' })
  })

  it('should delete cache value', async () => {
    await fileSystemCache.set(cacheKey, mockCacheEntry, mockCacheStrategyContext)
    expect(mockWriteFile).toHaveBeenCalledTimes(1)
    expect(mockWriteFile).toHaveBeenCalledWith(cacheFilePath, JSON.stringify(mockCacheEntry))

    const result = await fileSystemCache.get(cacheKey, mockCacheStrategyContext)
    expect(result).toEqual(mockCacheEntry)
    expect(mockReadFile).toHaveBeenCalledTimes(1)
    expect(mockReadFile).toHaveBeenCalledWith(cacheFilePath, { encoding: 'utf-8' })

    await fileSystemCache.delete(cacheKey, mockCacheStrategyContext)
    const updatedResult = await fileSystemCache.get(cacheKey, mockCacheStrategyContext)
    expect(updatedResult).toBeNull()
    expect(mockRm).toHaveBeenCalledTimes(1)
    expect(mockRm).toHaveBeenCalledWith(cacheFilePath)
  })

  it('should delete all cache entries by key match', async () => {
    await fileSystemCache.set(cacheKey, mockCacheEntry, mockCacheStrategyContext)
    await fileSystemCache.set(cacheKey2, mockCacheEntry, mockCacheStrategyContext)

    const result1 = await fileSystemCache.get(cacheKey, mockCacheStrategyContext)
    const result2 = await fileSystemCache.get(cacheKey2, mockCacheStrategyContext)
    expect(result1).toEqual(mockCacheEntry)
    expect(result2).toEqual(mockCacheEntry)

    await fileSystemCache.deleteAllByKeyMatch(cacheKey, mockCacheStrategyContext)
    expect(mockRm).toHaveBeenCalledTimes(2)
    expect(mockRm).toHaveBeenNthCalledWith(1, cacheFilePath)
    expect(mockRm).toHaveBeenNthCalledWith(2, cacheFile2Path)

    const updatedResult1 = await fileSystemCache.get(cacheKey, mockCacheStrategyContext)
    const updatedResult2 = await fileSystemCache.get(cacheKey2, mockCacheStrategyContext)
    expect(updatedResult1).toBeNull()
    expect(updatedResult2).toBeNull()
  })
})
