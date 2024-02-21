import { NextResponse } from 'next/server'

const titles = [
  'Nice! You landed for AB test experience',
  'Nice! Here is another experience',
  'This is one more great title to read'
]

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    title: titles[Math.floor(Math.random() * 3)]
  })
}
