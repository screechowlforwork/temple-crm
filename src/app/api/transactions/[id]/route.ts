import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { transactionUpdateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (user) => {
    if (!["Admin", "OfficeManager"].includes(user.roleName)) {
      return errorResponse("取引の編集にはAdmin/OfficeManager権限が必要です", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = transactionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const before = await prisma.transaction.findUnique({ where: { id } });
    if (!before) return errorResponse("取引が見つかりません", 404);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { ...parsed.data };
    if (parsed.data.transactionDate) {
      updateData.transactionDate = new Date(parsed.data.transactionDate);
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId: user.id,
      tableName: "transactions",
      recordId: id,
      action: "UPDATE",
      before: before as unknown as Record<string, unknown>,
      after: transaction as unknown as Record<string, unknown>,
    });

    return jsonResponse(transaction);
  });
}
