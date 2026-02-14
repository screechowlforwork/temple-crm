import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-utils";
import { taskCreateSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const assigneeId = url.searchParams.get("assignee_id");
    const householdId = url.searchParams.get("household_id");
    const dueBefore = url.searchParams.get("due_before");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (householdId) where.householdId = householdId;
    if (dueBefore) where.dueDate = { lte: new Date(dueBefore) };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        household: { select: { id: true, name: true } },
        assignee: { select: { id: true, displayName: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    });

    return jsonResponse(tasks);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const body = await req.json();
    const parsed = taskCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const task = await prisma.task.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
        householdId: parsed.data.householdId,
        assigneeId: parsed.data.assigneeId,
      },
    });

    return jsonResponse(task, 201);
  });
}
