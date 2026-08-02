import { BODY_BACK, BODY_FRONT, BODY_VIEWBOX, type BodyView } from "@/data/bodymap";
import { REGION_LABELS } from "@/data/muscle-map";

type Props = {
  /** Region id → 0–1 intensity. Anything absent is drawn as untrained. */
  intensity: Record<string, number>;
  accent?: string;
  className?: string;
  /** Shows a legend of the worked regions underneath. */
  showLegend?: boolean;
  /** Drops the front/back captions — for the small dashboard version. */
  compact?: boolean;
};

/**
 * Front and back anatomical figures with the trained muscles lit up.
 * Pure SVG, no client JS — it renders on the server with the page.
 */
export function BodyMap({
  intensity,
  accent = "#ff7a1a",
  className = "",
  showLegend = true,
  compact = false,
}: Props) {
  const worked = Object.entries(intensity)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className={className}>
      <div className={`flex items-start justify-center ${compact ? "gap-0" : "gap-1"}`}>
        <Figure view={BODY_FRONT} intensity={intensity} accent={accent} label="Front" compact={compact} />
        <Figure view={BODY_BACK} intensity={intensity} accent={accent} label="Back" compact={compact} />
      </div>

      {showLegend && worked.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {worked.slice(0, 8).map(([region, value]) => (
            <span
              key={region}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background: `color-mix(in oklab, ${accent} ${18 + value * 26}%, transparent)`,
                color: accent,
              }}
            >
              {REGION_LABELS[region] ?? region}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Figure({
  view,
  intensity,
  accent,
  label,
  compact,
}: {
  view: BodyView;
  intensity: Record<string, number>;
  accent: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <figure className="flex-1">
      <svg viewBox={BODY_VIEWBOX} className="h-auto w-full" role="img" aria-label={`${label} view`}>
        {/* Base figure. */}
        <g fill="currentColor" className="text-ink-600">
          {view.silhouette.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* Worked muscles, brighter the harder they're hit. */}
        {Object.entries(view.muscles).map(([region, paths]) => {
          const value = intensity[region] ?? 0;
          if (value <= 0) return null;
          return (
            <g key={region} fill={accent} opacity={0.35 + value * 0.65}>
              {paths.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          );
        })}
      </svg>
      {!compact && (
        <figcaption className="mt-1 text-center text-[10px] uppercase tracking-wider text-mist-400">
          {label}
        </figcaption>
      )}
    </figure>
  );
}
