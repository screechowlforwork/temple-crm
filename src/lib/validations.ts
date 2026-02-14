import { z } from "zod";

// ─── Households ──────────────────────────────────────────

export const householdCreateSchema = z.object({
  name: z.string().min(1, "世帯名は必須です"),
  postalCode: z.string().min(1, "郵便番号は必須です"),
  prefecture: z.string().min(1, "都道府県は必須です"),
  city: z.string().min(1, "市区町村は必須です"),
  addressLine1: z.string().min(1, "住所1は必須です"),
  addressLine2: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  lineId: z.string().optional(),
  lineAvailable: z.boolean().optional(),
  contactPriority: z.enum(["postal", "phone", "email", "line"]).optional(),
  status: z.enum(["active", "inactive", "withdrawn"]).optional(),
  notes: z.string().optional(),
});

export const householdUpdateSchema = householdCreateSchema.partial();

// ─── Deceased ────────────────────────────────────────────

export const deceasedCreateSchema = z.object({
  householdId: z.string().min(1, "世帯IDは必須です"),
  lastName: z.string().min(1, "姓は必須です"),
  firstName: z.string().min(1, "名は必須です"),
  lastNameKana: z.string().optional(),
  firstNameKana: z.string().optional(),
  posthumousName: z.string().optional(),
  deathDate: z.string().min(1, "没年月日は必須です"),
  notes: z.string().optional(),
});

export const deceasedUpdateSchema = deceasedCreateSchema.partial();

// ─── Events ──────────────────────────────────────────────

export const eventCreateSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  eventType: z.enum(["memorial", "obon", "higan", "new_year", "ceremony", "other"]),
  status: z.enum(["draft", "scheduled", "completed", "cancelled"]).optional(),
  eventDate: z.string().min(1, "日付は必須です"),
  venue: z.string().optional(),
  description: z.string().optional(),
});

export const eventUpdateSchema = eventCreateSchema.partial();

// ─── Event Targets ───────────────────────────────────────

export const eventTargetCreateSchema = z
  .object({
    householdId: z.string().optional(),
    deceasedId: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.householdId && !data.deceasedId) ||
      (!data.householdId && data.deceasedId),
    { message: "householdId か deceasedId のどちらか一方を指定してください" }
  );

// ─── Participations ─────────────────────────────────────

export const participationUpdateSchema = z.object({
  status: z
    .enum(["pending", "accepted", "declined", "no_response"])
    .optional(),
  tobaCount: z.number().int().min(0).optional(),
  attendees: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

// ─── Transactions ────────────────────────────────────────

export const transactionCreateSchema = z
  .object({
    householdId: z.string().optional(),
    eventId: z.string().optional(),
    deceasedId: z.string().optional(),
    receiptId: z.string().optional(),
    type: z.enum(["ofuse", "toba", "other"]),
    amount: z.number().int().min(0, "金額は0以上にしてください"),
    transactionDate: z.string().min(1, "日付は必須です"),
    description: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => data.eventId || data.deceasedId || data.householdId,
    {
      message:
        "eventId, deceasedId, householdId のいずれかは必須です",
    }
  );

export const transactionUpdateSchema = z.object({
  type: z.enum(["ofuse", "toba", "other"]).optional(),
  amount: z.number().int().min(0).optional(),
  transactionDate: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  receiptId: z.string().nullable().optional(),
});

// ─── Tasks ───────────────────────────────────────────────

export const taskCreateSchema = z.object({
  householdId: z.string().optional(),
  assigneeId: z.string().optional(),
  title: z.string().min(1, "タイトルは必須です"),
  description: z.string().optional(),
  status: z.enum(["open", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  dueDate: z.string().optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

// ─── Communication Logs ──────────────────────────────────

export const communicationCreateSchema = z.object({
  method: z.enum(["postal", "phone", "email", "line"]),
  direction: z.enum(["outbound", "inbound"]),
  subject: z.string().optional(),
  body: z.string().optional(),
  sentAt: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Memorial Generate ──────────────────────────────────

export const memorialGenerateSchema = z.object({
  deceasedId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

// ─── Admin ───────────────────────────────────────────────

export const userAdminUpdateSchema = z
  .object({
    userId: z.string().min(1, "ユーザーIDは必須です"),
    roleName: z.enum(["Admin", "OfficeManager", "Staff"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.roleName !== undefined || data.isActive !== undefined, {
    message: "roleName または isActive のどちらかは必須です",
  });
