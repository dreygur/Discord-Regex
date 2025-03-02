"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { database } from "@/lib/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UpdateServer({ id }: { id: string }) {
  const router = useRouter();
  const [server, setServer] = useState<{
    serverId: string;
    name: string;
    status: "active" | "disabled";
    totalUsers: number;
    totalChannels: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServer = async () => {
      if (!id) return;
      const data = await database.getServer(id as string);
      if (data) setServer(data);
    };

    fetchServer();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!server) return;

    setLoading(true);
    try {
      await database.updateServer(server.serverId, {
        name: server.name,
        status: server.status,
        totalUsers: server.totalUsers,
        totalChannels: server.totalChannels
      });
      router.push("/servers");
    } catch (error) {
      alert("Error updating server");
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
        <div>
          <Label>Server ID</Label>
          <Input value={server.serverId} disabled />
        </div>
        <div>
          <Label>Server Name</Label>
          <Input value={server.name} onChange={e => setServer({ ...server, name: e.target.value })} required />
        </div>
        <div>
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
        <div>
          <Label>Total Users</Label>
          <Input type="number" value={server.totalUsers} onChange={e => setServer({ ...server, totalUsers: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Total Channels</Label>
          <Input type="number" value={server.totalChannels} onChange={e => setServer({ ...server, totalChannels: Number(e.target.value) })} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Server"}
        </Button>
      </form>
    </div>
  );
}
