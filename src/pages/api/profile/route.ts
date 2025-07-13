import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET() {
  const cookieStore = cookies();
  const token = (await cookieStore).get("token")?.value;

  if (!token)
    return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });

  try {
    const user = jwt.verify(token, SECRET);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
  }
}
