import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProfile, saveProfile } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorised = () => NextResponse.json({ error: "Not authorised" }, { status: 401 });

export async function GET() {
  if (!(await getSessionUser())) return unauthorised();
  return NextResponse.json({ profile: await getProfile() });
}

export async function POST(request: Request) {
  if (!(await getSessionUser())) return unauthorised();

  const body = await request.json().catch(() => ({}));
  const number = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const heightCm = number(body.heightCm);
  if (heightCm !== null && (heightCm < 100 || heightCm > 250)) {
    return NextResponse.json({ error: "Height must be between 100 and 250 cm" }, { status: 400 });
  }

  const birthYear = number(body.birthYear);
  const thisYear = new Date().getFullYear();
  if (birthYear !== null && (birthYear < 1920 || birthYear > thisYear - 5)) {
    return NextResponse.json({ error: "Enter a valid birth year" }, { status: 400 });
  }

  const sex = body.sex === "male" || body.sex === "female" ? body.sex : null;

  const profile = await saveProfile({
    heightCm,
    birthYear,
    sex,
    goalWeightKg: number(body.goalWeightKg),
  });

  return NextResponse.json({ profile });
}
