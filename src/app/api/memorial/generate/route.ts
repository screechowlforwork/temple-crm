import { NextRequest } from "next/server";
import { withAuth, jsonResponse } from "@/lib/api-utils";
import { memorialGenerateSchema } from "@/lib/validations";
import { generateMemorialInstances } from "@/lib/memorial";

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const body = await req.json();
    const parsed = memorialGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.flatten() }, 400);
    }

    const result = await generateMemorialInstances({
      deceasedId: parsed.data.deceasedId,
      fromDate: parsed.data.fromDate ? new Date(parsed.data.fromDate) : undefined,
      toDate: parsed.data.toDate ? new Date(parsed.data.toDate) : undefined,
    });

    return jsonResponse(result);
  });
}
