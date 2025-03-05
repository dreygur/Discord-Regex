// app/api/login/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

const storedHashedPassword = process.env.NEXT_HASHED_PASSWORD || "";
const validEmail = process.env.NEXT_VALID_EMAIL || "";

function compareHashes(hashA: string, hashB: string): boolean {
  try {
    const bufA = Buffer.from(hashA, 'hex');
    const bufB = Buffer.from(hashB, 'hex');

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  } catch (error) {
    console.error(error);
    return false;
  }
}

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
    const passwordMatch = compareHashes(crypto.createHash('sha256').update(password).digest('hex'), storedHashedPassword);
    if (!passwordMatch) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const user = { email };
    return NextResponse.json({ user }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
