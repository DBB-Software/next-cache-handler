import { NextApiRequest, NextApiResponse } from 'next'

export default async function simpleRevalidate(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!req.query.path) {
      return res.status(400).json({ error: 'Path should be specified.' })
    }

    await res.revalidate(req.query.path as string)
    return res.status(200).json({ revalidated: true })
  } catch (err) {
    return res.status(500).json({ error: err })
  }
}
