import { FC } from 'react'

type TestPageProps = {
  title: string
  buildTime: number
  expireTime?: number
}

export const TestPage: FC<TestPageProps> = ({ title, buildTime, expireTime }) => (
  <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
    <div style={{ background: 'gray', padding: '20px', display: 'flex', gap: '20px' }}>
      <a href="/">Home</a>
      <a href="/page">Page</a>
      <a href="/page/subpage">SubPage</a>
    </div>
    <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', padding: '8px' }}>
      <h1>Welcome to Next Cache Handler</h1>
      <h2>
        To change page data and trigger api to get ew random text add cookie or query with key <b>abtest</b>. Cache
        handler is going to cache and generate data for all combinations of those keys, so if users returns to the same
        key what is already available in cache - he will retrieve cached result
      </h2>
      <p>{title}</p>
    </div>
    <div style={{ background: 'gray', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <span>Build Time: {new Date(buildTime).toString()}</span>
      {!!expireTime && <span>Expire Time: {new Date(expireTime).toString()}</span>}
    </div>
  </div>
)
