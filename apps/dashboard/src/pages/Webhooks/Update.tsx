"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Loading from "../../app/loading";
import toast from "react-hot-toast";

interface WebhookData {
  name: string;
  url: string;
  serverId: string;
  data?: Record<string, unknown>;
}

export default function UpdateWebhook({ id }: { id: string }) {
  const router = useRouter();
  const [webhook, setWebhook] = useState<WebhookData | null>(null);
  const [jsonData, setJsonData] = useState<string>("");
  const [jsonError, setJsonError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    fetchWebhook().then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchWebhook = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/webhooks/${id}`);
      if (!res.ok) throw new Error("Failed to fetch webhook");
      const data: WebhookData = await res.json();
      setWebhook(data);

      // Initialize the JSON textarea if data exists
      if (data.data) {
        setJsonData(JSON.stringify(data.data, null, 2));
      }
    } catch (error) {
      toast.error("Error fetching webhook data", { id: "webhook" });
      console.error(error);
    }
  };

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

  const handleUpdate = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!webhook) return;

    // Validate JSON before submitting
    if (jsonData.trim() && !validateJson(jsonData)) {
      toast.error("Invalid JSON format", { id: "jsonValidation" });
      return;
    }

    setUpdating(true);
    try {
      // Prepare the payload
      const payload: WebhookData = {
        name: webhook.name,
        url: webhook.url,
        serverId: webhook.serverId
      };

      // Add JSON data if provided
      if (jsonData.trim()) {
        payload.data = JSON.parse(jsonData) as Record<string, unknown>;
      }

      const res = await fetch(`/api/webhooks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Webhook updated successfully", { id: "webhook" });
        router.push("/webhooks");
      } else {
        throw new Error(`Failed to update webhook: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      toast.error("Error updating webhook", { id: "webhook" });
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (!webhook) return;
    setWebhook({ ...webhook, url: e.target.value.trim() });
  };

  const handleServerIdChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (!webhook) return;
    setWebhook({ ...webhook, serverId: e.target.value.trim() });
  };

  if (loading) return <Loading />;
  if (!webhook) return <p className="p-6 text-destructive text-4xl text-center">Error loading webhook data. Please try again</p>;

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 shadow rounded-lg border">
      <h1 className="text-primary text-2xl font-bold mb-4">Edit Webhook</h1>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="webhook-name">Name</Label>
          <Input
            id="webhook-name"
            value={webhook.name}
            disabled
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="webhook-url">URL</Label>
          <Input
            id="webhook-url"
            type="url"
            value={webhook.url}
            onChange={handleUrlChange}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="webhook-server-id">Server ID</Label>
          <Input
            id="webhook-server-id"
            type="text"
            value={webhook.serverId}
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

        <Button type="submit" className="w-full" disabled={updating}>
          {updating ? "Updating..." : "Update Webhook"}
        </Button>
      </form>
    </div>
  );
}