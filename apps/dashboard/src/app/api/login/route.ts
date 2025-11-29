// app/api/login/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sanitizeString } from "@/lib/sanitize";

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
    const body = await req.json();
    
    // Sanitize inputs
    const email = sanitizeString(body.email);
    const password = sanitizeString(body.password);

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
    
    // Create response with HTTP-only cookie for session management
    const response = NextResponse.json({ user }, { status: 200 });
    
    // Set secure session cookie (HTTP-only, Secure in production, SameSite=Strict for CSRF protection)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    });
    
    return response;
  } catch {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
