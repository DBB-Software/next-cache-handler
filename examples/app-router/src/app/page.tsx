const getTitle = async () => {
  const res = await fetch('http://localhost:3000/api', { next: { tags: ['index'] } })
    .then((r) => r.json())
    .catch(() => ({ title: 'Pregenerated page data.' }))

  return res.title
}

export default async function Home() {
  const title = await getTitle()

  return (
    <>
      <h1>Welcome to Next Cache Handler</h1>
      <h2>
        To change page data and trigger api to get ew random text add cookie or query with key <b>abtest</b>. Cache
        handler is going to cache and generate data for all combinations of those keys, so if users returns to the same
        key what is already available in cache - he will retrieve cached result
      </h2>
      <p>{title}</p>
    </>
  )
}

export const revalidate = 15
