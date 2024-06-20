import { NEXT_CACHE_IMPLICIT_TAG_ID } from 'next/dist/lib/constants'
import { ListObjectsV2CommandOutput, S3 } from '@aws-sdk/client-s3'
import { getAWSCredentials, type CacheEntry, type CacheStrategy } from '@dbbs/next-cache-handler-common'

const TAGS_SEPARATOR = ','

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

  removeSlashFromStart(value: string) {
    return value.replace('/', '')
  }

  async get(pageKey: string, cacheKey: string): Promise<CacheEntry | null> {
    if (!this.client) return null

    const pageData = await this.client.getObject({
      Bucket: this.bucketName,
      Key: `${this.removeSlashFromStart(pageKey)}/${cacheKey}.json`
    })

    if (!pageData.Body) return null

    return JSON.parse(await pageData.Body.transformToString('utf-8'))
  }

  async set(pageKey: string, cacheKey: string, data: CacheEntry): Promise<void> {
    const input = {
      Bucket: this.bucketName,
      Key: `${this.removeSlashFromStart(pageKey)}/${cacheKey}`,
      ...(data.tags?.length ? { Metadata: { tags: data.tags.join(TAGS_SEPARATOR) } } : {})
    }

    if (data.value?.kind === 'PAGE') {
      await this.client.putObject({ ...input, Key: `${input.Key}.html`, Body: data.value.html })
    }

    await this.client.putObject({ ...input, Key: `${input.Key}.json`, Body: JSON.stringify(data) })
  }

  async revalidateTag(tag: string): Promise<void> {
    let nextContinuationToken: string | undefined = undefined
    do {
      const listObjectsResult: ListObjectsV2CommandOutput = await this.client.listObjectsV2({
        Bucket: this.bucketName,
        ContinuationToken: nextContinuationToken
      })
      nextContinuationToken = listObjectsResult.NextContinuationToken

      for (const { Key: key } of listObjectsResult?.Contents || []) {
        if (key?.includes('/')) {
          const pageKey = key.split('/')[0]
          if (tag === `${NEXT_CACHE_IMPLICIT_TAG_ID}${pageKey}`) {
            await this.client.deleteObject({ Bucket: this.bucketName, Key: key })
            continue
          }
        }

        const object = await this.client.getObject({ Bucket: this.bucketName, Key: key })

        const { tags = '' } = object.Metadata || {}

        if (!tags) continue

        if (tags.split(TAGS_SEPARATOR).includes(tag)) {
          await this.client.deleteObject({ Bucket: this.bucketName, Key: key })
        }
      }
    } while (nextContinuationToken)

    return
  }

  async delete(pageKey: string, cacheKey: string): Promise<void> {
    await this.client.deleteObject({
      Bucket: this.bucketName,
      Key: `${this.removeSlashFromStart(pageKey)}/${cacheKey}.json`
    })
    // TODO extend cache context and add value type to drop s3 html page
  }

  async deleteAllByKeyMatch(pageKey: string): Promise<void> {
    let nextContinuationToken: string | undefined = undefined
    do {
      const listObjectsResult: ListObjectsV2CommandOutput = await this.client.listObjectsV2({
        Bucket: this.bucketName,
        ContinuationToken: nextContinuationToken
      })
      nextContinuationToken = listObjectsResult.NextContinuationToken

      for (const { Key: key } of listObjectsResult?.Contents || []) {
        if (key?.includes('/')) {
          if (pageKey === key.split('/')[0]) {
            await this.client.deleteObject({ Bucket: this.bucketName, Key: key })
          }
        }
      }
    } while (nextContinuationToken)

    return
  }
}
