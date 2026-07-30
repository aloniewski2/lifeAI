import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Info, Loader2, MessagesSquare, Send } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/PageHeader";
import { ListenButton } from "@/components/ListenButton";
import { useArchive } from "@/lib/store";
import { getApiKey, setApiKey } from "@/lib/apiKey";
import { ask } from "@/lib/ask";
import {
  ChatTurn,
  EngineId,
  ollamaReachable,
  OLLAMA_MODEL,
  webGpuAvailable,
} from "@/lib/interview";
import { Entry } from "@/lib/types";
import { UtilityPage } from "@/components/AppLayout";

const ENGINES: { id: EngineId; label: string; badge: string }[] = [
  { id: "guided", label: "Quotes only", badge: "No AI · private" },
  { id: "webllm", label: "On-device AI", badge: "~880MB · private" },
  { id: "ollama", label: "Ollama", badge: "Your machine · private" },
  { id: "claude", label: "Claude", badge: "Cloud · your key" },
];

interface Exchange {
  question: string;
  answer: string;
  sources: Entry[];
}

export default function Ask() {
  const { archive, update } = useArchive();
  const [engineId, setEngineId] = useState<EngineId>("guided");
  const [hasKey, setHasKey] = useState(() => Boolean(getApiKey()));
  const [ollamaUp, setOllamaUp] = useState<boolean | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ text: string; value: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const name = archive.profile.name || "them";

  useEffect(() => {
    if (engineId === "ollama") {
      setOllamaUp(null);
      ollamaReachable().then(setOllamaUp);
    }
  }, [engineId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [exchanges, busy]);

  const history = useMemo<ChatTurn[]>(
    () =>
      exchanges.flatMap((x) => [
        { role: "user" as const, content: x.question },
        { role: "assistant" as const, content: x.answer },
      ]),
    [exchanges],
  );

  const ready =
    engineId === "guided" ||
    (engineId === "webllm" && webGpuAvailable()) ||
    (engineId === "ollama" && ollamaUp === true) ||
    (engineId === "claude" && archive.consent.conversations && hasKey);

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy || !ready) return;
    setError(null);
    setInput("");
    setBusy(true);
    try {
      const result = await ask(engineId, archive, history, question, (text, value) =>
        setProgress({ text, value }),
      );
      setExchanges((xs) => [...xs, { question, ...result }]);
    } catch {
      setError("That didn't go through — try again.");
      setInput(question);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (archive.entries.length === 0) {
    return (
      <div>
        <PageHeader
          title={`Ask ${name}`}
          subtitle="Family can ask questions and hear answers drawn only from what was recorded."
        />
        <div className="card">
          <p className="text-sm text-ink-300">
            The archive is empty, so there's nothing to ask about yet. Capture
            a few stories first — every memory recorded makes this page
            richer.
          </p>
          <Link to="/app/capture" className="btn-primary mt-4">
            Capture a first memory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <UtilityPage>
      <PageHeader
        title={`Ask ${name}`}
        subtitle="Ask anything. Answers are drawn only from recorded memories — nothing is ever invented."
      />

      <div className="card mb-6 flex items-start gap-3 border-ember-500/40">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" />
        <p className="text-xs leading-relaxed text-ink-300">
          This is a <span className="text-ember-300">simulation</span>,
          reconstructed from {archive.entries.length}{" "}
          {archive.entries.length === 1 ? "memory" : "memories"} {name === "them" ? "they" : name}{" "}
          recorded. It speaks from their words; it is not them, and it will
          say so if you ask.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {ENGINES.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setEngineId(e.id)}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              engineId === e.id
                ? "bg-ember-500 text-ink-950"
                : "border border-ink-700 text-ink-300 hover:text-ink-100",
            )}
          >
            {e.label}
            <span
              className={clsx(
                "ml-2 text-xs",
                engineId === e.id ? "text-ink-800" : "text-ink-400",
              )}
            >
              {e.badge}
            </span>
          </button>
        ))}
      </div>

      {engineId === "claude" && !archive.consent.conversations ? (
        <div className="card">
          <h2 className="font-serif text-lg text-ink-50">
            Claude sends memories off-device
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            Answering with Claude sends your question and the handful of
            matching memories to Anthropic's API using your own key. The
            local engines never send anything anywhere.
          </p>
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() =>
              update((a) => ({
                ...a,
                consent: { ...a.consent, conversations: true },
              }))
            }
          >
            I understand — enable Claude
          </button>
        </div>
      ) : engineId === "claude" && !hasKey ? (
        <div className="card">
          <h2 className="font-serif text-lg text-ink-50">Bring your own key</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            Stored only in this browser, never part of archive exports.
          </p>
          <form
            className="mt-4 flex gap-3"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const key = String(new FormData(e.currentTarget).get("key") ?? "").trim();
              if (!key) return;
              setApiKey(key);
              setHasKey(true);
            }}
          >
            <input
              name="key"
              type="password"
              className="field max-w-md"
              placeholder="sk-ant-…"
              autoComplete="off"
            />
            <button type="submit" className="btn-primary">
              Save key
            </button>
          </form>
        </div>
      ) : engineId === "webllm" && !webGpuAvailable() ? (
        <div className="card">
          <p className="text-sm text-ink-300">
            On-device AI needs WebGPU (Chrome or Edge 113+). "Quotes only"
            works everywhere, or use Ollama.
          </p>
        </div>
      ) : engineId === "ollama" && ollamaUp === false ? (
        <div className="card">
          <p className="text-sm text-ink-300">
            Can't reach Ollama. Install it from ollama.com, then:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-ink-950 p-3 text-xs text-ink-200">
            {`ollama pull ${OLLAMA_MODEL}\nOLLAMA_ORIGINS=${window.location.origin} ollama serve`}
          </pre>
        </div>
      ) : engineId === "ollama" && ollamaUp === null ? (
        <div className="card flex items-center gap-3 text-sm text-ink-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Looking for Ollama…
        </div>
      ) : (
        <div className="card flex min-h-[24rem] flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto pb-4">
            {exchanges.length === 0 && !busy && (
              <p className="text-sm text-ink-400">
                Try: "What did you believe in?" · "Tell me about the summer
                trips." · "What was your first job?"
              </p>
            )}
            {exchanges.map((x, i) => (
              <div key={i}>
                <div className="flex justify-end">
                  <p className="max-w-prose rounded-lg bg-ink-800 px-3 py-2 text-sm leading-relaxed text-ink-100">
                    {x.question}
                  </p>
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <MessagesSquare className="mt-1 h-4 w-4 shrink-0 text-ember-400" />
                  <div className="min-w-0">
                    <p className="max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-ink-100">
                      {x.answer}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ListenButton text={x.answer} />
                      {x.sources.slice(0, 4).map((s) => (
                        <span
                          key={s.id}
                          className="rounded-full border border-ink-700 px-2 py-0.5 text-xs text-ink-400"
                          title={s.content.slice(0, 140)}
                        >
                          from “{s.title}” · {s.date.slice(0, 4)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-3 text-xs text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress
                  ? `${progress.text} ${Math.round(progress.value * 100)}%`
                  : "Searching their memories…"}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <p className="mb-2 text-sm text-red-300">{error}</p>}

          <form className="flex gap-3" onSubmit={send}>
            <input
              className="field flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${name} something…`}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={busy || !input.trim()}
              aria-label="Ask"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </UtilityPage>
  );
}
