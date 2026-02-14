import { NextRequest } from "next/server";
import { authenticateUser, createToken } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("ユーザー名とパスワードを入力してください", 400);
    }

    const user = await authenticateUser(parsed.data.username, parsed.data.password);
    if (!user) {
      return errorResponse("ユーザー名またはパスワードが正しくありません", 401);
    }

    const token = createToken(user);
    const response = jsonResponse({ user });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "サーバーエラー";
    return errorResponse(message, 500);
  }
}
