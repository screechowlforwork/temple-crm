import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-utils";
import { eventCreateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const eventType = url.searchParams.get("event_type");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status) where.status = status;
    if (eventType) where.eventType = eventType;
    if (from || to) {
      where.eventDate = {};
      if (from) where.eventDate.gte = new Date(from);
      if (to) where.eventDate.lte = new Date(to);
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        _count: {
          select: { eventTargets: true, eventParticipations: true, transactions: true },
        },
      },
      orderBy: { eventDate: "desc" },
    });

    return jsonResponse(events);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    const body = await req.json();
    const parsed = eventCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const event = await prisma.event.create({
      data: {
        ...parsed.data,
        eventDate: new Date(parsed.data.eventDate),
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "events",
      recordId: event.id,
      action: "INSERT",
      after: event as unknown as Record<string, unknown>,
    });

    return jsonResponse(event, 201);
  });
}
