"use client";

import { useEffect, useRef, useState } from "react";
import type { Clip } from "@/data/exercises";

/**
 * Looping, muted technique clip with an angle switcher (front / side / demo).
 * Clips only play while on screen so a long list doesn't decode 20 videos at once.
 */
export function ClipPlayer({ clips, className = "" }: { clips: Clip[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!video) return;
        if (entry.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const active = clips[index];
  if (!active) return null;

  return (
    <div ref={containerRef} className={`relative overflow-hidden rounded-2xl bg-ink-850 ${className}`}>
      <video
        ref={videoRef}
        key={active.src}
        src={active.src}
        poster={active.src.replace(/\.mp4$/, ".jpg")}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        // Clips are a mix of portrait and landscape; let each size itself
        // rather than letterboxing everything into one fixed box.
        className="max-h-[70dvh] w-full object-contain"
      />

      {clips.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/65 p-1 backdrop-blur">
          {clips.map((clip, i) => (
            <button
              key={clip.src}
              type="button"
              onClick={() => setIndex(i)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                i === index ? "bg-white text-ink-900" : "text-mist-300"
              }`}
            >
              {clip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Static poster used in dense lists — no video decoding at all. */
export function ClipThumb({ clips, className = "" }: { clips: Clip[]; className?: string }) {
  const poster = clips[0]?.src.replace(/\.mp4$/, ".jpg");
  return (
    <div className={`overflow-hidden rounded-xl bg-ink-700 ${className}`}>
      {poster && <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover" />}
    </div>
  );
}
