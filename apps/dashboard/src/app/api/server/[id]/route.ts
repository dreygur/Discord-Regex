import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ message: "Server ID is required" }, { status: 400 });

    const server = await database.getServer(id);
    return NextResponse.json(server);
  } catch (error) {
    console.error("Error fetching server:", error);
    return NextResponse.json({ message: "Internal Server Error", error }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();
    console.log({ id, updates });
    if (!id || !updates) return NextResponse.json({ message: "Server ID and updates are required" }, { status: 400 });

    await database.updateServer(id, updates);
    return NextResponse.json({ message: "Server updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating server:", error);
    return NextResponse.json({ message: "Internal Server Error", error }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: "Server ID is required" }, { status: 400 });
    }

    await database.deleteServer(id);
    return NextResponse.json({ message: "Server deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error", error }, { status: 500 });
  }
}
