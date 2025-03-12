"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import toast from "react-hot-toast";

interface Regex {
  serverId: string;
  webhookName: string;
  regexPattern: string;
}

export default function Regex() {
  const [regexes, setRegexes] = useState<Regex[]>([]);
  const [selectedRegex, setSelectedRegex] = useState<Regex | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!selectedRegex) return;
    try {
      const res = await fetch(`/api/regex/${selectedRegex.serverId}/${encodeURIComponent(selectedRegex.regexPattern)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        getRegexes();
        setShowDeleteModal(false);
      } else {
        toast.error("Failed to delete regex", { id: "regex" });
        console.error("Failed to delete regex:", res);
        setShowDeleteModal(false);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Failed to delete regex", { id: "regex" });
      console.error("Error deleting regex:", error);
    }
  };

  const columns: ColumnDef<Regex, unknown>[] = [
    {
      accessorKey: "webhookName",
      header: "Webhook",
      cell: ({ row }) => <span>{row.original.webhookName}</span>
    },
    {
      accessorKey: "serverId",
      header: "Server ID",
      cell: ({ row }) => <span>{row.original.serverId}</span>
    },
    {
      accessorKey: "regexPattern",
      header: "Regex Pattern",
      cell: ({ row }) => <span>{row.original.regexPattern}</span>
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push(`/regex/update/${row.original.serverId}/${encodeURIComponent(row.original.regexPattern)}`)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setSelectedRegex(row.original);
              setShowDeleteModal(true);
            }}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  const getRegexes = () => {
    fetch(`/api/regex`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })
      .then(res => res.json())
      .then(setRegexes)
      .catch(console.error);
  }
  useEffect(() => {
    getRegexes();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-primary text-2xl font-bold mb-4">Regex</h1>
      <DataTable<Regex> columns={columns} data={regexes} addRoute="/regex/create" />
      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the regex <strong>{selectedRegex?.regexPattern}</strong>?
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
