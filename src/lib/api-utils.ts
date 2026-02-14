import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, SessionUser } from "./auth";

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withAuth(
  req: NextRequest,
  handler: (user: SessionUser) => Promise<NextResponse>,
  allowedRoles?: string[]
): Promise<NextResponse> {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return errorResponse("認証が必要です", 401);
    }
    if (allowedRoles && !allowedRoles.includes(user.roleName)) {
      return errorResponse("権限がありません", 403);
    }
    return await handler(user);
  } catch (e) {
    const message = e instanceof Error ? e.message : "サーバーエラー";
    return errorResponse(message, 500);
  }
}
