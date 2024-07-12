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
import type { CacheEntry } from '@dbbs/next-cache-handler-common'
import { Cache } from '@dbbs/next-cache-handler-core'
import { RedisAdapter, RedisJSON } from './types'
import { CHUNK_LIMIT } from './constants'

const INDEX_NAME = 'idx:revalidateByTag'
const SEPARATOR = ','
const REGEX_PUNCTUATION = /[^a-zA-Z0-9]/g

export class RedisStack implements RedisAdapter {
  client: RedisClientType<RedisDefaultModules & RedisModules, RedisFunctions, RedisScripts>

  constructor(options: RedisClientOptions) {
    this.client = createClient(options)

    this.client.connect().then(() =>
      this.client.ft._list().then((listOfIndexes) => {
        if (listOfIndexes.includes(INDEX_NAME)) return
        this.client.ft
          .create(INDEX_NAME, { '$.tags': { type: SchemaFieldTypes.TAG, AS: 'tag', SEPARATOR } }, { ON: 'JSON' })
          .then(() => Cache.logger.info('Index created successfully.'))
          .catch((e) => {
            Cache.logger.error('Could not create an index for revalidating by tag', e)
          })
      })
    )
  }

  async get(pageKey: string, cacheKey: string): Promise<CacheEntry | null> {
    const pageData = (await this.client.json.get(`${pageKey}//${cacheKey}`)) as CacheEntry | null
    if (!pageData) return null
    return pageData
  }

  async set(pageKey: string, cacheKey: string, data: CacheEntry): Promise<void> {
    const headersTags =
      data?.value?.kind === 'PAGE' || data?.value?.kind === 'ROUTE'
        ? data?.value?.headers?.[NEXT_CACHE_TAGS_HEADER]?.toString()
        : ''
    const tags = [headersTags, data?.tags?.join(SEPARATOR)].filter(Boolean).join(SEPARATOR)

    const cacheData = {
      ...data,
      ...(data.revalidate && { EX: Number(data.revalidate) }),
      tags
    }
    await this.client.json.set(`${pageKey}//${cacheKey}`, '.', cacheData as unknown as RedisJSON)
  }

  async findByTag(tag: string): Promise<string[]> {
    const query = `@tag:{${tag.replace(REGEX_PUNCTUATION, (p) => `\\${p}`)}}`
    const keysToDelete: string[] = []
    let from = 0
    do {
      const { documents, total } = await this.client.ft.search(INDEX_NAME, query, {
        LIMIT: { from, size: CHUNK_LIMIT }
      })
      keysToDelete.push(...documents.map(({ id }) => id))
      const offset = from + documents.length
      from = offset < total ? offset : 0
    } while (from)

    return keysToDelete
  }
}
