'use client'
import { FC, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

type TestPageProps = {
  title: string
  date: string
  buildTime: number
  expireTime?: number
}

export const TestPage: FC<TestPageProps> = ({ title, date, buildTime, expireTime }) => {
  const currentPath = usePathname()
  const pathRef = useRef<HTMLInputElement>(null)
  const tagRef = useRef<HTMLInputElement>(null)

  const revalidateTagHandler = () => {
    const tagValue = tagRef?.current?.value
    if (tagValue) fetch(`/api/revalidate?tag=${tagValue}`)
  }
  const revalidatePathHandler = () => {
    const pathValue = pathRef?.current?.value || currentPath
    fetch(`/api/revalidate?path=${pathValue}`)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <div style={{ background: 'gray', padding: '20px', display: 'flex', gap: '20px' }}>
        <Link href="/">Home</Link>
        <Link href="/level">Level</Link>
        <Link href="/level/sub-level">Sub-level</Link>
      </div>
      <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', padding: '8px' }}>
        <h1>Welcome to Next Cache Handler</h1>
        <h2>
          To change page data and trigger api to get ew random text add cookie or query with key <b>abtest</b>. Cache
          handler is going to cache and generate data for all combinations of those keys, so if users returns to the
          same key what is already available in cache - he will retrieve cached result
        </h2>
        <p>Title: {title}</p>
        <p>Date: {date}</p>
        <div style={{ display: 'flex', gap: '8px', margin: '8px' }}>
          <button onClick={revalidatePathHandler}>Revalidate by Path</button>
          <input ref={pathRef} type="text" placeholder={currentPath} />
        </div>
        <div style={{ display: 'flex', gap: '8px', margin: '8px' }}>
          <button onClick={revalidateTagHandler}>Revalidate by Tag</button>
          <input ref={tagRef} type="text" />
        </div>
      </div>
      <div style={{ background: 'gray', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span>Build Time: {new Date(buildTime).toString()}</span>
        {!!expireTime && <span>Expire Time: {new Date(expireTime).toString()}</span>}
      </div>
    </div>
  )
}
