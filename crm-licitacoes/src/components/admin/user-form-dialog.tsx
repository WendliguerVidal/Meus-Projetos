"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { userSchema, type UserFormValues, BRAZIL_STATES } from "@/types/deal";
import { useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { Loader2 } from "lucide-react";

export function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: { id: string; name: string; email: string; role: "ADMIN" | "USER"; allowedStates: string[]; active: boolean } | null;
}) {
  const { mutate: create, isPending: creating } = useCreateUser();
  const { mutate: update, isPending: updating } = useUpdateUser();
  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", role: "USER", allowedStates: [], active: true },
  });

  React.useEffect(() => {
    if (open) {
      reset(
        user
          ? { name: user.name, email: user.email, role: user.role, allowedStates: user.allowedStates as UserFormValues["allowedStates"], active: user.active }
          : { name: "", email: "", role: "USER", allowedStates: [], active: true }
      );
    }
  }, [open, user, reset]);

  const role = watch("role");
  const allowedStates = watch("allowedStates");
  const active = watch("active");

  const toggleState = (uf: string) => {
    const set = new Set(allowedStates);
    if (set.has(uf as never)) set.delete(uf as never);
    else set.add(uf as never);
    setValue("allowedStates", Array.from(set) as UserFormValues["allowedStates"]);
  };

  const onSubmit = (data: UserFormValues) => {
    if (isEditing) {
      update({ id: user.id, input: data }, { onSuccess: () => onOpenChange(false) });
    } else {
      create(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  const pending = creating || updating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          <DialogDescription>Defina o perfil e os estados (UF) que este usuário pode acessar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{isEditing ? "Nova Senha (opcional)" : "Senha"}</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select value={role} onValueChange={(v) => setValue("role", v as UserFormValues["role"])}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Usuário</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={(c) => setValue("active", c)} id="active" />
              <Label htmlFor="active">Ativo</Label>
            </div>
          </div>

          {role === "USER" && (
            <div className="space-y-1.5">
              <Label>Estados Permitidos (UF)</Label>
              <div className="grid max-h-40 grid-cols-4 gap-1.5 overflow-y-auto rounded-md border p-2 sm:grid-cols-6">
                {BRAZIL_STATES.map((uf) => (
                  <label key={uf} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={allowedStates.includes(uf)} onCheckedChange={() => toggleState(uf)} />
                    {uf}
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="gap-1.5">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
