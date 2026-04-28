import { NextResponse } from "next/server";
import { taskPlatform } from "../../../lib/task-platform";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const json = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  const parsed = {
    date: String(json.date ?? ""),
    availableMinutes: Number(json.availableMinutes),
    bufferMinutes:
      json.bufferMinutes === undefined ? undefined : Number(json.bufferMinutes),
  };

  if (
    !parsed.date ||
    !Number.isInteger(parsed.availableMinutes) ||
    parsed.availableMinutes < 0 ||
    (parsed.bufferMinutes !== undefined &&
      (!Number.isInteger(parsed.bufferMinutes) || parsed.bufferMinutes < 0))
  ) {
    return NextResponse.json({ error: "invalid capacity payload" }, { status: 400 });
  }

  await taskPlatform.setCapacity(parsed);

  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(new URL("/week", request.url), { status: 303 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
