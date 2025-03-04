import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }) {
  try {
    const webhook = await database.getWebhook((await params).name);
    if (!webhook) {
      return NextResponse.json({ message: "Webhook not found" }, { status: 404 });
    }
    return NextResponse.json(webhook);
  } catch (error) {
    console.error("Error fetching webhook:", error);
    return NextResponse.json({ message: "Failed to fetch webhook" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }) {
  try {
    const { url, serverId } = await req.json();
    if (!url || !serverId) {
      return NextResponse.json({ message: "Missing required fields: url and serverId" }, { status: 400 });
    }

    await database.updateWebhook((await params).name, url, serverId);
    return NextResponse.json({ message: "Webhook updated successfully" });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json({ message: "Failed to update webhook" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }) {
  try {
    await database.deleteWebhook((await params).name);
    return NextResponse.json({ message: "Webhook deleted successfully" });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json({ message: "Failed to delete webhook" }, { status: 500 });
  }
}
