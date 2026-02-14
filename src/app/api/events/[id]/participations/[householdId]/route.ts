import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { participationUpdateSchema } from "@/lib/validations";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; householdId: string }> }
) {
  return withAuth(req, async () => {
    const { id: eventId, householdId } = await params;

    const body = await req.json();
    const parsed = participationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const existing = await prisma.eventParticipation.findUnique({
      where: { eventId_householdId: { eventId, householdId } },
    });

    if (!existing) {
      return errorResponse("参加記録が見つかりません", 404);
    }

    const participation = await prisma.eventParticipation.update({
      where: { eventId_householdId: { eventId, householdId } },
      data: parsed.data,
      include: {
        household: { select: { id: true, name: true } },
      },
    });

    return jsonResponse(participation);
  });
}
