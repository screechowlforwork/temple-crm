import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { eventTargetCreateSchema } from "@/lib/validations";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async () => {
    const { id: eventId } = await params;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return errorResponse("イベントが見つかりません", 404);

    const body = await req.json();
    const parsed = eventTargetCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const target = await prisma.eventTarget.create({
      data: {
        eventId,
        ...parsed.data,
      },
      include: {
        household: { select: { id: true, name: true } },
        deceased: { select: { id: true, lastName: true, firstName: true } },
      },
    });

    // Auto-create participation record if target is a household
    if (parsed.data.householdId) {
      await prisma.eventParticipation.upsert({
        where: {
          eventId_householdId: {
            eventId,
            householdId: parsed.data.householdId,
          },
        },
        update: {},
        create: {
          eventId,
          householdId: parsed.data.householdId,
        },
      });
    }

    return jsonResponse(target, 201);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async () => {
    const { id: eventId } = await params;
    const url = new URL(req.url);
    const targetId = url.searchParams.get("targetId");

    if (!targetId) {
      return errorResponse("targetId は必須です", 400);
    }

    const target = await prisma.eventTarget.findUnique({ where: { id: targetId } });
    if (!target || target.eventId !== eventId) {
      return errorResponse("対象が見つかりません", 404);
    }

    await prisma.eventTarget.delete({ where: { id: targetId } });

    if (target.householdId) {
      await prisma.eventParticipation.deleteMany({
        where: {
          eventId,
          householdId: target.householdId,
        },
      });
    }

    return jsonResponse({ ok: true });
  });
}
