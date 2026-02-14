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
    const lite = url.searchParams.get("lite") === "1";
    const summary = url.searchParams.get("summary") === "1";
    const ids = (url.searchParams.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (summary) {
      if (ids.length === 0) {
        return jsonResponse([]);
      }

      const deceasedForSummary = await prisma.deceased.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          memorialInstances: {
            select: {
              id: true,
              year: true,
              dueDate: true,
              completedAt: true,
            },
            orderBy: { dueDate: "asc" },
          },
        },
      });

      const summaryItems = deceasedForSummary.map((d) => {
        const nextMemorial = d.memorialInstances.find((m) => !m.completedAt) ?? null;
        const totalCount = d.memorialInstances.length;
        const completedCount = d.memorialInstances.filter((m) => m.completedAt).length;

        return {
          id: d.id,
          nextMemorial,
          totalCount,
          completedCount,
        };
      });

      return jsonResponse(summaryItems);
    }

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

    const deceased = lite
      ? await prisma.deceased.findMany({
          where,
          select: {
            id: true,
            lastName: true,
            firstName: true,
            posthumousName: true,
            household: { select: { id: true, name: true } },
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        })
      : await prisma.deceased.findMany({
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
