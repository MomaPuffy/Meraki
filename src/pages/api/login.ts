import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (email === "admin@gmail.com" && password === "password") {
    const token = jwt.sign({ email, name: "Admin User" }, SECRET, {
      expiresIn: "1d",
    });

    const response = NextResponse.json({ success: true });
    response.headers.set(
      "Set-Cookie",
      `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
    );
    return response;
  }

  return NextResponse.json({ error: "Invalid Credentials" }, { status: 401 });
}
