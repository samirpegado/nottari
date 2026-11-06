"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { StudentActions } from "@/components/teacher/students-toolbar"
import { formatBrPhone } from "@/lib/auth-fields"
import { formatCpf } from "@/lib/br-docs"

export type StudentRow = {
  id: string
  full_name: string
  phone: string
  email: string | null
  cpf: string | null
}

const columns: ColumnDef<StudentRow>[] = [
  {
    accessorKey: "full_name",
    header: "Nome",
    cell: ({ row }) => (
      <Link href={`/alunos/${row.original.id}`} className="font-medium hover:text-[#3B82F6]">
        {row.original.full_name}
      </Link>
    ),
  },
  {
    accessorKey: "phone",
    header: "Telefone",
    cell: ({ row }) => (
      <span className="tabular-nums text-[#334155]">{formatBrPhone(row.original.phone)}</span>
    ),
  },
  {
    accessorKey: "cpf",
    header: "CPF",
    cell: ({ row }) => (
      <span className="tabular-nums text-[#334155]">
        {row.original.cpf ? formatCpf(row.original.cpf) : "—"}
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: "E-mail",
    cell: ({ row }) => (
      <span className="text-[#334155]">{row.original.email || "—"}</span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="block text-right">Ações</span>,
    cell: ({ row }) => (
      <StudentActions studentId={row.original.id} studentName={row.original.full_name} />
    ),
  },
]

export function StudentsTable({
  rows,
  emptyLabel,
}: {
  rows: StudentRow[]
  emptyLabel: string
}) {
  return <DataTable columns={columns} data={rows} emptyLabel={emptyLabel} />
}
