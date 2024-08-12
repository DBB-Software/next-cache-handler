import { FileSystemCache } from '../src/'
import { mockCacheEntry, mockCacheStrategyContext } from './mocks'

const fileSystemCache = new FileSystemCache()
const cacheKey = 'test'
const cacheKey2 = 'test-2'

const cacheFilePath = `${mockCacheStrategyContext.serverCacheDirPath}/${cacheKey}/${cacheKey}.json`

const store = new Map()
const mockReadFile = jest.fn().mockImplementation((path) => store.get(path))
const mockWriteFile = jest.fn().mockImplementation((path, data) => store.set(path, data))
const mockRm = jest.fn().mockImplementation((path) => {
  ;[...store.keys()].filter((key) => key.startsWith(path)).forEach((path) => store.delete(path))
})

const mockReaddir = jest.fn().mockImplementation((path: string, option) =>
  [...store.keys()].map((k) => {
    if (option) {
      const name = k.replace(`${path}/`, '').split('/')[0]
      return { path, name, isDirectory: () => !name?.endsWith('.json') }
    }
    return k.replace(`${mockCacheStrategyContext.serverCacheDirPath}/`, '')
  })
)
const mockExistsSync = jest.fn().mockImplementation(() => true)

jest.mock('node:fs/promises', () => {
  return {
    readFile: jest.fn((...params) => mockReadFile(...params)),
    writeFile: jest.fn((...params) => mockWriteFile(...params)),
    rm: jest.fn((...params) => mockRm(...params)),
    readdir: jest.fn((...params) => mockReaddir(...params))
  }
})
jest.mock('node:fs', () => {
  return {
    existsSync: jest.fn((...params) => mockExistsSync(...params))
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
    await fileSystemCache.set(cacheKey, cacheKey, mockCacheEntry, mockCacheStrategyContext)
    expect(mockWriteFile).toHaveBeenCalledTimes(1)
    expect(mockWriteFile).toHaveBeenCalledWith(cacheFilePath, JSON.stringify(mockCacheEntry))

    const result = await fileSystemCache.get(cacheKey, cacheKey, mockCacheStrategyContext)
    expect(result).toEqual(mockCacheEntry)
    expect(mockReadFile).toHaveBeenCalledTimes(1)
    expect(mockReadFile).toHaveBeenCalledWith(cacheFilePath, 'utf-8')
  })

  it('should delete cache value', async () => {
    await fileSystemCache.set(cacheKey, cacheKey, mockCacheEntry, mockCacheStrategyContext)
    expect(mockWriteFile).toHaveBeenCalledTimes(1)
    expect(mockWriteFile).toHaveBeenCalledWith(cacheFilePath, JSON.stringify(mockCacheEntry))

    const result = await fileSystemCache.get(cacheKey, cacheKey, mockCacheStrategyContext)
    expect(result).toEqual(mockCacheEntry)
    expect(mockReadFile).toHaveBeenCalledTimes(1)
    expect(mockReadFile).toHaveBeenCalledWith(cacheFilePath, 'utf-8')

    await fileSystemCache.delete(cacheKey, cacheKey, mockCacheStrategyContext)
    const updatedResult = await fileSystemCache.get(cacheKey, cacheKey, mockCacheStrategyContext)
    expect(updatedResult).toBeNull()
    expect(mockRm).toHaveBeenCalledTimes(1)
    expect(mockRm).toHaveBeenCalledWith(cacheFilePath)
  })

  it('should delete all cache entries by key match', async () => {
    await fileSystemCache.set(cacheKey, cacheKey, mockCacheEntry, mockCacheStrategyContext)
    await fileSystemCache.set(cacheKey2, cacheKey2, mockCacheEntry, mockCacheStrategyContext)

    const result1 = await fileSystemCache.get(cacheKey, cacheKey, mockCacheStrategyContext)
    const result2 = await fileSystemCache.get(cacheKey2, cacheKey2, mockCacheStrategyContext)
    expect(result1).toEqual(mockCacheEntry)
    expect(result2).toEqual(mockCacheEntry)

    await fileSystemCache.deleteAllByKeyMatch(cacheKey, [], mockCacheStrategyContext)
    expect(mockRm).toHaveBeenCalledTimes(1)
    expect(mockRm).toHaveBeenNthCalledWith(1, cacheFilePath)

    expect(await fileSystemCache.get(cacheKey, cacheKey, mockCacheStrategyContext)).toBeNull()
    expect(await fileSystemCache.get(cacheKey2, cacheKey2, mockCacheStrategyContext)).toEqual(mockCacheEntry)

    await fileSystemCache.deleteAllByKeyMatch(cacheKey2, [], mockCacheStrategyContext)
    expect(await fileSystemCache.get(cacheKey2, cacheKey2, mockCacheStrategyContext)).toBeNull()
  })

  it('should revalidate cache by tag', async () => {
    const mockCacheEntryWithTags = { ...mockCacheEntry, tags: [cacheKey] }
    await fileSystemCache.set(cacheKey, cacheKey, mockCacheEntryWithTags, mockCacheStrategyContext)
    expect(mockWriteFile).toHaveBeenCalledTimes(1)
    expect(mockWriteFile).toHaveBeenCalledWith(cacheFilePath, JSON.stringify(mockCacheEntryWithTags))

    const result = await fileSystemCache.get(cacheKey, cacheKey, mockCacheStrategyContext)
    expect(result).toEqual(mockCacheEntryWithTags)
    expect(mockReadFile).toHaveBeenCalledTimes(1)
    expect(mockReadFile).toHaveBeenCalledWith(cacheFilePath, 'utf-8')

    await fileSystemCache.revalidateTag(cacheKey, [], mockCacheStrategyContext)
    const updatedResult = await fileSystemCache.get(cacheKey, cacheKey, mockCacheStrategyContext)
    expect(updatedResult).toBeNull()
  })

  it('should revalidate cache by path', async () => {
    await fileSystemCache.set(cacheKey, cacheKey, mockCacheEntry, mockCacheStrategyContext)
    expect(mockWriteFile).toHaveBeenCalledTimes(1)
    expect(mockWriteFile).toHaveBeenCalledWith(cacheFilePath, JSON.stringify(mockCacheEntry))

    const result = await fileSystemCache.get(cacheKey, cacheKey, mockCacheStrategyContext)
    expect(result).toEqual(mockCacheEntry)
    expect(mockReadFile).toHaveBeenCalledTimes(1)
    expect(mockReadFile).toHaveBeenCalledWith(cacheFilePath, 'utf-8')

    await fileSystemCache.deleteAllByKeyMatch(cacheKey, [], mockCacheStrategyContext)
    const updatedResult = await fileSystemCache.get(cacheKey, cacheKey, mockCacheStrategyContext)
    expect(updatedResult).toBeNull()
  })
})
