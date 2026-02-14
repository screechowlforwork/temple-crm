import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-utils";
import { householdCreateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const contactPriority = url.searchParams.get("contact_priority");
    const hasEmail = url.searchParams.get("has_email");
    const hasLine = url.searchParams.get("has_line");
    const q = url.searchParams.get("q");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status) where.status = status;
    if (contactPriority) where.contactPriority = contactPriority;
    if (hasEmail === "true") where.email = { not: null };
    if (hasLine === "true") where.lineAvailable = true;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { addressLine1: { contains: q, mode: "insensitive" } },
        { phoneNumber: { contains: q } },
      ];
    }

    const households = await prisma.household.findMany({
      where,
      include: {
        _count: { select: { deceased: true, transactions: true, tasks: true } },
      },
      orderBy: { name: "asc" },
    });

    return jsonResponse(households);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    const body = await req.json();
    const parsed = householdCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const household = await prisma.household.create({
      data: parsed.data,
    });

    await createAuditLog({
      userId: user.id,
      tableName: "households",
      recordId: household.id,
      action: "INSERT",
      after: household as unknown as Record<string, unknown>,
    });

    return jsonResponse(household, 201);
  });
}
