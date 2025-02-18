import { NEXT_CACHE_TAGS_HEADER } from 'next/dist/lib/constants'

export const chunkArray = <T>(array: T[], chunkSize: number): T[][] =>
  Array.from({ length: Math.ceil(array.length / chunkSize) }, (v, i) =>
    array.slice(i * chunkSize, i * chunkSize + chunkSize)
  )

export const checkHeaderTags = (value: Record<string, any> | null, tag: string) =>
  value?.headers?.[NEXT_CACHE_TAGS_HEADER]?.toString()?.split(',').includes(tag)
