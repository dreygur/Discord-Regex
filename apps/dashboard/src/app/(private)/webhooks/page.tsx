'use client';
// import { database } from "@/lib/database";
import React, { useState, useEffect } from "react";
import Webhooks from "@/pages/Webhooks";

export default function Page() {
  const [data, setData] = useState<{ name: string, url: string, serverId: string }[]>([]);
  // const response = await database.getAllWebhooks();

  useEffect(() => {
    fetch(`/api/webhooks`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [setData]);

  return <Webhooks data={data} />;
}
