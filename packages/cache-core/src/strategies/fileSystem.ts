import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { TAGS_REGEX, getTagsFromFileName } from '@dbbs/next-cache-handler-common'
import type { CacheStrategy, CacheEntry, CacheContext } from '@dbbs/next-cache-handler-common'

export class FileSystemCache implements CacheStrategy {
  async get(pageKey: string, cacheKey: string, ctx: CacheContext): Promise<CacheEntry | null> {
    const pathToCacheDir = path.join(ctx.serverCacheDirPath, pageKey)
    if (!existsSync(pathToCacheDir)) return null

    const cacheDir = await fs.readdir(pathToCacheDir, { withFileTypes: true })
    for (const cacheItem of cacheDir) {
      if (cacheItem.name.replace(TAGS_REGEX, '') === `${cacheKey}.json`) {
        const data = await fs.readFile(path.join(cacheItem.path, cacheItem.name), 'utf-8')
        if (!data) return null

        return JSON.parse(data)
      }
    }

    return null
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

        if (getTagsFromFileName(cacheItem.name).includes(tag)) {
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

    const pathToCacheFolder = path.join(ctx.serverCacheDirPath, ...pageKey.split('/'))
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
