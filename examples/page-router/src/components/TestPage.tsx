import { FC, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

type TestPageProps = {
  title: string
  buildTime: number
  expireTime?: number
}

export const TestPage: FC<TestPageProps> = ({ title, buildTime, expireTime }) => {
  const pathRef = useRef<HTMLInputElement>(null)
  const { pathname: currentPath } = useRouter()

  const revalidatePathHandler = () => {
    const pathValue = pathRef?.current?.value || currentPath
    fetch(`/api/revalidate?path=${pathValue}`)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', margin: '-8px' }}>
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
        <p>{title}</p>
        <div style={{ display: 'flex', gap: '8px', margin: '8px' }}>
          <button onClick={revalidatePathHandler}>Revalidate by Path</button>
          <input ref={pathRef} type="text" placeholder={currentPath} />
        </div>
      </div>
      <div style={{ background: 'gray', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span>Build Time: {new Date(buildTime).toString()}</span>
        {!!expireTime && <span>Expire Time: {new Date(expireTime).toString()}</span>}
      </div>
    </div>
  )
}
