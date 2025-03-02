"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

export default function CreateServer() {
  const [serverId, setServerId] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalChannels, setTotalChannels] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/server`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId, name, status, totalUsers, totalChannels })
      });
      if (response.ok) {
        toast.success("Server Created Successfully");
        router.push("/");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to create server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-primary text-2xl font-bold mb-4">Create Server</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Server ID</Label>
          <Input value={serverId} onChange={e => setServerId(e.target.value)} required />
        </div>
        <div>
          <Label>Server Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(val: string) => setStatus(val as "active" | "disabled")}>
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
          <Input type="number" value={totalUsers} onChange={e => setTotalUsers(Number(e.target.value))} />
        </div>
        <div>
          <Label>Total Channels</Label>
          <Input type="number" value={totalChannels} onChange={e => setTotalChannels(Number(e.target.value))} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Server"}
        </Button>
      </form>
    </div>
  );
}
