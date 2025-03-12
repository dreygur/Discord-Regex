import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; pattern: string }> }) {
  try {
    const { id, pattern } = await params;
    const regex = await database.getRegex(id, decodeURIComponent(pattern));
    if (!regex) {
      return NextResponse.json({ message: "Regex not found" }, { status: 404 });
    }
    return NextResponse.json(regex);
  } catch (error) {
    console.error("Error fetching regex:", error);
    return NextResponse.json({ message: "Failed to fetch regex" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; pattern: string }> }) {
  try {
    const { webhookName } = await req.json();
    if (!webhookName) {
      return NextResponse.json({ message: "Missing required fields: webhookName" }, { status: 400 });
    }

    const { id, pattern } = await params;
    await database.updateRegex(id, pattern, {
      webhookName,
    });
    return NextResponse.json({ message: "Regex updated successfully" });
  } catch (error) {
    console.error("Error updating regex:", error);
    return NextResponse.json({ message: "Failed to update regex" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; pattern: string }> }) {
  try {
    const { id, pattern } = await params;
    await database.deleteRegex(id, pattern);
    return NextResponse.json({ message: "Regex deleted successfully" });
  } catch (error) {
    console.error("Error deleting regex:", error);
    return NextResponse.json({ message: "Failed to delete regex" }, { status: 500 });
  }
}
