import { NEXT_CACHE_TAGS_HEADER } from 'next/dist/lib/constants'
import {
  createClient,
  RedisClientType,
  RedisClientOptions,
  RedisModules,
  RedisDefaultModules,
  RedisFunctions,
  RedisScripts,
  SchemaFieldTypes
} from 'redis'
import type { CacheEntry, CacheStrategy } from '@dbbs/next-cache-handler-common'
import { chunkArray } from '@dbbs/next-cache-handler-common'

interface RedisJSONArray extends Array<RedisJSON> {}
interface RedisJSONObject {
  [key: string]: RedisJSON
}
type RedisJSON = string | number | boolean | null | RedisJSONArray | RedisJSONObject
const CHUNK_LIMIT = 100
export class RedisStack implements CacheStrategy {
  client: RedisClientType<RedisDefaultModules & RedisModules, RedisFunctions, RedisScripts>
  constructor(options: RedisClientOptions) {
    this.client = createClient(options)
    this.client.connect()
    const createIndex = async () => {
      try {
        // Attempt to create the index
        await this.client.ft.create(
          'idx:tags',
          {
            '$.tags': { type: SchemaFieldTypes.TEXT, AS: 'tag' }
          },
          {
            ON: 'JSON'
          }
        )
        console.log('Index created successfully.')
      } catch (e) {
        console.error('Could not create an index for tags', e)
      }
    }

    createIndex()
  }

  async deleteObjects(keysToDelete: string[]) {
    await Promise.allSettled(chunkArray(keysToDelete, CHUNK_LIMIT).map((chunk) => this.client.unlink(chunk)))
  }
  async get(pageKey: string, cacheKey: string): Promise<CacheEntry | null> {
    const cacheValue = (await this.client.json.get(`${pageKey}//${cacheKey}`)) as CacheEntry | null

    if (!cacheValue) {
      return null
    }
    return cacheValue
  }

  async set(pageKey: string, cacheKey: string, data: CacheEntry): Promise<void> {
    const headersTags =
      data?.value?.kind === 'PAGE' ? data?.value?.headers?.[NEXT_CACHE_TAGS_HEADER]?.toString()?.split(',') || [] : []
    const pageTags = headersTags.filter((tag) => !tag.includes(NEXT_CACHE_TAGS_HEADER))
    const tags = [...pageTags, ...(data?.tags || [])]

    const cacheData = {
      ...data,
      ...(data.revalidate && { EX: Number(data.revalidate) }),
      tags
    }

    await this.client.json.set(`${pageKey}//${cacheKey}`, '.', cacheData as unknown as RedisJSON)
  }

  async revalidateTag(tag: string): Promise<void> {
    const keysToDelete: string[] = []
    let from = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { documents } = await this.client.ft.search('idx:tags', `@tag:"${tag}"`, {
        LIMIT: { from, size: CHUNK_LIMIT }
      })

      for (const { id } of documents) {
        keysToDelete.push(id)
      }

      if (documents.length < CHUNK_LIMIT) {
        break
      }

      from += CHUNK_LIMIT
    }

    if (keysToDelete.length === 0) {
      return
    }

    const validKeysToDelete = keysToDelete.filter((key) => Boolean(key))

    if (validKeysToDelete.length > 0) {
      try {
        await this.client.unlink(validKeysToDelete)
      } catch (error) {
        console.error('Error deleting keys:', validKeysToDelete, error)
      }
    }
    return
  }

  async delete(pageKey: string, cacheKey: string): Promise<void> {
    await this.client.unlink(`${pageKey}//${cacheKey}`)
  }

  async deleteAllByKeyMatch(key: string): Promise<void> {
    const keysToDelete: string[] = []
    let cursor = 0
    do {
      const result = await this.client.scan(cursor, { MATCH: `${key}//*`, COUNT: CHUNK_LIMIT })
      cursor = result.cursor
      keysToDelete.push(...result.keys)
    } while (cursor != 0)
    await this.deleteObjects(keysToDelete)
    return
  }
}
