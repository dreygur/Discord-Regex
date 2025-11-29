import { database } from "@/lib/database";
import { NextRequest, NextResponse } from "next/server";
import { 
  validateServerId, 
  validateWebhookName, 
  validateRegexPattern, 
  validateUserIds 
} from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate and sanitize all inputs
    const serverId = validateServerId(body.serverId);
    const regexPattern = validateRegexPattern(body.regexPattern);
    const webhookName = validateWebhookName(body.webhookName);
    const user_ids = validateUserIds(body.user_ids);

    console.log({ serverId, regexPattern, webhookName, user_ids })
    await database.addRegex(serverId, regexPattern, webhookName, user_ids);
    return NextResponse.json({ message: "Regex created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating regex:", error);
    // Return descriptive error message for validation errors
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
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
