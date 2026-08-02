import { NextResponse } from "next/server";
import { CORS_HEADERS, authoriseApi } from "@/lib/api-auth";
import { addDays, todayISO } from "@/lib/date";
import { bmi, bmiBand, bmr, healthyWeightRange, stepDistanceKm, tdee, weeklyTrend } from "@/lib/body";
import { getLatestWeight, getMetricRange, getProfile } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

/** Body metrics and everything derived from them. */
export async function GET(request: Request) {
  if (!(await authoriseApi(request))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401, headers: CORS_HEADERS });
  }

  const today = todayISO();
  const [profile, metrics, latest] = await Promise.all([
    getProfile(),
    getMetricRange(addDays(today, -90), today),
    getLatestWeight(today),
  ]);

  const weight = latest?.weightKg ?? null;
  const height = profile.heightCm;
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null;

  const stepDays = metrics.filter((metric) => metric.steps);
  const averageSteps = stepDays.length
    ? stepDays.reduce((sum, day) => sum + (day.steps ?? 0), 0) / stepDays.length
    : 0;

  const bmiValue = weight && height ? bmi(weight, height) : null;
  const resting = weight && height && age && profile.sex ? bmr(weight, height, age, profile.sex) : null;

  return NextResponse.json(
    {
      date: today,
      profile,
      latest: { weightKg: weight, weighedOn: latest?.date ?? null },
      derived: {
        bmi: bmiValue === null ? null : Math.round(bmiValue * 10) / 10,
        bmiBand: bmiValue === null ? null : bmiBand(bmiValue).label,
        healthyWeightRangeKg: height
          ? healthyWeightRange(height).map((value) => Math.round(value * 10) / 10)
          : null,
        restingKcal: resting === null ? null : Math.round(resting),
        dailyKcal: resting === null ? null : Math.round(tdee(resting, averageSteps)),
        weightTrendKgPerWeek: weeklyTrend(
          metrics
            .filter((metric) => metric.weightKg !== null)
            .slice(-28)
            .map((metric) => ({ date: metric.date, value: metric.weightKg as number })),
        ),
      },
      steps: {
        averageDaily: Math.round(averageSteps),
        distanceKmPerDay: height ? Math.round(stepDistanceKm(averageSteps, height) * 10) / 10 : null,
        loggedDays: stepDays.length,
        total: stepDays.reduce((sum, day) => sum + (day.steps ?? 0), 0),
      },
      history: metrics,
    },
    { headers: CORS_HEADERS },
  );
}
