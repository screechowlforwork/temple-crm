import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

function toJsonInput(value: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | undefined {
  if (!value) {
    return undefined;
  }
  return value as Prisma.InputJsonValue;
}

export async function createAuditLog(params: {
  userId?: string | null;
  tableName: string;
  recordId: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      tableName: params.tableName,
      recordId: params.recordId,
      action: params.action,
      before: toJsonInput(params.before),
      after: toJsonInput(params.after),
    },
  });
}
