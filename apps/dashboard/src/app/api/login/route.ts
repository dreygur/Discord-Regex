// app/api/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

const storedHashedPassword = process.env.NEXT_HASHED_PASSWORD || "";
const validEmail = process.env.NEXT_VALID_EMAIL || "";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    if (email !== validEmail) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }
    console.log(password, storedHashedPassword);
    const passwordMatch = await bcrypt.compare(password, storedHashedPassword);
    if (!passwordMatch) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const user = { email };
    return NextResponse.json({ user }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
