"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Loading from "../../app/loading";

export default function UpdateWebhook({ id }: { id: string }) {
  const router = useRouter();
  const [webhook, setWebhook] = useState<{ name: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchWebhook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchWebhook = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/${id}`);
      if (!res.ok) throw new Error("Failed to fetch webhook");
      const data = await res.json();
      setWebhook(data);
    } catch (error) {
      alert("Error fetching webhook data");
      console.error(error);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhook) return;

    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: webhook.name, url: webhook.url })
      });
      router.push("/webhooks");
    } catch (error) {
      alert("Error updating webhook");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!webhook) return <p className="p-6 text-destructive text-4xl text-center">Error loading webhook data. Please try again</p>;

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 shadow rounded-lg border">
      <h1 className="text-primary text-2xl font-bold mb-4">Edit Webhook</h1>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={webhook.name} onChange={e => setWebhook({ ...webhook, name: e.target.value })} required />
        </div>
        <div>
          <Label>URL</Label>
          <Input type="url" value={webhook.url} onChange={e => setWebhook({ ...webhook, url: e.target.value })} required />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Webhook"}
        </Button>
      </form>
    </div>
  );
}
