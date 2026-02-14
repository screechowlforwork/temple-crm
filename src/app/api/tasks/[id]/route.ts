import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-utils";
import { taskUpdateSchema } from "@/lib/validations";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async () => {
    const { id } = await params;
    const body = await req.json();
    const parsed = taskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return errorResponse("タスクが見つかりません", 404);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { ...parsed.data };
    if (parsed.data.dueDate) {
      data.dueDate = new Date(parsed.data.dueDate);
    }
    if (parsed.data.status === "done") {
      data.completedAt = new Date();
    } else if (parsed.data.status === "open" || parsed.data.status === "in_progress") {
      data.completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    return jsonResponse(task);
  });
}
