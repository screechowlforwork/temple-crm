import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  return withAuth(
    req,
    async () => {
      const url = new URL(req.url);
      const tableName = url.searchParams.get("table_name");
      const recordId = url.searchParams.get("record_id");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};
      if (tableName) where.tableName = tableName;
      if (recordId) where.recordId = recordId;

      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return jsonResponse(logs);
    },
    ["Admin", "OfficeManager"]
  );
}
