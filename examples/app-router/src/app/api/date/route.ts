import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ date: new Date().toString() })
}
