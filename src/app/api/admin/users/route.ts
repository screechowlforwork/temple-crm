import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, errorResponse, jsonResponse } from "@/lib/api-utils";
import { userAdminUpdateSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  return withAuth(
    req,
    async () => {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          displayName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ role: { name: "asc" } }, { createdAt: "asc" }],
      });

      return jsonResponse({ users });
    },
    ["Admin"]
  );
}

export async function PATCH(req: NextRequest) {
  return withAuth(
    req,
    async (currentUser) => {
      const body = await req.json();
      const parsed = userAdminUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ error: parsed.error.flatten() }, 400);
      }

      const { userId, roleName, isActive } = parsed.data;
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
      if (!targetUser) {
        return errorResponse("ユーザーが見つかりません", 404);
      }

      if (currentUser.id === targetUser.id && roleName && roleName !== "Admin") {
        return errorResponse("自分自身のAdmin権限は外せません", 400);
      }
      if (currentUser.id === targetUser.id && isActive === false) {
        return errorResponse("自分自身を無効化できません", 400);
      }

      let nextRoleId = targetUser.roleId;
      let nextRoleName = targetUser.role.name;
      if (roleName) {
        const nextRole = await prisma.role.findUnique({ where: { name: roleName } });
        if (!nextRole) {
          return errorResponse("ロールが見つかりません", 400);
        }
        nextRoleId = nextRole.id;
        nextRoleName = nextRole.name;
      }

      const nextIsActive = isActive ?? targetUser.isActive;

      if (targetUser.roleId === nextRoleId && targetUser.isActive === nextIsActive) {
        return jsonResponse({
          user: {
            id: targetUser.id,
            username: targetUser.username,
            displayName: targetUser.displayName,
            isActive: nextIsActive,
            createdAt: targetUser.createdAt,
            updatedAt: targetUser.updatedAt,
            role: { name: nextRoleName },
          },
        });
      }

      const updated = await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          roleId: nextRoleId,
          isActive: nextIsActive,
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      await createAuditLog({
        userId: currentUser.id,
        tableName: "users",
        recordId: targetUser.id,
        action: "UPDATE",
        before: {
          roleId: targetUser.roleId,
          roleName: targetUser.role.name,
          isActive: targetUser.isActive,
        },
        after: {
          roleId: nextRoleId,
          roleName: updated.role.name,
          isActive: updated.isActive,
        },
      });

      return jsonResponse({ user: updated });
    },
    ["Admin"]
  );
}
