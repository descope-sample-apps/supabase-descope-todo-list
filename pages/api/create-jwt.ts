import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { userId } = req.body;
      const supabaseSecret = process.env.SUPABASE_JWT_SECRET;

      const newToken = jwt.sign({ sub: userId }, supabaseSecret, { algorithm: 'HS256' });
      res.status(200).json({ token: newToken });
    } catch (error) {
      res.status(500).json({ error: 'Error generating JWT' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}