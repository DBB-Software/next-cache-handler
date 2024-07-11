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
import { CHUNK_LIMIT, RedisJSON } from './types'
import { Cache } from '@dbbs/next-cache-handler-core'

function sanitizeTag(str: string) {
  return str.replace(/[^a-zA-Z0-9]/gi, '_')
}

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
            '$.tags[*]': { type: SchemaFieldTypes.TEXT, AS: 'tag' }
          },
          {
            ON: 'JSON'
          }
        )
        Cache.logger.info('Index created successfully.')
      } catch (e) {
        if (e instanceof Error && e.message.includes('Index already exists')) {
          Cache.logger.info('Index already exists. Skipping creation.')
        } else {
          Cache.logger.error('Could not create an index for tags', e)
        }
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
      data?.value?.kind === 'PAGE' || data?.value?.kind === 'ROUTE'
        ? data?.value?.headers?.[NEXT_CACHE_TAGS_HEADER]?.toString()?.split(',') || []
        : []

    const tags = [...headersTags, ...(data?.tags || [])]

    const cacheData = {
      ...data,
      ...(data.revalidate && { EX: Number(data.revalidate) }),
      tags: tags.map(sanitizeTag)
    }

    await this.client.json.set(`${pageKey}//${cacheKey}`, '.', cacheData as unknown as RedisJSON)
  }

  async revalidateTag(tag: string): Promise<void> {
    const keysToDelete: string[] = []
    let from = 0
    const sanitizedTags = sanitizeTag(tag)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { documents } = await this.client.ft.search('idx:tags', `@tag:${sanitizedTags}`, {
        LIMIT: { from, size: CHUNK_LIMIT }
      })

      documents.forEach(({ id, value: { tags = [] } }) => {
        if (Array.isArray(tags) && tags?.find((documentTag) => String(documentTag) === sanitizedTags)) {
          keysToDelete.push(id)
        }
      })

      if (documents.length < CHUNK_LIMIT) {
        break
      }

      from += CHUNK_LIMIT
    }

    if (keysToDelete.length === 0) {
      return
    }

    await this.deleteObjects(keysToDelete)
  }

  async delete(pageKey: string, cacheKey: string): Promise<void> {
    await this.client.unlink(`${pageKey}//${cacheKey}`)
  }

  async deleteAllByKeyMatch(key: string): Promise<void> {
    Cache.logger.info('deleteAllByKeyMatch is not implemented for RedisStack', key)
  }
}
