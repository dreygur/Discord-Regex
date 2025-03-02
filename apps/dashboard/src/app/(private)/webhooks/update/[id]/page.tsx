import UpdateWebhooks from "@/pages/Webhooks/Update";
import React from "react";

export default async function page({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  return <UpdateWebhooks id={id} />;
}
