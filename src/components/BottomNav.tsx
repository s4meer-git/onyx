"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today", icon: HomeIcon },
  { href: "/schedule", label: "Schedule", icon: CalendarIcon },
  { href: "/progress", label: "Progress", icon: ChartIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-ink-900/85 pt-2 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pressable flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium tracking-wide ${
                active ? "text-white" : "text-mist-400"
              }`}
            >
              <tab.icon active={active} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

type IconProps = { active?: boolean };

function HomeIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" strokeWidth={active ? 2.4 : 1.8} stroke="currentColor">
      <path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-3.5v-6h-7v6H5A1.5 1.5 0 0 1 3.5 19z" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" strokeWidth={active ? 2.4 : 1.8} stroke="currentColor">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" strokeWidth={active ? 2.4 : 1.8} stroke="currentColor">
      <path d="M4 19.5h16" strokeLinecap="round" />
      <path d="M7 19.5V12M12 19.5V6.5M17 19.5v-5" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" strokeWidth={active ? 2.4 : 1.8} stroke="currentColor">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6" strokeLinecap="round" />
    </svg>
  );
}
