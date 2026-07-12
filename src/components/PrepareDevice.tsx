import { useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { prefetch, prefetchItems, PrefetchItem } from "@/lib/prefetch";

type ItemState =
  | { phase: "idle" }
  | { phase: "downloading"; progress: number }
  | { phase: "ready" }
  | { phase: "error" };

/**
 * "Prepare this device": download all on-device models in one go so
 * nothing has to download mid-conversation, and everything keeps working
 * offline afterwards.
 */
export function PrepareDevice() {
  const [items] = useState<PrefetchItem[]>(prefetchItems);
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [running, setRunning] = useState(false);

  function setItem(key: string, state: ItemState) {
    setStates((s) => ({ ...s, [key]: state }));
  }

  async function downloadOne(item: PrefetchItem): Promise<void> {
    setItem(item.key, { phase: "downloading", progress: 0 });
    try {
      await prefetch(item.key, (progress) =>
        setItem(item.key, { phase: "downloading", progress }),
      );
      setItem(item.key, { phase: "ready" });
    } catch {
      setItem(item.key, { phase: "error" });
    }
  }

  async function downloadAll() {
    setRunning(true);
    // Sequential on purpose: three parallel model downloads would fight
    // over bandwidth and memory on modest devices.
    for (const item of items) {
      if (!item.available) continue;
      if (states[item.key]?.phase === "ready") continue;
      await downloadOne(item);
    }
    setRunning(false);
  }

  return (
    <section className="card mb-6">
      <h2 className="font-serif text-lg text-ink-50">Prepare this device</h2>
      <p className="mt-1 text-sm text-ink-300">
        Download every on-device model now, in one go — narration, dictation,
        and the interviewer start instantly afterwards and keep working
        offline. Each downloads once and is cached; your words and voice
        still never leave the device.
      </p>
      <ul className="mt-4 divide-y divide-ink-800">
        {items.map((item) => {
          const state = states[item.key] ?? { phase: "idle" };
          return (
            <li
              key={item.key}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-ink-100">
                  {item.label}{" "}
                  <span className="text-xs text-ink-400">{item.size}</span>
                </p>
                <p className="text-xs text-ink-400">{item.detail}</p>
              </div>
              <div className="shrink-0 text-right text-xs">
                {!item.available ? (
                  <span className="text-ink-400">Unavailable</span>
                ) : state.phase === "ready" ? (
                  <span className="inline-flex items-center gap-1 text-ember-300">
                    <Check className="h-3.5 w-3.5" />
                    Ready
                  </span>
                ) : state.phase === "downloading" ? (
                  <span className="inline-flex items-center gap-1 text-ink-200">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {state.progress > 0 && state.progress < 1
                      ? `${Math.round(state.progress * 100)}%`
                      : "Starting…"}
                  </span>
                ) : state.phase === "error" ? (
                  <span className="text-red-300">Failed — try again</span>
                ) : (
                  <span className="text-ink-400">Not downloaded</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={downloadAll}
        disabled={running}
        className="btn-primary mt-4"
      >
        {running ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {running ? "Downloading…" : "Download everything"}
      </button>
      <p className="mt-2 text-xs text-ink-400">
        Best on Wi-Fi. Already-downloaded models are skipped automatically.
      </p>
    </section>
  );
}
