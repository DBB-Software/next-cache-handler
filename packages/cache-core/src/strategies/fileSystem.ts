import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { CacheStrategy, CacheEntry, CacheContext } from '../types'
import { checkHeaderTags } from '@dbbs/next-cache-handler-common'

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

  async revalidateTag(tag: string, allowCacheKeys: string[], ctx: CacheContext): Promise<void> {
    if (!ctx || !existsSync(ctx.serverCacheDirPath)) return

    const recursiveDelete = async (initPath: string = '') => {
      const cacheDir = await fs.readdir(initPath, { withFileTypes: true })
      for (const cacheItem of cacheDir) {
        const pathToItem = path.join(cacheItem.path, cacheItem.name)
        if (cacheItem.isDirectory()) {
          await recursiveDelete(pathToItem)
          continue
        }
        if (allowCacheKeys.length && !allowCacheKeys.includes(cacheItem.name.replace('.json', ''))) continue

        const data = await fs.readFile(pathToItem, 'utf-8')
        const pageData: CacheEntry = JSON.parse(data)
        if (pageData?.tags?.includes(tag) || checkHeaderTags(pageData.value, tag)) {
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

  async deleteAllByKeyMatch(pageKey: string, cacheKey: string, ctx: CacheContext) {
    if (!ctx || !existsSync(ctx.serverCacheDirPath)) return

    const pathToCacheFolder = path.join(ctx.serverCacheDirPath, ...pageKey.split('/'))
    if (!existsSync(pathToCacheFolder)) return

    const cacheDir = await fs.readdir(pathToCacheFolder, { withFileTypes: true })
    const filesToDelete = cacheDir.filter((cacheItem) => !cacheItem.isDirectory() && cacheItem.name.includes(cacheKey))

    if (cacheDir.length === filesToDelete.length) {
      await fs.rm(pathToCacheFolder, { recursive: true })
      return
    }

    await Promise.allSettled(filesToDelete.map((file) => fs.rm(path.join(file.path, file.name))))
  }
}
