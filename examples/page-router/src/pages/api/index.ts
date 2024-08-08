import { NextApiRequest, NextApiResponse } from 'next'

const titles = [
  'Nice! You landed for AB test experience',
  'Nice! Here is another experience',
  'This is one more great title to read'
]

export default async function getHomePage(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({
    title: titles[Math.floor(Math.random() * 3)],
    date: new Date().toString()
  })
}
