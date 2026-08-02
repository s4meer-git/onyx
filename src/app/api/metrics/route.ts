import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDailyMetric, getMetricRange, saveDailyMetric } from "@/lib/queries";
import { addDays, todayISO } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorised = () => NextResponse.json({ error: "Not authorised" }, { status: 401 });

/** Accepts a number, or null to clear the field. `undefined` leaves it alone. */
function optionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  if (!(await getSessionUser())) return unauthorised();

  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to") ?? todayISO();

  if (from) {
    return NextResponse.json({ metrics: await getMetricRange(from, to) });
  }

  const date = params.get("date") ?? todayISO();
  return NextResponse.json({ metric: await getDailyMetric(date) });
}

/** Log steps and/or bodyweight for a day. */
export async function POST(request: Request) {
  if (!(await getSessionUser())) return unauthorised();

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const date = typeof body.date === "string" ? body.date : todayISO();
  const steps = optionalNumber(body.steps);
  const weightKg = optionalNumber(body.weightKg);

  if (steps === undefined && weightKg === undefined) {
    return NextResponse.json({ error: "Send steps and/or weightKg" }, { status: 400 });
  }
  if (steps !== undefined && steps !== null && (steps < 0 || steps > 200_000)) {
    return NextResponse.json({ error: "Steps out of range" }, { status: 400 });
  }
  if (weightKg !== undefined && weightKg !== null && (weightKg < 20 || weightKg > 400)) {
    return NextResponse.json({ error: "Weight must be between 20 and 400 kg" }, { status: 400 });
  }
  // Guard against a typo putting a weigh-in far in the future.
  if (date > addDays(todayISO(), 1)) {
    return NextResponse.json({ error: "Date is in the future" }, { status: 400 });
  }

  return NextResponse.json({ metric: await saveDailyMetric({ date, steps, weightKg }) });
}
