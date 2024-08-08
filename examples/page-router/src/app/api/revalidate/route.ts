import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const parsedUrl = new URL(req.url)
    const pathToRevalidate = parsedUrl.searchParams.get('path')
    const tagToRevalidate = parsedUrl.searchParams.get('tag')

    if (pathToRevalidate) {
      revalidatePath(pathToRevalidate)
    }
    if (tagToRevalidate) {
      revalidateTag(tagToRevalidate)
    }

    return NextResponse.json({
      revalidated: true
    })
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return NextResponse.json({ error: err?.message })
  }
}
