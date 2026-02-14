import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { eventUpdateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async () => {
    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        eventTargets: {
          include: {
            household: { select: { id: true, name: true } },
            deceased: { select: { id: true, lastName: true, firstName: true, posthumousName: true } },
          },
        },
        eventParticipations: {
          include: {
            household: { select: { id: true, name: true } },
          },
          orderBy: { household: { name: "asc" } },
        },
        transactions: {
          include: {
            household: { select: { id: true, name: true } },
          },
          orderBy: { transactionDate: "desc" },
        },
        memorialInstances: {
          include: {
            deceased: {
              select: { id: true, lastName: true, firstName: true, posthumousName: true, household: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (!event) return errorResponse("イベントが見つかりません", 404);

    // Calculate toba summary
    const participations = event.eventParticipations;
    const tobaSummary = {
      totalToba: participations.reduce((sum: number, p: { tobaCount: number }) => sum + p.tobaCount, 0),
      totalAttendees: participations.reduce((sum: number, p: { attendees: number }) => sum + p.attendees, 0),
      acceptedCount: participations.filter((p: { status: string }) => p.status === "accepted").length,
      declinedCount: participations.filter((p: { status: string }) => p.status === "declined").length,
      pendingCount: participations.filter((p: { status: string }) => p.status === "pending").length,
    };

    return jsonResponse({ ...event, tobaSummary });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (user) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = eventUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const before = await prisma.event.findUnique({ where: { id } });
    if (!before) return errorResponse("イベントが見つかりません", 404);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { ...parsed.data };
    if (parsed.data.eventDate) {
      updateData.eventDate = new Date(parsed.data.eventDate);
    }

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId: user.id,
      tableName: "events",
      recordId: id,
      action: "UPDATE",
      before: before as unknown as Record<string, unknown>,
      after: event as unknown as Record<string, unknown>,
    });

    return jsonResponse(event);
  });
}
