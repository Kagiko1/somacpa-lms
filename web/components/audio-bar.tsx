"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function AudioBar({
  audioUrl,
  title,
  lowData,
}: {
  audioUrl: string;
  title: string;
  lowData: boolean;
}) {
  const [cached, setCached] = React.useState(false);

  // Ask the service worker to cache this MP3 for offline listening.
  const downloadForOffline = async () => {
    try {
      const cache = await caches.open("somacpa-audio-v1");
      await cache.add(audioUrl);
      setCached(true);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-700 text-white">
          ♪
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-stone-500">
            Audio lesson{lowData ? " · low-data mode on" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={downloadForOffline}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
            cached ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-700"
          )}
        >
          {cached ? "Saved offline ✓" : "Save offline"}
        </button>
      </div>
      <audio controls preload={lowData ? "none" : "metadata"} src={audioUrl} className="mt-2 w-full" />
    </div>
  );
}
