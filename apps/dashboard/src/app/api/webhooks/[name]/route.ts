import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database";
import { 
  validateWebhookName, 
  validateServerId, 
  sanitizeDataTemplate 
} from "@/lib/sanitize";

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const webhookName = validateWebhookName(name);
    
    const webhook = await database.getWebhook(webhookName);
    if (!webhook) {
      return NextResponse.json({ message: "Webhook not found" }, { status: 404 });
    }
    return NextResponse.json(webhook);
  } catch (error) {
    console.error("Error fetching webhook:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to fetch webhook" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const webhookName = validateWebhookName(name);
    const body = await req.json();
    
    // Validate and sanitize inputs
    const serverId = validateServerId(body.serverId);
    const data = sanitizeDataTemplate(body.data);
    
    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json({ message: "Webhook URL is required" }, { status: 400 });
    }

    await database.updateWebhook(webhookName, body.url, serverId, data);
    return NextResponse.json({ message: "Webhook updated successfully" });
  } catch (error) {
    console.error("Error updating webhook:", error);
    // Return validation errors with 400 status
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to update webhook" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const webhookName = validateWebhookName(name);
    
    await database.deleteWebhook(webhookName);
    return NextResponse.json({ message: "Webhook deleted successfully" });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to delete webhook" }, { status: 500 });
  }
}
