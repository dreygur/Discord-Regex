"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServers } from "@/hooks/useServers";
import { useWebhooks } from "@/hooks/useWebhooks";
import toast from "react-hot-toast";

export default function CreateRegex() {
  const [serverId, setServerId] = useState("");
  const [regexPattern, setRegexPattern] = useState("");
  const [webhookName, setWebhookName] = useState("");
  const [userIds, setUserIds] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: servers, loading: serversLoading, error: serversError, refetch: refetchServers } = useServers();
  const { data: webhooks, loading: webhooksLoading, error: webhooksError, refetch: refetchWebhooks } = useWebhooks(serverId || undefined);

  // Clear webhook selection when server changes if webhook doesn't belong to new server
  useEffect(() => {
    if (webhookName && serverId) {
      const selectedWebhook = webhooks.find(w => w.name === webhookName);
      if (!selectedWebhook || selectedWebhook.serverId !== serverId) {
        setWebhookName("");
      }
    }
  }, [serverId, webhooks, webhookName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const user_ids = userIds.trim() ? (userIds.trim().toLowerCase() === 'all' ? ['All'] : userIds.split(',').map(id => id.trim()).filter(id => id)) : ['All'];
      await fetch(`/api/regex`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookName, regexPattern, serverId, user_ids })
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
          <Label htmlFor="regex-server-id">Server</Label>
          {serversLoading ? (
            <div className="h-9 flex items-center px-3 border rounded-md text-sm text-muted-foreground">
              Loading servers...
            </div>
          ) : serversError ? (
            <div className="space-y-2">
              <div className="h-9 flex items-center px-3 border border-red-500 rounded-md text-sm text-red-500">
                Error loading servers
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={refetchServers}
              >
                Retry
              </Button>
            </div>
          ) : servers.length === 0 ? (
            <div className="h-9 flex items-center px-3 border rounded-md text-sm text-muted-foreground">
              No servers available
            </div>
          ) : (
            <Select
              value={serverId}
              onValueChange={setServerId}
              required
            >
              <SelectTrigger id="regex-server-id" aria-label="Select server">
                <SelectValue placeholder="Select a server" />
              </SelectTrigger>
              <SelectContent>
                {servers.map((server) => (
                  <SelectItem key={server.serverId} value={server.serverId}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Regex Pattern</Label>
          <Input type="text" value={regexPattern} onChange={e => setRegexPattern(e.target.value.trim())} required />
        </div>

        <div className="flex flex-col gap-2">
          <Label>User IDs (comma-separated)</Label>
          <Input type="text" value={userIds} onChange={e => setUserIds(e.target.value)} placeholder="Enter 'All' for all users, or comma-separated user IDs" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="regex-webhook-name">Webhook</Label>
          {webhooksLoading ? (
            <div className="h-9 flex items-center px-3 border rounded-md text-sm text-muted-foreground">
              Loading webhooks...
            </div>
          ) : webhooksError ? (
            <div className="space-y-2">
              <div className="h-9 flex items-center px-3 border border-red-500 rounded-md text-sm text-red-500">
                Error loading webhooks
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={refetchWebhooks}
              >
                Retry
              </Button>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="h-9 flex items-center px-3 border rounded-md text-sm text-muted-foreground">
              {serverId ? "No webhooks available for this server" : "No webhooks available"}
            </div>
          ) : (
            <Select
              value={webhookName}
              onValueChange={setWebhookName}
              required
            >
              <SelectTrigger id="regex-webhook-name" aria-label="Select webhook">
                <SelectValue placeholder="Select a webhook" />
              </SelectTrigger>
              <SelectContent>
                {webhooks.map((webhook) => (
                  <SelectItem key={webhook.name} value={webhook.name}>
                    {webhook.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Regex"}
        </Button>
      </form>
    </div>
  );
}
