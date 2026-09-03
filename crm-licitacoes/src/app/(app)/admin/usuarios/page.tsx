"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsers, useDeleteUser } from "@/hooks/use-users";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { Plus, Pencil, Trash2, ShieldAlert } from "lucide-react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  allowedStates: string[];
  active: boolean;
};

export default function UsuariosPage() {
  const { data: session } = useSession();
  const { data: users, isLoading, error } = useUsers();
  const { mutate: remove } = useDeleteUser();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserRow | null>(null);

  if (session && session.user.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie perfis e restrições de acesso por estado.</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setEditingUser(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {users && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Estados</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                      {u.role === "ADMIN" ? "Administrador" : "Usuário"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.role === "ADMIN" ? (
                      <span className="text-xs text-muted-foreground">Todos</span>
                    ) : u.allowedStates.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Nenhum</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.allowedStates.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? "secondary" : "outline"}>{u.active ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingUser(u);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(u.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} user={editingUser} />
    </div>
  );
}
