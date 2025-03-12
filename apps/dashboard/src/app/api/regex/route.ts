import { database } from "@/lib/database";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { webhookName, regexPattern, serverId } = await req.json();
    if (!webhookName || !regexPattern || !serverId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    console.log({ serverId, regexPattern, webhookName })
    await database.addRegex(serverId, regexPattern, webhookName);
    return NextResponse.json({ message: "Regex created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating regex:", error);
    return NextResponse.json({ message: "Failed to create regex" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const regex = await database.getAllRegex();
    return NextResponse.json(regex);
  } catch (error) {
    console.error("Error fetching regex:", error);
    return NextResponse.json({ message: "Failed to fetch regex" }, { status: 500 });
  }
}
