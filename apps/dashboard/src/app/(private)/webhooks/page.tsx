import Webhooks from "@/pages/Webhooks";
import React from "react";

export default async function page() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks`, {
    cache: "no-store"
  });
  const data = await response.json();
  return <Webhooks data={data} />;
}
