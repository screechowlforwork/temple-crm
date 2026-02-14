import { getSessionUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return errorResponse("認証が必要です", 401);
  }
  return jsonResponse({ user });
}
