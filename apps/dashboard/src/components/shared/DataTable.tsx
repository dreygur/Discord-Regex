"use client"

import * as React from "react"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
  flexRender,
  type Row,
  type Cell
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[] // Ensure flexibility for column types
  data: TData[] // Type-safe data prop
  addRoute?: string
}

export function DataTable<TData>({
  columns,
  data,
  addRoute
}: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = React.useState("")

  const filteredData = React.useMemo(() => {
    if (globalFilter.length < 3) return data

    const lowerCaseFilter = globalFilter.toLowerCase()
    return data.filter((item) =>
      Object.values(item as Record<string, unknown>).some((value) =>
        typeof value === "string" && value.toLowerCase().includes(lowerCaseFilter)
      ),
    )
  }, [globalFilter, data])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Function to get cell value for card display
  const getCellValue = (row: Row<TData>, columnId: string) => {
    const cell = row.getVisibleCells().find((cell: Cell<TData, unknown>) => cell.column.id === columnId)
    if (!cell) return null
    return flexRender(cell.column.columnDef.cell, cell.getContext())
  }

  return (
    <div className="p-4 space-y-4">
      {/* Search Input and Add Button */}
      <div className="flex justify-between items-center gap-3">
        <Input
          placeholder="Search..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="flex justify-end max-w-5xl"
        />
        {addRoute && (
          <Link href={addRoute}>
            <Button variant="default">Add {addRoute.split("/")[1]}</Button>
          </Link>
        )}
      </div>

      {/* Table View (visible on md and larger screens) */}
      <div className="hidden md:block border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
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

      {/* Card View (visible only on small screens) */}
      <div className="md:hidden space-y-4">
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <Card key={row.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 p-4">
                <CardTitle className="text-sm font-medium">
                  {/* Use the first column as the card title */}
                  {getCellValue(row, table.getHeaderGroups()[0].headers[0].column.id)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-4">
                {/* Skip the first column as it's used in the header */}
                {table
                  .getHeaderGroups()[0]
                  .headers
                  .map((header) => (
                    <div key={header.id} className="grid grid-cols-2 gap-2 py-2 border-b last:border-0">
                      <div className="text-sm font-medium text-muted-foreground">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                      <div className="text-sm">{getCellValue(row, header.column.id)}</div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-6">No data found.</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

