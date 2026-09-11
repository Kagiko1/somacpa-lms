"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatKes } from "@/lib/content";

export function UnlockButton({ courseId, priceKes, title }: { courseId: string; priceKes: number; title: string }) {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const unlock = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url; // Flutterwave hosted checkout
      } else {
        // MVP stub: grant instantly so the flow is testable end-to-end
        setMsg(data.message ?? "Unlocked for testing ✓ — connect Flutterwave for live M-Pesa.");
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch {
      setMsg("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Button onClick={unlock} size="lg" disabled={busy} className="w-full sm:w-auto">
        {busy ? "Processing…" : `Unlock full course · ${formatKes(priceKes)}`}
      </Button>
      {msg && <p className="mt-2 text-sm text-stone-600">{msg}</p>}
      <p className="mt-1 text-xs text-stone-400">Pay with M-Pesa at checkout · One-time payment, lifetime access</p>
    </div>
  );
}
