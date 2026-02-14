import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { deceasedUpdateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { generateMemorialInstances } from "@/lib/memorial";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async () => {
    const { id } = await params;
    const deceased = await prisma.deceased.findUnique({
      where: { id },
      include: {
        household: true,
        memorialInstances: {
          include: { memorialRule: true, event: true },
          orderBy: { dueDate: "asc" },
        },
        eventTargets: { include: { event: true } },
        transactions: { orderBy: { transactionDate: "desc" } },
      },
    });

    if (!deceased) return errorResponse("故人が見つかりません", 404);
    return jsonResponse(deceased);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (user) => {
    const { id } = await params;
    const body = await req.json();
    const parsed = deceasedUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const before = await prisma.deceased.findUnique({ where: { id } });
    if (!before) return errorResponse("故人が見つかりません", 404);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { ...parsed.data };
    if (parsed.data.deathDate) {
      updateData.deathDate = new Date(parsed.data.deathDate);
    }

    const deceased = await prisma.deceased.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId: user.id,
      tableName: "deceased",
      recordId: id,
      action: "UPDATE",
      before: before as unknown as Record<string, unknown>,
      after: deceased as unknown as Record<string, unknown>,
    });

    // Regenerate memorial instances if death date changed
    if (parsed.data.deathDate) {
      try {
        await generateMemorialInstances({ deceasedId: id });
      } catch (e) {
        console.error("Memorial regeneration failed:", e);
      }
    }

    return jsonResponse(deceased);
  });
}
