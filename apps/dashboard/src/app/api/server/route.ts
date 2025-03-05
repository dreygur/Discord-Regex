import { NextResponse } from "next/server";
import { database } from "@/lib/database";

export async function GET() {
  try {
    const server = await database.getAllServers();
    if (!server) return NextResponse.json({ message: "Server not found" }, { status: 404 });

    return NextResponse.json(server);
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error", error }, { status: 500 });
  }
}
