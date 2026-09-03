"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/rbac";
import { userSchema, type UserFormValues } from "@/types/deal";
import { parseAllowedStates, serializeAllowedStates } from "@/lib/utils";
import type { Role } from "@/types";

/** Lista básica de usuários ativos, usada em seletores de responsável (qualquer usuário autenticado). */
export async function listAssignableUsers() {
  await requireUser();
  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Role,
    allowedStates: parseAllowedStates(u.allowedStates),
    active: u.active,
  }));
}

/** Gestão completa de usuários — restrita a ADMIN. */
export async function listUsers() {
  const user = await requireUser();
  requireAdmin(user);
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Role,
    allowedStates: parseAllowedStates(u.allowedStates),
    active: u.active,
  }));
}

export async function createUser(input: UserFormValues) {
  const admin = await requireUser();
  requireAdmin(admin);
  const data = userSchema.parse(input);
  if (!data.password || data.password.length < 6) {
    throw new Error("Senha é obrigatória (mínimo 6 caracteres) para novos usuários.");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      allowedStates: serializeAllowedStates(data.allowedStates),
      active: data.active,
    },
  });

  revalidatePath("/admin/usuarios");
  return user;
}

export async function updateUser(id: string, input: UserFormValues) {
  const admin = await requireUser();
  requireAdmin(admin);
  const data = userSchema.parse(input);

  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      role: data.role,
      allowedStates: serializeAllowedStates(data.allowedStates),
      active: data.active,
      ...(passwordHash ? { passwordHash } : {}),
    },
  });

  revalidatePath("/admin/usuarios");
  return user;
}

export async function deleteUser(id: string) {
  const admin = await requireUser();
  requireAdmin(admin);
  if (admin.id === id) throw new Error("Você não pode excluir seu próprio usuário.");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/usuarios");
}
