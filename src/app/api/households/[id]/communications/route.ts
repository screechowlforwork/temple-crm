import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { communicationCreateSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async () => {
    const { id } = await params;
    const logs = await prisma.communicationLog.findMany({
      where: { householdId: id },
      include: {
        user: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(logs);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (user) => {
    const { id: householdId } = await params;

    const household = await prisma.household.findUnique({ where: { id: householdId } });
    if (!household) return errorResponse("世帯が見つかりません", 404);

    const body = await req.json();
    const parsed = communicationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const log = await prisma.communicationLog.create({
      data: {
        method: parsed.data.method,
        direction: parsed.data.direction,
        subject: parsed.data.subject,
        body: parsed.data.body,
        notes: parsed.data.notes,
        sentAt: parsed.data.sentAt ? new Date(parsed.data.sentAt) : undefined,
        householdId,
        userId: user.id,
      },
    });
    return jsonResponse(log, 201);
  });
}
