import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { importBrief, hashBrief } from "@/lib/repository";
import { parseBrief, validDate } from "@/lib/parser";
import { briefs } from "@/lib/schema";
import { eq } from "drizzle-orm";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host"))
        throw new Error("Origin mismatch");
    } catch {
      return NextResponse.json(
        { error: "Nguồn yêu cầu không được phép" },
        { status: 403 },
      );
    }
  }
  if (Number(request.headers.get("content-length") || 0) > 2100000)
    return NextResponse.json({ error: "Brief quá lớn." }, { status: 413 });
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  if (
    !body ||
    typeof body.raw !== "string" ||
    body.raw.length > 500000 ||
    !["preview", "save"].includes(body.action)
  )
    return NextResponse.json(
      { error: "Nội dung hoặc action không hợp lệ." },
      { status: 400 },
    );
  let parsed;
  try {
    parsed = parseBrief(body.raw);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    if (body.action === "preview") {
      const existing = (
        await db
          .select({ id: briefs.id })
          .from(briefs)
          .where(eq(briefs.hash, hashBrief(body.raw)))
          .limit(1)
      )[0];
      return NextResponse.json({
        parsed,
        duplicate: !!existing,
        existingId: existing?.id,
      });
    }
    if (
      body.date !== undefined &&
      (typeof body.date !== "string" || !validDate(body.date))
    )
      return NextResponse.json(
        { error: "Ngày không hợp lệ." },
        { status: 400 },
      );
    if (!body.date && !parsed.date)
      return NextResponse.json(
        { error: "Hãy chọn ngày của brief." },
        { status: 400 },
      );
    return NextResponse.json(await importBrief(db, body.raw, body.date));
  } catch (error) {
    console.error(
      "Import database operation failed",
      error instanceof Error ? error.name : "unknown",
    );
    return NextResponse.json(
      {
        error:
          "Không lưu/đọc được database. Kiểm tra kết nối và migration, rồi thử lại. Bản gốc vẫn ở ô nhập.",
      },
      { status: 503 },
    );
  }
}
