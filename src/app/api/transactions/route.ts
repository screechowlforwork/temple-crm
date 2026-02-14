import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { transactionCreateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const type = url.searchParams.get("type");
    const eventId = url.searchParams.get("event_id");
    const householdId = url.searchParams.get("household_id");
    const deceasedId = url.searchParams.get("deceased_id");
    const unlinked = url.searchParams.get("unlinked");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (from || to) {
      where.transactionDate = {};
      if (from) where.transactionDate.gte = new Date(from);
      if (to) where.transactionDate.lte = new Date(to);
    }
    if (type) where.type = type;
    if (eventId) where.eventId = eventId;
    if (householdId) where.householdId = householdId;
    if (deceasedId) where.deceasedId = deceasedId;
    if (unlinked === "true") {
      where.eventId = null;
      where.deceasedId = null;
      where.householdId = null;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        household: { select: { id: true, name: true } },
        event: { select: { id: true, title: true } },
        deceased: { select: { id: true, lastName: true, firstName: true } },
      },
      orderBy: { transactionDate: "desc" },
    });

    return jsonResponse(transactions);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    if (!["Admin", "OfficeManager"].includes(user.roleName)) {
      return errorResponse("取引の作成にはAdmin/OfficeManager権限が必要です", 403);
    }

    const body = await req.json();
    const parsed = transactionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...parsed.data,
        transactionDate: new Date(parsed.data.transactionDate),
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "transactions",
      recordId: transaction.id,
      action: "INSERT",
      after: transaction as unknown as Record<string, unknown>,
    });

    return jsonResponse(transaction, 201);
  });
}
