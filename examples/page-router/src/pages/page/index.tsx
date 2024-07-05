import { TestPage } from '../../components/TestPage'

const REVALIDATE = 60

export const getStaticProps = async () => {
  const res = await fetch('http://localhost:3000/api')
    .then((r) => r.json())
    .catch(() => ({ title: 'Pregenerated page data.' }))

  return {
    props: { ...res, buildTime: Date.now(), expireTime: Date.now() + REVALIDATE * 1000 },
    revalidate: REVALIDATE
  }
}

export default TestPage
