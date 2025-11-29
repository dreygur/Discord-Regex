import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database";
import { debug } from "@/lib/debug";
import { 
  validateServerId, 
  validateRegexPattern, 
  validateWebhookName, 
  validateUserIds 
} from "@/lib/sanitize";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; pattern: string }> }) {
  try {
    const { id, pattern } = await params;
    const serverId = validateServerId(id);
    const regexPattern = validateRegexPattern(decodeURIComponent(pattern));
    
    const regex = await database.getRegex(serverId, regexPattern);
    if (!regex) {
      return NextResponse.json({ message: "Regex not found" }, { status: 404 });
    }
    return NextResponse.json(regex);
  } catch (error) {
    console.error("Error fetching regex:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to fetch regex" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; pattern: string }> }) {
  try {
    const { id, pattern } = await params;
    const serverId = validateServerId(id);
    const regexPattern = validateRegexPattern(decodeURIComponent(pattern));
    const body = await req.json();
    
    // Validate and sanitize inputs
    const webhookName = validateWebhookName(body.webhookName);
    const user_ids = validateUserIds(body.user_ids);
    
    debug.log('API received:', { webhookName, user_ids });

    const updates: { webhookName: string; user_ids?: string[] } = { webhookName };
    if (user_ids !== undefined) {
      updates.user_ids = user_ids;
    }
    debug.log('Updates object:', updates);
    
    await database.updateRegex(serverId, regexPattern, updates);
    return NextResponse.json({ message: "Regex updated successfully" });
  } catch (error) {
    console.error("Error updating regex:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to update regex" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; pattern: string }> }) {
  try {
    const { id, pattern } = await params;
    const serverId = validateServerId(id);
    const regexPattern = validateRegexPattern(decodeURIComponent(pattern));
    
    await database.deleteRegex(serverId, regexPattern);
    return NextResponse.json({ message: "Regex deleted successfully" });
  } catch (error) {
    console.error("Error deleting regex:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to delete regex" }, { status: 500 });
  }
}
