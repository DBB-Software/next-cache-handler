import { S3 } from '@aws-sdk/client-s3'
import { getAWSCredentials, type CacheEntry, type CacheStrategy } from '@dbbs/next-cache-handler-common'
import { NEXT_CACHE_IMPLICIT_TAG_ID } from 'next/dist/lib/constants'

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
    if (data.value?.kind === 'PAGE') {
      await this.client.putObject({
        Bucket: this.bucketName,
        Key: `${this.removeSlashFromStart(pageKey)}/${cacheKey}.html`,
        Body: data.value.html
      })
    }

    await this.client.putObject({
      Bucket: this.bucketName,
      Key: `${this.removeSlashFromStart(pageKey)}/${cacheKey}.json`,
      Body: JSON.stringify(data)
    })
  }

  async revalidateTag(tag: string): Promise<void> {
    const allKeys: string[] = []

    for (const cacheKey of allKeys) {
      if (tag.startsWith(NEXT_CACHE_IMPLICIT_TAG_ID) && tag === `${NEXT_CACHE_IMPLICIT_TAG_ID}${cacheKey}`) {
        await this.delete('', cacheKey)
        return
      }

      const pageData: CacheEntry | null = await this.get('', cacheKey)
      if (pageData?.tags?.includes(tag)) {
        await this.delete('', cacheKey)
        return
      }
    }
  }

  async delete(pageKey: string, cacheKey: string): Promise<void> {
    await this.client.deleteObject({
      Bucket: this.bucketName,
      Key: `${this.removeSlashFromStart(pageKey)}/${cacheKey}.json`
    })
    // TODO extend cache context and add value type to drop s3 html page
  }

  async deleteAllByKeyMatch(pageKey: string): Promise<void> {
    await this.client.deleteObject({
      Bucket: this.bucketName,
      Key: `${this.removeSlashFromStart(pageKey)}/`
    })
  }
}
