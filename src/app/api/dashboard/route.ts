import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-utils";
import { startOfMonth, endOfMonth, startOfDay, addDays } from "date-fns";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const now = new Date();
    const today = startOfDay(now);
    const weekLater = addDays(today, 7);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [openTasks, dueSoonTasks, thisMonthMemorials, unlinkedTransactions, recentTransactions] =
      await Promise.all([
        prisma.task.count({
          where: { status: { in: ["open", "in_progress"] } },
        }),
        prisma.task.findMany({
          where: {
            status: { in: ["open", "in_progress"] },
            dueDate: { lte: weekLater },
          },
          include: {
            household: { select: { id: true, name: true } },
            assignee: { select: { id: true, displayName: true } },
          },
          orderBy: { dueDate: "asc" },
          take: 10,
        }),
        prisma.memorialInstance.findMany({
          where: {
            dueDate: { gte: monthStart, lte: monthEnd },
            completedAt: null,
          },
          include: {
            deceased: {
              include: {
                household: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { dueDate: "asc" },
        }),
        prisma.transaction.count({
          where: {
            eventId: null,
            deceasedId: null,
            householdId: null,
          },
        }),
        prisma.transaction.findMany({
          include: {
            household: { select: { id: true, name: true } },
            event: { select: { id: true, title: true } },
          },
          orderBy: { transactionDate: "desc" },
          take: 10,
        }),
      ]);

    return jsonResponse({
      openTasks,
      dueSoonTasks,
      thisMonthMemorials,
      unlinkedTransactions,
      recentTransactions,
    });
  });
}
