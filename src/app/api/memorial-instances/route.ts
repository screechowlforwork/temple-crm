import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const url = new URL(req.url);
    const fromDate = url.searchParams.get("from");
    const toDate = url.searchParams.get("to");
    const deceasedId = url.searchParams.get("deceased_id");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (fromDate || toDate) {
      where.dueDate = {};
      if (fromDate) where.dueDate.gte = new Date(fromDate);
      if (toDate) where.dueDate.lte = new Date(toDate);
    }
    if (deceasedId) where.deceasedId = deceasedId;

    const instances = await prisma.memorialInstance.findMany({
      where,
      include: {
        deceased: {
          include: {
            household: { select: { id: true, name: true } },
          },
        },
        memorialRule: true,
        event: true,
      },
      orderBy: { dueDate: "asc" },
    });

    return jsonResponse(instances);
  });
}
