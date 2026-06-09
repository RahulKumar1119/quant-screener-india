import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { QuarterlyFinancial } from "../types/index";
import { formatIndianCurrency } from "../utils/indianFormat";

interface FinancialTableProps {
  financials: QuarterlyFinancial[];
}

const columnHelper = createColumnHelper<QuarterlyFinancial>();

export function FinancialTable({ financials }: FinancialTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("quarter", {
        header: "Quarter",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("revenue", {
        header: "Revenue",
        cell: (info) => formatIndianCurrency(info.getValue()),
      }),
      columnHelper.accessor("expenses", {
        header: "Expenses",
        cell: (info) => formatIndianCurrency(info.getValue()),
      }),
      columnHelper.accessor("operating_profit", {
        header: "Operating Profit",
        cell: (info) => formatIndianCurrency(info.getValue()),
      }),
      columnHelper.accessor("net_profit", {
        header: "Net Profit",
        cell: (info) => formatIndianCurrency(info.getValue()),
      }),
      columnHelper.accessor("margin_pct", {
        header: "Margin %",
        cell: (info) => `${info.getValue().toFixed(1)}%`,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: financials,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto glass rounded-lg min-w-0">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const isNumeric = header.id !== "quarter";
                return (
                  <th
                    key={header.id}
                    className={`px-4 py-3 font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none ${
                      isNumeric ? "text-right" : "text-left"
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div
                      className={`flex items-center gap-1 ${
                        isNumeric ? "justify-end" : ""
                      }`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" && (
                        <span className="transition-transform duration-200" aria-label="sorted ascending">▲</span>
                      )}
                      {header.column.getIsSorted() === "desc" && (
                        <span className="transition-transform duration-200" aria-label="sorted descending">▼</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, index) => (
            <tr
              key={row.id}
              className="border-t border-gray-200 dark:border-gray-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors duration-150 animate-fade-in"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {row.getVisibleCells().map((cell) => {
                const isNumeric = cell.column.id !== "quarter";
                return (
                  <td
                    key={cell.id}
                    className={`px-4 py-3 text-gray-900 dark:text-gray-100 ${
                      isNumeric ? "text-right" : "text-left"
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
