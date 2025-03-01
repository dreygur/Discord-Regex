import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database";

export async function GET(req: NextRequest) {
  try {
    const server = await database.getAllServers();
    if (!server) return NextResponse.json({ message: "Server not found" }, { status: 404 });

    return NextResponse.json(server);
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error", error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { serverId, name, status, totalUsers, totalChannels } = await req.json();

    if (!serverId || !name) {
      return NextResponse.json({ message: "Server ID and Name are required" }, { status: 400 });
    }

    await database.createServer(serverId, name, status, totalUsers, totalChannels);
    return NextResponse.json({ message: "Server created successfully" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error", error }, { status: 500 });
  }
}
