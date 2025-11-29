import { database } from "@/lib/database";
import { NextRequest, NextResponse } from "next/server";
import { 
  validateServerId, 
  validateWebhookName, 
  sanitizeDataTemplate 
} from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate and sanitize all inputs
    const name = validateWebhookName(body.name);
    const serverId = validateServerId(body.serverId);
    const data = sanitizeDataTemplate(body.data) || '';
    
    // URL validation is handled by database.createWebhook
    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json({ message: "Webhook URL is required" }, { status: 400 });
    }

    await database.createWebhook(name, body.url, serverId, data);
    return NextResponse.json({ message: "Webhook created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating webhook:", error);
    // Return validation errors with 400 status
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to create webhook" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paginated = searchParams.get("paginated") === "true";

    if (paginated) {
      const webhooks = await database.getAllWebhooksPaginated();
      return NextResponse.json(webhooks);
    } else {
      const webhooks = await database.getAllWebhooks();
      return NextResponse.json(webhooks);
    }
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json({ message: "Failed to fetch webhooks" }, { status: 500 });
  }
}
