import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { authoriseApi } from "@/lib/api-auth";
import { addDays, formatShort, isoToDate, todayISO } from "@/lib/date";
import { getDailyVolume, getSetsForDate, getStreak, getTotals } from "@/lib/queries";
import { dayKeyFromDate, focusExercises, getDay, totalSets } from "@/data/schedule";
import { EXERCISE_BY_SLUG } from "@/data/exercises";
import { REGION_LABELS, regionIntensity } from "@/data/muscle-map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The widget face as a PNG: the brand backdrop with frosted glass panels laid
 * over it, rendered at 3× so it stays sharp on a retina home screen.
 *
 * ?size=small|medium|large  ·  ?scale=1..3
 */
export async function GET(request: Request) {
  if (!(await authoriseApi(request))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const url = new URL(request.url);
  const origin = `${request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")}://${
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host
  }`;
  const size = url.searchParams.get("size") ?? "small";
  const small = size === "small";
  const wide = size === "medium";
  const large = size === "large";

  /* Authored in iOS widget points, multiplied up for a retina-sharp bitmap. */
  const scale = Math.min(3, Math.max(1, Number(url.searchParams.get("scale")) || 3));
  const pt = (value: number) => Math.round(value * scale);
  const boardW = wide || large ? 338 : 158;
  const boardH = large ? 354 : 158;

  const today = todayISO();
  const day = getDay(dayKeyFromDate(new Date(`${today}T12:00:00`)))!;
  const [streak, sets, totals] = await Promise.all([
    getStreak(today),
    getSetsForDate(today),
    getTotals(),
  ]);

  const planned = totalSets(day);
  const percent = planned === 0 ? 0 : Math.min(100, Math.round((sets.length / planned) * 100));

  const jsDay = isoToDate(today).getDay();
  const offsetToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  const active = new Set(streak.activeDates);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, offsetToMonday + i);
    return {
      label: "MTWTFSS"[i],
      done: active.has(date),
      isToday: date === today,
      future: date > today,
    };
  });

  const heat = large ? await getDailyVolume() : {};
  const heatDays = large
    ? Array.from({ length: 28 }, (_, i) => {
        const date = addDays(today, i - 27);
        return { date, sets: heat[date]?.sets ?? 0 };
      })
    : [];
  const heatMax = Math.max(1, ...heatDays.map((entry) => entry.sets));

  const focus = focusExercises(day);
  const nextUp = focus.find((item) => !sets.some((set) => set.exerciseSlug === item.slug));
  const muscles = Object.entries(
    regionIntensity(
      focus.map((item) => item.slug),
      Object.fromEntries(focus.map((item) => [item.slug, item.sets])),
    ),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([region]) => REGION_LABELS[region] ?? region)
    .join(" · ");

  const cold = !streak.todayLogged;
  const digits = String(streak.current).length;
  const accent = day.accent;

  /* Glass tokens. The backdrop is dark, so panels are lifted white. */
  const glassFill = "rgba(255,255,255,0.10)";
  const glassEdge = "rgba(255,255,255,0.20)";
  const label = "rgba(255,255,255,0.62)";
  const faint = "rgba(255,255,255,0.14)";

  /**
   * A frosted panel: translucent fill, lit edge, grain on top.
   *
   * The grain is the element's own background-image rather than an overlaid
   * <img> — Satori doesn't clip absolutely-positioned children to the parent's
   * border-radius, so an overlay leaves square corners poking out.
   */
  const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div
      style={{
        display: "flex",
        backgroundColor: glassFill,
        backgroundImage: `url(${origin}/noise.png)`,
        backgroundSize: `${pt(110)}px ${pt(110)}px`,
        border: `${Math.max(1, pt(0.5))}px solid ${glassEdge}`,
        borderRadius: pt(16),
        ...style,
      }}
    >
      {children}
    </div>
  );

  const Stat = ({ name, value, unit }: { name: string; value: string; unit?: string }) => (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <span
        style={{
          fontSize: pt(8),
          letterSpacing: pt(0.8),
          color: label,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {name}
      </span>
      <div style={{ display: "flex", alignItems: "flex-end", gap: pt(3), marginTop: pt(2) }}>
        <span
          style={{
            fontSize: pt(digits >= 3 ? 26 : 31),
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1,
            letterSpacing: pt(-1),
          }}
        >
          {value}
        </span>
        {unit && <span style={{ fontSize: pt(10), color: label, paddingBottom: pt(2) }}>{unit}</span>}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: pt(boardW),
          height: pt(boardH),
          display: "flex",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Backdrop */}
        <img
          src={`${origin}/widget-bg.png`}
          width={pt(boardW)}
          height={pt(boardH)}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
          alt=""
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: pt(boardW),
            height: pt(boardH),
            display: "flex",
            background:
              "linear-gradient(to top, rgba(6,4,14,0.74) 0%, rgba(6,4,14,0.2) 38%, rgba(6,4,14,0) 62%)",
          }}
        />

        {small ? (
          /*
           * Small face, kept deliberately spare: streak, the week's status
           * dots, today's focus, the date and the mark. Nothing else — a
           * 158pt board reads as clutter past about four facts. Every gap
           * here is load-bearing: at this size there is no slack to spare.
           */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              padding: pt(12),
              position: "relative",
            }}
          >
            {/* ── Date · brand ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: pt(10),
                    fontWeight: 700,
                    letterSpacing: pt(1.4),
                    color: "#ffffff",
                    textTransform: "uppercase",
                    lineHeight: 1,
                  }}
                >
                  {day.short}
                </span>
                <span style={{ fontSize: pt(8), color: label, marginTop: pt(2), lineHeight: 1 }}>
                  {formatShort(today)}
                </span>
              </div>

              <img
                src={`${origin}/logo-mark.png`}
                width={pt(44)}
                height={pt(17.5)}
                style={{ opacity: 0.92 }}
                alt=""
              />
            </div>

            {/* ── Streak ── */}
            <div style={{ display: "flex", alignItems: "center", gap: pt(7), marginTop: pt(9) }}>
              <img
                src={`${origin}/fire.png`}
                width={pt(30)}
                height={pt(30)}
                style={{ opacity: cold ? 0.3 : 1 }}
                alt=""
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: pt(3) }}>
                  <span
                    style={{
                      fontSize: pt(digits >= 3 ? 28 : 33),
                      fontWeight: 700,
                      color: "#ffffff",
                      lineHeight: 1,
                      letterSpacing: pt(-1.3),
                    }}
                  >
                    {streak.current}
                  </span>
                  <span style={{ fontSize: pt(10), color: label, paddingBottom: pt(2), lineHeight: 1 }}>
                    {streak.current === 1 ? "day" : "days"}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: pt(8),
                    color: cold ? accent : label,
                    fontWeight: cold ? 600 : 400,
                    lineHeight: 1,
                    marginTop: pt(2),
                  }}
                >
                  {streak.todayLogged ? "Logged today" : streak.current > 0 ? "At risk" : "Start today"}
                </span>
              </div>
            </div>

            {/* ── Week status dots: dashed ring = pending, filled white +
                   check = done, accent ring = today. ── */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: pt(11) }}>
              {week.map((cell, index) => (
                <div
                  key={index}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: pt(3) }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: pt(15),
                      height: pt(15),
                      borderRadius: pt(8),
                      background: cell.done ? "#ffffff" : "transparent",
                      borderWidth: pt(1.3),
                      borderStyle: cell.done ? "solid" : "dashed",
                      borderColor: cell.done
                        ? "#ffffff"
                        : cell.isToday
                          ? accent
                          : "rgba(255,255,255,0.32)",
                      opacity: cell.future ? 0.45 : 1,
                    }}
                  >
                    {cell.done && (
                      <svg width={pt(8)} height={pt(8)} viewBox="0 0 16 16">
                        <path
                          d="M3 8.5 L6.4 12 L13 4.5"
                          fill="none"
                          stroke="#0b0d11"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: pt(7),
                      color: cell.isToday ? accent : label,
                      fontWeight: cell.isToday ? 700 : 400,
                      lineHeight: 1,
                    }}
                  >
                    {cell.label}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Today's focus ── */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: "auto",
                paddingTop: pt(9),
                borderTop: `${pt(1)}px solid rgba(255,255,255,0.14)`,
              }}
            >
              <span
                style={{
                  fontSize: pt(7),
                  letterSpacing: pt(1),
                  color: label,
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                Today
              </span>
              <span
                style={{
                  fontSize: pt(13),
                  fontWeight: 700,
                  color: "#ffffff",
                  marginTop: pt(2),
                  letterSpacing: pt(-0.2),
                  lineHeight: 1.05,
                }}
              >
                {truncate(day.focus, 24)}
              </span>
            </div>
          </div>
        ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            padding: pt(large ? 12 : 9),
            position: "relative",
          }}
        >
          {/* ── Date · brand ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: pt(2),
              paddingRight: pt(2),
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: pt(5) }}>
              <span
                style={{
                  fontSize: pt(9),
                  fontWeight: 700,
                  letterSpacing: pt(1.3),
                  color: "#ffffff",
                  textTransform: "uppercase",
                }}
              >
                {day.short}
              </span>
              <span style={{ fontSize: pt(8.5), color: label }}>{formatShort(today)}</span>
            </div>

            <img
              src={`${origin}/logo-mark.png`}
              width={pt(58)}
              height={pt(23)}
              style={{ opacity: 0.95 }}
              alt=""
            />
          </div>

          {/* ── Stat panel ── */}
          <Glass style={{ marginTop: pt(4), padding: pt(7), alignItems: "center", gap: pt(8) }}>
            <img
              src={`${origin}/fire.png`}
              width={pt(34)}
              height={pt(34)}
              style={{ opacity: cold ? 0.32 : 1 }}
              alt=""
            />

            <div style={{ display: "flex", flex: 1, gap: pt(9) }}>
              <Stat
                name="Streak"
                value={String(streak.current)}
                unit={streak.current === 1 ? "day" : "days"}
              />
              <Stat name="Today" value={String(sets.length)} unit={`/ ${planned}`} />
              <Stat name="Best" value={String(streak.longest)} unit="days" />
              {large && (
                <Stat
                  name="Volume"
                  value={
                    totals.volumeKg >= 1000
                      ? (totals.volumeKg / 1000).toFixed(1)
                      : String(totals.volumeKg)
                  }
                  unit={totals.volumeKg >= 1000 ? "t" : "kg"}
                />
              )}
            </div>
          </Glass>

          {/* ── Four-week history, large only ── */}
          {large && (
            <Glass style={{ marginTop: pt(9), padding: pt(11), flexDirection: "column", gap: pt(8) }}>
              <span
                style={{
                  fontSize: pt(8),
                  letterSpacing: pt(0.8),
                  color: label,
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Last 4 weeks
              </span>
              <div style={{ display: "flex", gap: pt(4) }}>
                {Array.from({ length: 4 }, (_, column) => (
                  <div key={column} style={{ display: "flex", flexDirection: "column", gap: pt(4), flex: 1 }}>
                    {heatDays.slice(column * 7, column * 7 + 7).map((cell) => (
                      <div
                        key={cell.date}
                        style={{
                          height: pt(9),
                          borderRadius: pt(3),
                          background:
                            cell.sets === 0
                              ? faint
                              : `rgba(255,255,255,${(0.32 + (cell.sets / heatMax) * 0.62).toFixed(2)})`,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </Glass>
          )}

          {/* ── Week status dots: dashed ring = pending, filled white + check
                 = done, accent ring = today. Same language as the small face. ── */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: pt(4) }}>
            {week.map((cell, index) => (
              <div
                key={index}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: pt(3) }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: pt(large ? 22 : 16),
                    height: pt(large ? 22 : 16),
                    borderRadius: pt(large ? 11 : 8),
                    background: cell.done ? "#ffffff" : "transparent",
                    borderWidth: pt(1.4),
                    borderStyle: cell.done ? "solid" : "dashed",
                    borderColor: cell.done ? "#ffffff" : cell.isToday ? accent : "rgba(255,255,255,0.32)",
                    opacity: cell.future ? 0.45 : 1,
                  }}
                >
                  {cell.done && (
                    <svg width={pt(large ? 11 : 8)} height={pt(large ? 11 : 8)} viewBox="0 0 16 16">
                      <path
                        d="M3 8.5 L6.4 12 L13 4.5"
                        fill="none"
                        stroke="#0b0d11"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    fontSize: pt(7),
                    color: cell.isToday ? accent : label,
                    fontWeight: cell.isToday ? 700 : 400,
                  }}
                >
                  {cell.label}
                </span>
              </div>
            ))}
          </div>

          {/* ── Today's session ── */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: pt(4), gap: pt(2) }}>
            <span
              style={{
                fontSize: pt(large ? 20 : 12),
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: pt(-0.2),
                lineHeight: 1,
              }}
            >
              {truncate(day.focus.toUpperCase(), 26)}
            </span>

            <div
              style={{ display: "flex", width: "100%", height: pt(4), borderRadius: pt(2), background: faint }}
            >
              <div
                style={{
                  width: `${Math.max(percent, 2)}%`,
                  height: pt(4),
                  borderRadius: pt(2),
                  background: "#ffffff",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: pt(7), color: label, letterSpacing: pt(0.4) }}>
                {cold
                  ? streak.current > 0
                    ? "STREAK AT RISK"
                    : "START TODAY"
                  : `NEXT · ${truncate(
                      (nextUp ? EXERCISE_BY_SLUG[nextUp.slug]?.name : "") ?? "COMPLETE",
                      26,
                    ).toUpperCase()}`}
              </span>
              <span style={{ fontSize: pt(7), color: label, letterSpacing: pt(0.4) }}>
                {muscles.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        )}
      </div>
    ),
    {
      width: pt(boardW),
      height: pt(boardH),
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}

/**
 * Shorten on the natural " · " breaks rather than mid-word, so
 * "Shoulders · Traps · Calves · Tibia" becomes "Shoulders · Traps", never
 * "Shoulders · Traps · …".
 */
function truncate(value: string, max: number) {
  if (value.length <= max) return value;

  const parts = value.split(" · ");
  if (parts.length > 1) {
    let out = parts[0];
    for (const part of parts.slice(1)) {
      if (`${out} · ${part}`.length > max) break;
      out += ` · ${part}`;
    }
    return out;
  }

  return `${value.slice(0, max - 1)}…`;
}
