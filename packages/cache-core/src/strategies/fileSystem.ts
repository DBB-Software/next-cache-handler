import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { NEXT_CACHE_IMPLICIT_TAG_ID, NEXT_CACHE_TAGS_HEADER } from 'next/dist/lib/constants'
import type { CacheStrategy, CacheEntry, CacheContext } from '@dbbs/next-cache-handler-common'

export class FileSystemCache implements CacheStrategy {
  async get(pageKey: string, cacheKey: string, ctx: CacheContext): Promise<CacheEntry | null> {
    const pathToCacheFile = path.join(ctx.serverCacheDirPath, pageKey, `${cacheKey}.json`)

    if (!existsSync(pathToCacheFile)) return null

    const data = await fs.readFile(pathToCacheFile, 'utf-8')

    if (!data) return null

    return JSON.parse(data)
  }

  async set(pageKey: string, cacheKey: string, data: CacheEntry, ctx: CacheContext): Promise<void> {
    const pathToCacheFolder = path.join(ctx.serverCacheDirPath, pageKey)
    const pathToCacheFile = path.join(pathToCacheFolder, `${cacheKey}.json`)

    if (!existsSync(pathToCacheFolder)) await fs.mkdir(pathToCacheFolder, { recursive: true })

    await fs.writeFile(pathToCacheFile, JSON.stringify(data))
  }

  async revalidateTag(tag: string, ctx: CacheContext): Promise<void> {
    if (!existsSync(ctx.serverCacheDirPath)) return

    const recursiveDelete = async (initPath: string = '') => {
      const cacheDir = await fs.readdir(initPath, { withFileTypes: true })
      for (const cacheItem of cacheDir) {
        const pathToItem = path.join(cacheItem.path, cacheItem.name)
        if (cacheItem.isDirectory()) {
          await recursiveDelete(pathToItem)
          continue
        }

        const data = await fs.readFile(pathToItem, 'utf-8')
        const pageData: CacheEntry = JSON.parse(data)
        if (
          pageData?.tags?.includes(tag) ||
          (pageData.value?.kind === 'PAGE' &&
            pageData.value.headers?.[NEXT_CACHE_TAGS_HEADER]?.toString()?.split(',').includes(tag))
        ) {
          await fs.rm(pathToItem)
        }
      }
    }
    await recursiveDelete(ctx.serverCacheDirPath)
    return
  }

  async delete(pageKey: string, cacheKey: string, ctx: CacheContext) {
    await fs.rm(path.join(ctx.serverCacheDirPath, pageKey, `${cacheKey}.json`))
  }

  async deleteAllByKeyMatch(pageKey: string, ctx: CacheContext) {
    if (!existsSync(ctx.serverCacheDirPath)) return

    const pathToCacheFolder = path.join(ctx.serverCacheDirPath, pageKey)
    if (!existsSync(pathToCacheFolder)) return

    const cacheDir = await fs.readdir(pathToCacheFolder, { withFileTypes: true })
    const filesToDelete = cacheDir.filter((cacheItem) => !cacheItem.isDirectory())

    if (cacheDir.length === filesToDelete.length) {
      await fs.rm(pathToCacheFolder, { recursive: true })
      return
    }

    await Promise.allSettled(filesToDelete.map((file) => fs.rm(path.join(file.path, file.name))))
  }
}
