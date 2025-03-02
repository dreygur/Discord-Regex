"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

export default function UpdateServer({ id }: { id: string }) {
  const router = useRouter();
  const [server, setServer] = useState<{
    serverId: string;
    name: string;
    status: "active" | "disabled";
    totalUsers: number;
    email: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServer = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/server/${id}`);
        if (!res.ok) throw new Error("Failed to fetch webhook");
        const data = await res.json();
        setServer(data);
      } catch (error) {
        toast.error("Error fetching server data", { id: "server" });
        console.error(error);
      }
    };

    fetchServer();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!server) return;

    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/server/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: server.name,
          status: server.status,
          totalUsers: server.totalUsers,
          email: server.email
        })
      });
      toast.success("Server updated successfully");
      router.push("/");
    } catch (error) {
      toast.error("Error updating server");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!server) return <p className="p-6">Loading server data...</p>;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-primary text-2xl font-bold mb-4">Edit Server</h1>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label>Server ID</Label>
          <Input value={server.serverId} disabled />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Server Name</Label>
          <Input value={server.name} onChange={e => setServer({ ...server, name: e.target.value })} disabled />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Server Owner Email</Label>
          <Input type="text" value={server.email || ''} onChange={e => setServer({ ...server, email: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <Select value={server.status} onValueChange={(val: string) => setServer({ ...server, status: val as "active" | "disabled" })}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Total Users</Label>
          <Input type="number" value={server.totalUsers} onChange={e => setServer({ ...server, totalUsers: Number(e.target.value) })} disabled />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Server"}
        </Button>
      </form>
    </div>
  );
}
