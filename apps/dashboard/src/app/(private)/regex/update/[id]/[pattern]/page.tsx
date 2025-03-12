import React from "react";
import UpdateRegex from "@/pages/Regex/Update";

export default async function page({ params }: { params: Promise<{ id: string; pattern: string }> }) {
  const { id, pattern } = await params;
  return <UpdateRegex id={id} pattern={pattern} />;
}
