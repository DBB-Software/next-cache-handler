import { TestPage } from './../../../components/TestPage'

const getTitle = async () => {
  const res = await fetch('http://localhost:3000/api', { next: { tags: ['subpage'] } })
    .then((r) => r.json())
    .catch(() => ({ title: 'Pregenerated page data.' }))

  return res.title
}

export const revalidate = 60

export default async function Home() {
  const title = await getTitle()

  return <TestPage title={title} buildTime={Date.now()} expireTime={Date.now() + revalidate * 1000} />
}
