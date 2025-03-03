import { database } from "@/lib/database";
import Webhooks from "@/pages/Webhooks";
import React from "react";

export default async function page() {
  const response = await database.getAllWebhooks();
  return <Webhooks data={response} />;
}
