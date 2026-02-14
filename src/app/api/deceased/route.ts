import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-utils";
import { deceasedCreateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { generateMemorialInstances } from "@/lib/memorial";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const url = new URL(req.url);
    const householdId = url.searchParams.get("household_id");
    const q = url.searchParams.get("q");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (householdId) where.householdId = householdId;
    if (q) {
      where.OR = [
        { lastName: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { posthumousName: { contains: q, mode: "insensitive" } },
      ];
    }

    const deceased = await prisma.deceased.findMany({
      where,
      include: {
        household: { select: { id: true, name: true } },
        memorialInstances: { orderBy: { dueDate: "asc" } },
      },
      orderBy: { deathDate: "desc" },
    });

    return jsonResponse(deceased);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    const body = await req.json();
    const parsed = deceasedCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const deceased = await prisma.deceased.create({
      data: {
        ...parsed.data,
        deathDate: new Date(parsed.data.deathDate),
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "deceased",
      recordId: deceased.id,
      action: "INSERT",
      after: deceased as unknown as Record<string, unknown>,
    });

    // Auto-generate memorial instances
    try {
      await generateMemorialInstances({ deceasedId: deceased.id });
    } catch (e) {
      console.error("Memorial generation failed:", e);
    }

    return jsonResponse(deceased, 201);
  });
}
