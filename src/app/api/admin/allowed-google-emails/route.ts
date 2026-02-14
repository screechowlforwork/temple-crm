import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, errorResponse, jsonResponse } from "@/lib/api-utils";
import {
  allowedGoogleEmailCreateSchema,
  allowedGoogleEmailUpdateSchema,
} from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  return withAuth(
    req,
    async () => {
      const items = await prisma.allowedGoogleEmail.findMany({
        include: {
          createdByUser: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: [{ isActive: "desc" }, { email: "asc" }],
      });

      return jsonResponse({ items });
    },
    ["Admin"]
  );
}

export async function POST(req: NextRequest) {
  return withAuth(
    req,
    async (currentUser) => {
      const body = await req.json();
      const parsed = allowedGoogleEmailCreateSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ error: parsed.error.flatten() }, 400);
      }

      const normalizedEmail = parsed.data.email.trim().toLowerCase();
      const item = await prisma.allowedGoogleEmail.upsert({
        where: { email: normalizedEmail },
        create: {
          email: normalizedEmail,
          note: parsed.data.note,
          isActive: true,
          createdByUserId: currentUser.id,
        },
        update: {
          note: parsed.data.note,
          isActive: true,
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      await createAuditLog({
        userId: currentUser.id,
        tableName: "allowed_google_emails",
        recordId: item.id,
        action: "INSERT",
        after: item as unknown as Record<string, unknown>,
      });

      return jsonResponse({ item }, 201);
    },
    ["Admin"]
  );
}

export async function PATCH(req: NextRequest) {
  return withAuth(
    req,
    async (currentUser) => {
      const body = await req.json();
      const parsed = allowedGoogleEmailUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ error: parsed.error.flatten() }, 400);
      }

      const before = await prisma.allowedGoogleEmail.findUnique({
        where: { id: parsed.data.id },
      });
      if (!before) {
        return errorResponse("許可メールが見つかりません", 404);
      }

      const item = await prisma.allowedGoogleEmail.update({
        where: { id: parsed.data.id },
        data: {
          isActive: parsed.data.isActive,
          note: parsed.data.note,
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      await createAuditLog({
        userId: currentUser.id,
        tableName: "allowed_google_emails",
        recordId: item.id,
        action: "UPDATE",
        before: before as unknown as Record<string, unknown>,
        after: item as unknown as Record<string, unknown>,
      });

      return jsonResponse({ item });
    },
    ["Admin"]
  );
}

export async function DELETE(req: NextRequest) {
  return withAuth(
    req,
    async (currentUser) => {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) {
        return errorResponse("id は必須です", 400);
      }

      const before = await prisma.allowedGoogleEmail.findUnique({ where: { id } });
      if (!before) {
        return errorResponse("許可メールが見つかりません", 404);
      }

      await prisma.allowedGoogleEmail.delete({ where: { id } });

      await createAuditLog({
        userId: currentUser.id,
        tableName: "allowed_google_emails",
        recordId: id,
        action: "DELETE",
        before: before as unknown as Record<string, unknown>,
      });

      return jsonResponse({ ok: true });
    },
    ["Admin"]
  );
}
