import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { householdUpdateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async () => {
    const { id } = await params;
    const household = await prisma.household.findUnique({
      where: { id },
      include: {
        members: { include: { person: true } },
        graves: true,
        deceased: { include: { memorialInstances: true } },
        transactions: { orderBy: { transactionDate: "desc" } },
        tasks: { orderBy: { dueDate: "asc" } },
        communicationLogs: { orderBy: { createdAt: "desc" } },
        eventParticipations: { include: { event: true } },
      },
    });

    if (!household) return errorResponse("世帯が見つかりません", 404);
    return jsonResponse(household);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (user) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = householdUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const before = await prisma.household.findUnique({ where: { id } });
    if (!before) return errorResponse("世帯が見つかりません", 404);

    const household = await prisma.household.update({
      where: { id },
      data: parsed.data,
    });

    await createAuditLog({
      userId: user.id,
      tableName: "households",
      recordId: id,
      action: "UPDATE",
      before: before as unknown as Record<string, unknown>,
      after: household as unknown as Record<string, unknown>,
    });

    return jsonResponse(household);
  });
}
