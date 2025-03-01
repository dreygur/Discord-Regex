import { database } from "@/lib/database";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, url } = await req.json();
    if (!name || !url) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    await database.createWebhook(name, url);
    return NextResponse.json({ message: "Webhook created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating webhook:", error);
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
