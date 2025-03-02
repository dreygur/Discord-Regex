"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";

interface DiscordServer {
  serverId: string;
  name: string;
  status: "active" | "disabled";
  totalUsers: number;
  totalChannels: number;
}

export default function Server({ data }: { data: DiscordServer[] }) {
  const [servers, setServers] = useState<DiscordServer[]>(data || []);

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
        body: JSON.stringify({ updates: { status: newStatus } })
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

  // const handleEdit = (id: string) => {
  //   router.push(`/server/update/${id}`);
  // };

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
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className="cursor-pointer" variant={row.original.status === "active" ? "default" : "destructive"} onClick={() => handleToggleStatus(row.original.serverId, row.original.status)}>
          {row.original.status === "active" ? "Active" : "Disabled"}
        </Badge>
      )
    },
    { accessorKey: "totalChannels", header: "Channels" },
    { accessorKey: "totalUsers", header: "Users" }
    // {
    //   header: "Actions",
    //   cell: ({ row }) => (
    //     <div className="flex gap-2">
    //       <Button variant="outline" size="icon" onClick={() => handleEdit(row.original.id)}>
    //         <Pencil className="h-4 w-4" />
    //       </Button>
    //       <Button variant="destructive" size="icon" onClick={() => openDeleteModal(row.original.id)}>
    //         <Trash className="h-4 w-4" />
    //       </Button>
    //     </div>
    //   )
    // }
  ];

  return (
    <div className="p-6">
      <h1 className="text-primary text-2xl font-bold mb-4 text-primary">Discord Servers</h1>
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
