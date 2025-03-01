"use client";

import * as React from "react";
import { ColumnDef, getCoreRowModel, useReactTable, flexRender } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "../ui/button";
import Link from "next/link";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[]; // Ensure flexibility for column types
  data: TData[]; // Type-safe data prop
  addRoute?: string;
}

export function DataTable<TData>({ columns, data, addRoute }: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = React.useState("");

  const filteredData = React.useMemo(() => {
    if (globalFilter.length < 3) return data;

    const lowerCaseFilter = globalFilter.toLowerCase();
    // @ts-ignore
    return data.filter(item => Object.values(item).some(value => typeof value === "string" && value.toLowerCase().includes(lowerCaseFilter)));
  }, [globalFilter, data]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="p-4 space-y-4">
      {/* Search Input */}
      <div className="flex justify-between items-center gap-3">
        <Input placeholder="Search..." value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} className="flex justify-end max-w-5xl" />
        {addRoute && (
          <Link href={addRoute}>
            <Button variant="default">Add {addRoute.split("/")[1]}</Button>
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-4">
                  No data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
