"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Loading from "../../app/loading";
import toast from "react-hot-toast";

interface Regex {
  serverId: string;
  webhookName: string;
  regexPattern: string;
}
export default function UpdateRegex({ id, pattern }: { id: string; pattern: string }) {
  const router = useRouter();
  const [regex, setRegex] = useState<Regex | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchRegex().then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRegex = async () => {
    try {
      const res = await fetch(`/api/regex/${id}/${pattern}`);
      if (!res.ok) throw new Error("Failed to fetch regex");
      const data = await res.json();
      setRegex(data);
    } catch (error) {
      toast.error("Error fetching regex data", { id: "regex" });
      console.error(error);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regex) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/regex/${id}/${pattern}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookName: regex.webhookName, serverId: regex.serverId, regexPattern: regex.regexPattern })
      });
      if (res.ok) {
        toast.success("Regex updated successfully", { id: "regex" });
        router.push("/regex");
      } else {
        toast.error("Failed to update regex", { id: "regex" });
        console.error("Failed to update regex:", res);
      }
    } catch (error) {
      toast.error("Error updating regex", { id: "regex" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!regex) return <p className="p-6 text-destructive text-4xl text-center">Error loading regex data. Please try again</p>;

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 shadow rounded-lg border">
      <h1 className="text-primary text-2xl font-bold mb-4">Edit Regex</h1>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label>Server ID</Label>
          <Input value={regex.serverId} onChange={e => setRegex({ ...regex, serverId: e.target.value.trim() })} disabled />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Regex Pattern</Label>
          <Input value={regex.regexPattern} onChange={e => setRegex({ ...regex, regexPattern: e.target.value.trim() })} disabled />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Webhook</Label>
          <Input value={regex.webhookName} onChange={e => setRegex({ ...regex, webhookName: e.target.value.trim() })} required />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Regex"}
        </Button>
      </form>
    </div>
  );
}
