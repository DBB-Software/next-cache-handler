import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { NEXT_CACHE_IMPLICIT_TAG_ID } from 'next/dist/lib/constants'
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

    const cacheDir = await fs.readdir(ctx.serverCacheDirPath, { withFileTypes: true })
    for (const pageDirs of cacheDir) {
      if (!pageDirs.isDirectory()) continue

      if (tag.startsWith(NEXT_CACHE_IMPLICIT_TAG_ID) && tag === `${NEXT_CACHE_IMPLICIT_TAG_ID}${pageDirs.name}`) {
        await fs.rm(path.join(pageDirs.path, pageDirs.name), { recursive: true })
        return
      }

      const cacheFiles = await fs.readdir(path.join(pageDirs.path, pageDirs.name), { withFileTypes: true })
      for (const cacheFile of cacheFiles) {
        if (cacheFile.isDirectory()) continue

        const data = await fs.readFile(path.join(cacheFile.path, cacheFile.name), 'utf-8')
        const pageData: CacheEntry = JSON.parse(data)
        if (pageData?.tags?.includes(tag)) {
          await fs.rm(path.join(cacheFile.path, cacheFile.name))
        }
      }
    }
    return
  }

  async delete(pageKey: string, cacheKey: string, ctx: CacheContext) {
    await fs.rm(path.join(ctx.serverCacheDirPath, pageKey, `${cacheKey}.json`))
  }

  async deleteAllByKeyMatch(pageKey: string, ctx: CacheContext) {
    const cacheDir = await fs.readdir(path.join(ctx.serverCacheDirPath))
    const filesToDelete = cacheDir.filter((fileName: string) => fileName.startsWith(pageKey))

    await Promise.allSettled(filesToDelete.map((file) => fs.rm(path.join(ctx.serverCacheDirPath, file))))
  }
}
