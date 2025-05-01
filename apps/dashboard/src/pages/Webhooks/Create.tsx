"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";

interface WebhookPayload {
  name: string;
  url: string;
  serverId: string;
  data?: Record<string, unknown>;
}

export default function CreateWebhook() {
  const [name, setName] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [serverId, setServerId] = useState<string>("");
  const [jsonData, setJsonData] = useState<string>("");
  const [jsonError, setJsonError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const validateJson = (value: string): boolean => {
    if (!value.trim()) {
      setJsonError(false);
      return true;
    }

    try {
      JSON.parse(value);
      setJsonError(false);
      return true;
    } catch {
      setJsonError(true);
      return false;
    }
  };

  const handleJsonChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value;
    setJsonData(value);
    validateJson(value);
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setName(e.target.value.trim());
  };

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setUrl(e.target.value.trim());
  };

  const handleServerIdChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setServerId(e.target.value.trim());
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (jsonData.trim() && !validateJson(jsonData)) {
      toast.error("Invalid JSON format", { id: "jsonValidation" });
      return;
    }

    setLoading(true);
    try {
      // Prepare payload with optional JSON data
      const payload: WebhookPayload = {
        name,
        url,
        serverId
      };

      // Add parsed JSON data if provided
      if (jsonData.trim()) {
        payload.data = JSON.parse(jsonData) as Record<string, unknown>;
      }

      const response = await fetch(`/api/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      toast.success("Webhook created successfully", { id: "webhook" });
      router.push("/webhooks");
    } catch (error) {
      toast.error("Failed to create webhook", { id: "webhook" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 shadow rounded-lg border">
      <h1 className="text-primary text-2xl font-bold mb-4">Create Webhook</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="webhook-name">Name</Label>
          <Input
            id="webhook-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="webhook-url">URL</Label>
          <Input
            id="webhook-url"
            type="url"
            value={url}
            onChange={handleUrlChange}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="webhook-server-id">Server ID</Label>
          <Input
            id="webhook-server-id"
            type="text"
            value={serverId}
            onChange={handleServerIdChange}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="webhook-json-data">JSON Data (Optional)</Label>
          <Textarea
            id="webhook-json-data"
            value={jsonData}
            onChange={handleJsonChange}
            placeholder="Enter valid JSON data"
            className={`min-h-32 font-mono ${jsonError ? 'border-red-500' : ''}`}
          />
          {jsonError && (
            <p className="text-red-500 text-sm mt-1">Invalid JSON format</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Webhook"}
        </Button>
      </form>
    </div>
  );
}