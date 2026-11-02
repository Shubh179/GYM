import { NextRequest, NextResponse } from "next/server";
import { exerciseAccess } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  return NextResponse.json(await exerciseAccess(req.headers.get("authorization")), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
