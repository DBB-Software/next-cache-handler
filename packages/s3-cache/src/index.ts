import { NEXT_CACHE_TAGS_HEADER } from 'next/dist/lib/constants'
import { ListObjectsV2CommandOutput, S3 } from '@aws-sdk/client-s3'
import { getAWSCredentials, type CacheEntry, type CacheStrategy } from '@dbbs/next-cache-handler-common'

const TAG_PREFIX = 'revalidateTag'
const NOT_FOUND_ERROR = ['NotFound', 'NoSuchKey']

export class S3Cache implements CacheStrategy {
  public readonly client: S3
  public readonly bucketName: string

  constructor(bucketName: string) {
    const region = process.env.AWS_REGION
    const profile = process.env.AWS_PROFILE
    this.client = new S3({ region })

    getAWSCredentials({ region, profile }).then((credentials) => {
      this.client.config.credentials = credentials as unknown as S3['config']['credentials']
    })
    this.bucketName = bucketName
  }

  buildTagKeys(tags?: string | string[]) {
    if (!tags || (Array.isArray(tags) && !tags.length)) return ''
    return (Array.isArray(tags) ? tags : tags.split(',')).map((tag, index) => `${TAG_PREFIX}${index}=${tag}`).join('&')
  }

  async get(pageKey: string, cacheKey: string): Promise<CacheEntry | null> {
    if (!this.client) return null

    const pageData = await this.client
      .getObject({
        Bucket: this.bucketName,
        Key: `${pageKey}/${cacheKey}.json`
      })
      .catch((error) => {
        if (NOT_FOUND_ERROR.includes(error.name)) return null
        throw error
      })

    if (!pageData?.Body) return null

    return JSON.parse(await pageData.Body.transformToString('utf-8'))
  }

  async set(pageKey: string, cacheKey: string, data: CacheEntry): Promise<void> {
    const baseInput = {
      Bucket: this.bucketName,
      Key: `${pageKey}/${cacheKey}`
    }

    if (data.value?.kind === 'PAGE') {
      const headersTags = this.buildTagKeys(data.value.headers?.[NEXT_CACHE_TAGS_HEADER]?.toString())
      const input = { ...baseInput, ...(headersTags ? { Tagging: headersTags } : {}) }
      await this.client.putObject({
        ...input,
        Key: `${input.Key}.html`,
        Body: data.value.html,
        ContentType: 'text/html'
      })
      await this.client.putObject({
        ...input,
        Key: `${input.Key}.json`,
        Body: JSON.stringify(data)
      })
      return
    }

    await this.client.putObject({
      ...baseInput,
      Key: `${baseInput.Key}.json`,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
      ...(data.tags?.length ? { Tagging: `${this.buildTagKeys(data.tags)}` } : {})
    })
  }

  async revalidateTag(tag: string): Promise<void> {
    let nextContinuationToken: string | undefined = undefined
    do {
      const { Contents: contents = [], NextContinuationToken: token }: ListObjectsV2CommandOutput =
        await this.client.listObjectsV2({
          Bucket: this.bucketName,
          ContinuationToken: nextContinuationToken
        })
      nextContinuationToken = token

      for (const { Key: key } of contents) {
        if (!key) continue

        const args = { Bucket: this.bucketName, Key: key }
        const { TagSet = [] } = await this.client.getObjectTagging(args)

        const tags = TagSet.filter(({ Key: key }) => key?.startsWith(TAG_PREFIX)).map(({ Value: tags }) => tags || '')

        if (tags.includes(tag)) {
          await this.client.deleteObject(args)
        }
      }
    } while (nextContinuationToken)
    return
  }

  async delete(pageKey: string, cacheKey: string): Promise<void> {
    await this.client.deleteObject({ Bucket: this.bucketName, Key: `${pageKey}/${cacheKey}.json` }).catch((error) => {
      if (NOT_FOUND_ERROR.includes(error.name)) return null
      throw error
    })
    await this.client.deleteObject({ Bucket: this.bucketName, Key: `${pageKey}/${cacheKey}.html` }).catch((error) => {
      if (NOT_FOUND_ERROR.includes(error.name)) return null
      throw error
    })
  }

  async deleteAllByKeyMatch(pageKey: string): Promise<void> {
    let nextContinuationToken: string | undefined = undefined
    do {
      const { Contents: contents = [], NextContinuationToken: token }: ListObjectsV2CommandOutput =
        await this.client.listObjectsV2({
          Bucket: this.bucketName,
          ContinuationToken: nextContinuationToken,
          Prefix: `${pageKey}/`,
          Delimiter: '/'
        })
      nextContinuationToken = token

      for (const { Key: key } of contents) {
        if (!key) continue
        if (key.endsWith('.json') || key.endsWith('.html')) {
          await this.client.deleteObject({ Bucket: this.bucketName, Key: key })
        }
      }
    } while (nextContinuationToken)
    return
  }
}
