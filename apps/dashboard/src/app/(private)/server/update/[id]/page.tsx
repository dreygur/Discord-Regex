import UpdateServer from "@/pages/Server/Update";
import React from "react";

export default async function page({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  return <UpdateServer id={id} />;
}
