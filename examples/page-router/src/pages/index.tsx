import { TestPage } from '../components/TestPage'

export const getStaticProps = async () => {
  const res = await fetch('http://localhost:3000/api')
    .then((r) => r.json())
    .catch(() => ({ title: 'Pregenerated page data.' }))

  return { props: { ...res, buildTime: Date.now(), expireTime: Date.now() + 60 * 1000 }, revalidate: 60 }
}

export default TestPage
