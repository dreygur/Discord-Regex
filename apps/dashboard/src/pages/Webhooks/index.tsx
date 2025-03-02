"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Webhook {
  name: string;
  url: string;
  createdAt: string;
}

export default function Webhooks({ data }: { data: Webhook[] }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(data || []);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!selectedWebhook) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/${selectedWebhook.name}`, {
        method: "DELETE"
      });
      setWebhooks(webhooks.filter(w => w.name !== selectedWebhook.name));
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error deleting webhook:", error);
    }
  };

  const columns: ColumnDef<Webhook, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span>{row.original.name}</span>
    },
    {
      accessorKey: "url",
      header: "URL",
      cell: ({ row }) => (
        <a href={row.original.url} className="text-blue-500 underline" target="_blank">
          {row.original.url}
        </a>
      )
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString()
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push(`/webhooks/update/${row.original.name}`)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setSelectedWebhook(row.original);
              setShowDeleteModal(true);
            }}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-primary text-2xl font-bold mb-4">Webhooks</h1>
      <DataTable<Webhook> columns={columns} data={webhooks} addRoute="/webhooks/create" />
      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the webhook <strong>{selectedWebhook?.name}</strong>?
          </DialogDescription>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
