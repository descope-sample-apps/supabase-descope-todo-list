import { SignJWT } from "jose";

export default async function handler(req: any, res: any) {
  if (req.method === "POST") {
    try {
      const { userId } = req.body;
      const supabaseSecret = process.env.SUPABASE_JWT_SECRET;
      if (!supabaseSecret) {
        return res.status(500).json({ error: "Missing SUPABASE_JWT_SECRET" });
      }
      const secretKey = new TextEncoder().encode(supabaseSecret);
      const newToken = await new SignJWT({ sub: userId })
        .setProtectedHeader({ alg: "HS256" })
        .sign(secretKey);
      res.status(200).json({ token: newToken });
    } catch (error) {
      res.status(500).json({ error: "Error generating JWT" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
