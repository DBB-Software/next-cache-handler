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
import { CachedRouteKind, type CacheEntry } from '@dbbs/next-cache-handler-core'
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
          .create(
            INDEX_NAME,
            {
              '$.generalTags': { type: SchemaFieldTypes.TAG, AS: 'tag', SEPARATOR },
              '$.currentCacheKey': { type: SchemaFieldTypes.TEXT, AS: 'currentCacheKey' }
            },
            { ON: 'JSON' }
          )
          .catch((e) => {
            const errMsg = `Could not create an index for revalidating by tag. Reason: ${e}`
            throw new Error(errMsg)
          })
      })
    )
  }

  async get(pageKey: string, cacheKey: string): Promise<CacheEntry | null> {
    const pageData = (await this.client.json.get(`${pageKey}//${cacheKey}`)) as
      | (CacheEntry & { generalTags?: string[]; currentCacheKey?: string })
      | null
    if (!pageData) return null
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { generalTags, currentCacheKey, ...pureData } = pageData
    return pureData
  }

  async set(pageKey: string, cacheKey: string, data: CacheEntry): Promise<void> {
    const headersTags =
      data?.value?.kind &&
      [CachedRouteKind.PAGE, CachedRouteKind.PAGES, CachedRouteKind.ROUTE, CachedRouteKind.APP_ROUTE].includes(
        data?.value?.kind
      )
        ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-expect-error
          data?.value?.headers?.[NEXT_CACHE_TAGS_HEADER]?.toString()
        : ''
    const generalTags = [headersTags, data?.tags?.join(SEPARATOR)].filter(Boolean).join(SEPARATOR)

    const cacheData = { ...data, currentCacheKey: cacheKey, generalTags }
    await this.client.json.set(`${pageKey}//${cacheKey}`, '.', cacheData as unknown as RedisJSON)
    if (data.revalidate) {
      await this.client.expire(`${pageKey}//${cacheKey}`, Number(data.revalidate))
    }
  }

  async findCacheKeys(tag: string, cacheKeys: string[]): Promise<string[]> {
    const query = [
      `@tag:{${tag.replace(REGEX_PUNCTUATION, (p) => `\\${p}`)}}`,
      ...(cacheKeys.length ? [`(${cacheKeys.map((key) => `*${key}`).join('|')})`] : [])
    ].join(' ')

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
