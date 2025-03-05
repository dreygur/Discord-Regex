'use client';

import React, { useState, useEffect } from "react";
import ServerPage from "@/pages/Server";
// import { database } from "@/lib/database";

export default function Page() {
  const [data, setData] = useState<{
    serverId: string;
    name: string;
    status: "active" | "disabled";
    totalUsers: number;
    email?: string;
  }[]>([]);

  useEffect(() => {
    fetch(`/api/server`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [setData]);

  // const data = await database.getAllServers();
  return <ServerPage data={data} />;
}
