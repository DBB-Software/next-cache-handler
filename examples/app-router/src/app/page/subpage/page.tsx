import { TestPage } from './../../../components/TestPage'

const getTitle = async () => {
  const res = await fetch('http://localhost:3000/api', { next: { tags: ['subpage'] } })
    .then((r) => r.json())
    .catch(() => ({ title: 'Pregenerated page data.' }))

  return res.title
}

export default async function Home() {
  const title = await getTitle()
  const buildTime = new Date()

  return <TestPage title={title} buildTime={buildTime.toString()} />
}

export const revalidate = 15
