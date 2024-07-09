'use client'
import { FC } from 'react'
import { usePathname } from 'next/navigation'

type TestPageProps = {
  title: string
  date: string
  buildTime: number
  expireTime?: number
}

export const TestPage: FC<TestPageProps> = ({ title, date, buildTime, expireTime }) => {
  const pathname = usePathname()

  const revalidateTagHandler = () => {
    const input = document.getElementById('tag') as HTMLInputElement | null
    if (input?.value) fetch(`/api/revalidate?tag=${input.value}`)
  }
  const revalidatePathHandler = () => {
    const input = document.getElementById('path') as HTMLInputElement | null
    if (input?.value) {
      fetch(`/api/revalidate?path=${input.value}`)
    } else {
      fetch(`/api/revalidate?path=${pathname}`)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <div style={{ background: 'gray', padding: '20px', display: 'flex', gap: '20px' }}>
        <a href="/">Home</a>
        <a href="/level">Level</a>
        <a href="/level/sub-level">Sub-level</a>
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
          <input type="text" id="path" placeholder={pathname} />
        </div>
        <div style={{ display: 'flex', gap: '8px', margin: '8px' }}>
          <button onClick={revalidateTagHandler}>Revalidate by Tag</button>
          <input type="text" id="tag" />
        </div>
      </div>
      <div style={{ background: 'gray', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span>Build Time: {new Date(buildTime).toString()}</span>
        {!!expireTime && <span>Expire Time: {new Date(expireTime).toString()}</span>}
      </div>
    </div>
  )
}
