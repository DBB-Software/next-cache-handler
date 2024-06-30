import { NEXT_CACHE_IMPLICIT_TAG_ID } from 'next/dist/lib/constants'

export const TAGS_REGEX = /-tags\([^)]*\)/g

export const getTagsFromFileName = (fileName: string) => {
  const match = fileName.match(TAGS_REGEX)
  if (!match) return []
  return match[0].slice(6, -1).replace(new RegExp(NEXT_CACHE_IMPLICIT_TAG_ID, 'g'), '/').split(',')
}
