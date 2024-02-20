import type {
  IncrementalCacheKindHint,
  IncrementalCacheEntry,
  IncrementalCacheValue
} from 'next/dist/server/response-cache'

export type { IncrementalCacheValue, IncrementalCacheEntry, IncrementalCacheKindHint }
export interface CacheStrategy {
  get(
    cacheKey: string,
    ctx: {
      kindHint?: IncrementalCacheKindHint
      revalidate?: number | false
      fetchUrl?: string
      fetchIdx?: number
      tags?: string[]
      softTags?: string[]
      serverAppPath: string
    }
  ): Promise<IncrementalCacheEntry | null>
  set(
    cacheKey: string,
    data: IncrementalCacheValue | null,
    ctx: {
      revalidate?: number | false
      fetchCache?: boolean
      fetchUrl?: string
      fetchIdx?: number
      tags?: string[]
      serverAppPath: string
    }
  ): Promise<any>
}
