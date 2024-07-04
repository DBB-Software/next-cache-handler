import { TestPage } from '../../../components/TestPage'

export const getStaticProps = async () => {
  const res = await fetch('http://localhost:3000/api')
    .then((r) => r.json())
    .catch(() => ({ title: 'Pregenerated page data.' }))
  const buildTime = new Date()

  return { props: { ...res, buildTime: buildTime.toString() }, revalidate: 60 }
}

export default TestPage
