import { TestPage } from './../../components/TestPage'

const getTitle = async () => {
  const res = await fetch('http://localhost:3000/api', { next: { tags: ['level'] } })
    .then((r) => r.json())
    .catch(() => ({ title: 'Pregenerated page data.' }))

  return res.title
}

const getDate = async () => {
  const res = await fetch('http://localhost:3000/api/date', { next: { tags: ['level-date'] } })
    .then((r) => r.json())
    .catch(() => ({ date: '-' }))

  return res.date
}

export const revalidate = 60

export default async function Home() {
  const title = await getTitle()
  const date = await getDate()

  return <TestPage title={title} date={date} buildTime={Date.now()} expireTime={Date.now() + revalidate * 1000} />
}
