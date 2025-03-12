"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

export default function CreateRegex() {
  const [serverId, setServerId] = useState("");
  const [regexPattern, setRegexPattern] = useState("");
  const [webhookName, setWebhookName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      await fetch(`/api/regex`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookName, regexPattern, serverId })
      });

      toast.success("Regex created successfully", { id: "regex" });
      router.push("/regex");
    } catch (error) {
      toast.error("Failed to create regex", { id: "regex" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 shadow rounded-lg border">
      <h1 className="text-primary text-2xl font-bold mb-4">Create Regex</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label>Server ID</Label>
          <Input type="text" value={serverId} onChange={e => setServerId(e.target.value)} required />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Regex Pattern</Label>
          <Input type="text" value={regexPattern} onChange={e => setRegexPattern(e.target.value)} required />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Webhook</Label>
          <Input type="text" value={webhookName} onChange={e => setWebhookName(e.target.value)} required />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Regex"}
        </Button>
      </form>
    </div>
  );
}
