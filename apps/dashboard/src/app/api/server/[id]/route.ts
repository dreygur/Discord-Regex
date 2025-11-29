import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database";
import { 
  validateServerId, 
  validateServerName, 
  validateServerStatus, 
  validateTotalUsers 
} from "@/lib/sanitize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverId = validateServerId(id);

    const server = await database.getServer(serverId);
    return NextResponse.json(server);
  } catch (error) {
    console.error("Error fetching server:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal Server Error", error }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverId = validateServerId(id);
    const body = await req.json();
    
    // Validate and sanitize update fields
    const updates: any = {};
    if (body.name !== undefined) {
      updates.name = validateServerName(body.name);
    }
    if (body.status !== undefined) {
      updates.status = validateServerStatus(body.status);
    }
    if (body.totalUsers !== undefined) {
      updates.totalUsers = validateTotalUsers(body.totalUsers);
    }
    
    console.log({ serverId, updates });

    await database.updateServer(serverId, updates);
    return NextResponse.json({ message: "Server updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating server:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal Server Error", error }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const serverId = validateServerId(id);

    await database.deleteServer(serverId);
    return NextResponse.json({ message: "Server deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting server:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal Server Error", error }, { status: 500 });
  }
}
