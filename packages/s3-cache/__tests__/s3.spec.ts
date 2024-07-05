import { CacheEntry } from '@dbbs/next-cache-handler-common'
import { S3Cache } from '../src'

const mockHtmlPage = '<p>My Page</p>'

export const mockCacheEntry: CacheEntry = {
  value: {
    pageData: {},
    html: mockHtmlPage,
    kind: 'PAGE',
    postponed: undefined,
    headers: undefined,
    status: 200
  },
  lastModified: 100000
}

const store = new Map()
const mockGetObject = jest.fn().mockImplementation(async ({ Key }) => {
  const res = store.get(Key)
  return res
    ? { Body: { transformToString: () => res.Body }, Metadata: res.Metadata }
    : { Body: undefined, Metadata: undefined }
})
const mockPutObject = jest
  .fn()
  .mockImplementation(async ({ Key, Body, Metadata }) => store.set(Key, { Body, Metadata }))
const mockDeleteObject = jest.fn().mockImplementation(async ({ Key }) => store.delete(Key))
const mockGetObjectList = jest
  .fn()
  .mockImplementation(async () => ({ Contents: [...store.keys()].map((key) => ({ Key: key })) }))

jest.mock('@dbbs/next-cache-handler-common', () => ({
  ...jest.requireActual('@dbbs/next-cache-handler-common'),
  getAWSCredentials: jest.fn().mockResolvedValue({
    accessKeyId: 'test',
    secretAccessKey: 'test'
  })
}))

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3: jest.fn().mockReturnValue({
      getObject: jest.fn((...params) => mockGetObject(...params)),
      putObject: jest.fn((...params) => mockPutObject(...params)),
      deleteObject: jest.fn((...params) => mockDeleteObject(...params)),
      listObjectsV2: jest.fn((...params) => mockGetObjectList(...params)),
      config: {}
    })
  }
})

const mockBucketName = 'test-bucket'
const cacheKey = 'test'
const s3Cache = new S3Cache(mockBucketName)

describe('S3Cache', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  afterAll(() => {
    jest.restoreAllMocks()
  })

  it('should set and read the cache', async () => {
    await s3Cache.set(cacheKey, cacheKey, mockCacheEntry)
    expect(s3Cache.client.putObject).toHaveBeenCalledTimes(2)
    expect(s3Cache.client.putObject).toHaveBeenNthCalledWith(1, {
      Bucket: mockBucketName,
      Key: `${cacheKey}/${cacheKey}.html`,
      Body: mockHtmlPage,
      ContentType: 'text/html'
    })
    expect(s3Cache.client.putObject).toHaveBeenNthCalledWith(2, {
      Bucket: mockBucketName,
      Key: `${cacheKey}/${cacheKey}.json`,
      Body: JSON.stringify(mockCacheEntry),
      ContentType: 'application/json'
    })

    const result = await s3Cache.get(cacheKey, cacheKey)
    expect(result).toEqual(mockCacheEntry)
    expect(s3Cache.client.getObject).toHaveBeenCalledTimes(1)
    expect(s3Cache.client.getObject).toHaveBeenCalledWith({
      Bucket: mockBucketName,
      Key: `${cacheKey}/${cacheKey}.json`
    })
  })

  it('should delete cache value', async () => {
    await s3Cache.set(cacheKey, cacheKey, mockCacheEntry)
    expect(s3Cache.client.putObject).toHaveBeenCalledTimes(2)
    expect(s3Cache.client.putObject).toHaveBeenNthCalledWith(1, {
      Bucket: mockBucketName,
      Key: `${cacheKey}/${cacheKey}.html`,
      Body: mockHtmlPage,
      ContentType: 'text/html'
    })
    expect(s3Cache.client.putObject).toHaveBeenNthCalledWith(2, {
      Bucket: mockBucketName,
      Key: `${cacheKey}/${cacheKey}.json`,
      Body: JSON.stringify(mockCacheEntry),
      ContentType: 'application/json'
    })

    const result = await s3Cache.get(cacheKey, cacheKey)
    expect(result).toEqual(mockCacheEntry)
    expect(s3Cache.client.getObject).toHaveBeenCalledTimes(1)
    expect(s3Cache.client.getObject).toHaveBeenCalledWith({
      Bucket: mockBucketName,
      Key: `${cacheKey}/${cacheKey}.json`
    })

    await s3Cache.delete(cacheKey, cacheKey)
    const updatedResult = await s3Cache.get(cacheKey, cacheKey)
    expect(updatedResult).toBeNull()
    expect(s3Cache.client.deleteObject).toHaveBeenCalledTimes(2)
    expect(s3Cache.client.deleteObject).toHaveBeenNthCalledWith(1, {
      Bucket: mockBucketName,
      Key: `${cacheKey}/${cacheKey}.json`
    })
    expect(s3Cache.client.deleteObject).toHaveBeenNthCalledWith(2, {
      Bucket: mockBucketName,
      Key: `${cacheKey}/${cacheKey}.html`
    })
  })

  it('should revalidate cache by path', async () => {
    await s3Cache.set(cacheKey, cacheKey, mockCacheEntry)

    expect(await s3Cache.get(cacheKey, cacheKey)).toEqual(mockCacheEntry)

    await s3Cache.deleteAllByKeyMatch(cacheKey)
    expect(await s3Cache.get(cacheKey, cacheKey)).toBeNull()
  })
})
