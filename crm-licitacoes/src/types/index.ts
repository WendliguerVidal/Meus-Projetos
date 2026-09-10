import type { Attachment, AuditLog, Deal, DealItem, Event, Note, Reminder } from "@prisma/client";
import type { DealCategory, LossReason, ReminderStatus } from "./deal";
import type { EventStatus } from "./event";

export type Role = "ADMIN" | "USER";

export type UserDTO = {
  id: string;
  name: string;
  email: string;
  role: Role;
  allowedStates: string[];
  active: boolean;
};

// Os campos abaixo são `String` no schema Prisma (SQLite não suporta enum nativo),
// então sobrescrevemos aqui com os union types validados pelo Zod (src/types/deal.ts).
export type DealWithRelations = Omit<Deal, "category" | "lossReason"> & {
  category: DealCategory;
  lossReason: LossReason | null;
  createdBy: UserDTO;
  assignedTo: UserDTO | null;
  _count?: { notes: number; reminders: number; attachments: number };
  // Só vem preenchido quando a query inclui `items` (ver getDeal em actions/deals.ts) —
  // listDeals (visão de lista/kanban) não inclui, por isso é opcional aqui.
  items?: DealItem[];
};

export type NoteWithUser = Note & { user: UserDTO };
export type ReminderWithUser = Omit<Reminder, "status"> & { status: ReminderStatus; assignedTo: UserDTO };
export type AuditLogWithUser = AuditLog & { user: UserDTO };
export type AttachmentDTO = Attachment;

export type EventWithRelations = Omit<Event, "status"> & {
  status: EventStatus;
  deal: Pick<Deal, "id" | "title" | "client" | "state"> | null;
  createdBy: UserDTO;
};

export * from "./deal";
export * from "./event";
