import { IncrementalCacheValue } from 'next/dist/server/response-cache'
import { NEXT_CACHE_TAGS_HEADER } from 'next/dist/lib/constants'

export const chunkArray = <T>(array: T[], chunkSize: number): T[][] =>
  Array.from({ length: Math.ceil(array.length / chunkSize) }, (v, i) =>
    array.slice(i * chunkSize, i * chunkSize + chunkSize)
  )

export const checkHeaderTags = (value: IncrementalCacheValue | null, tag: string) =>
  (value?.kind === 'PAGE' || value?.kind === 'ROUTE') &&
  value.headers?.[NEXT_CACHE_TAGS_HEADER]?.toString()?.split(',').includes(tag)
