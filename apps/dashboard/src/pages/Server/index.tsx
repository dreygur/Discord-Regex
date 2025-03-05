"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface DiscordServer {
  serverId: string;
  name: string;
  status: "active" | "disabled";
  totalUsers: number;
  email?: string;
}

export default function Server() {
  const router = useRouter();
  const [servers, setServers] = useState<DiscordServer[]>([]);

  // Toggle Status Handler
  const handleToggleStatus = async (serverId: string, currentStatus: "active" | "disabled") => {
    const newStatus = currentStatus === "active" ? "disabled" : "active";

    try {
      // Optimistically update UI
      setServers(prev => prev.map(server => (server.serverId === serverId ? { ...server, status: newStatus } : server)));

      // Call API to update status
      const response = await fetch(`/api/server/${serverId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      // Revert UI change on failure
      setServers(prev => prev.map(server => (server.serverId === serverId ? { ...server, status: currentStatus } : server)));
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/server/update/${id}`);
  };

  // const handleDelete = async () => {
  //   if (selectedServerId) {
  //     try {
  //       await fetch(`/api/server/${selectedServerId}`, { method: "DELETE" });
  //       setServers(servers.filter(server => server.serverId !== selectedServerId));
  //     } catch (error) {
  //       console.error("Error deleting server:", error);
  //     } finally {
  //       setDeleteModalOpen(false);
  //     }
  //   }
  // };

  // const openDeleteModal = (id: string) => {
  //   setSelectedServerId(id);
  //   setDeleteModalOpen(true);
  // };

  const columns: ColumnDef<DiscordServer, unknown>[] = [
    { accessorKey: "serverId", header: "Server ID" },
    { accessorKey: "name", header: "Server Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "email", header: "Server Owner Email" },
    { accessorKey: "totalUsers", header: "Users" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className="cursor-pointer" variant={row.original.status === "active" ? "default" : "destructive"} onClick={() => handleToggleStatus(row.original.serverId, row.original.status)}>
          {row.original.status === "active" ? "Active" : "Disabled"}
        </Badge>
      )
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => handleEdit(row.original.serverId)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {/* <Button variant="destructive" size="icon" onClick={() => openDeleteModal(row.original.id)}>
            <Trash className="h-4 w-4" />
          </Button> */}
        </div>
      )
    }
  ];

  useEffect(() => {
    fetch(`/api/server`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })
      .then(res => res.json())
      .then(setServers)
      .catch(console.error);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-primary">Discord Servers</h1>
      <DataTable<DiscordServer> columns={columns} data={servers} />
      {/* <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
          </DialogHeader>
          <p>This action cannot be undone. This will permanently delete the server.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </div>
  );
}
