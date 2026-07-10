import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Loader2, MessageCircle, Send } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/PageHeader";
import { DictationButton } from "@/components/DictationButton";
import { useArchive } from "@/lib/store";
import { newId } from "@/lib/archive";
import { getApiKey, setApiKey } from "@/lib/apiKey";
import {
  ChatTurn,
  EngineId,
  getSavedEngineId,
  makeEngine,
  ollamaReachable,
  OLLAMA_MODEL,
  saveEngineId,
  webGpuAvailable,
} from "@/lib/interview";

const ENGINES: {
  id: EngineId;
  label: string;
  badge: string;
  blurb: string;
}[] = [
  {
    id: "guided",
    label: "Guided",
    badge: "Built-in · private",
    blurb:
      "Curated questions and follow-ups, no AI. Your story is saved in your exact words. Works everywhere, instantly.",
  },
  {
    id: "webllm",
    label: "On-device AI",
    badge: "~880MB download · private",
    blurb:
      "Llama 3.2 runs inside your browser (WebGPU). One-time download, then it works offline — nothing ever leaves this device.",
  },
  {
    id: "ollama",
    label: "Ollama",
    badge: "Your machine · private",
    blurb: `Uses an Ollama server on this computer (model "${OLLAMA_MODEL}"). Free and open source; conversations stay on localhost.`,
  },
  {
    id: "claude",
    label: "Claude",
    badge: "Cloud · your API key",
    blurb:
      "The highest-quality interviewer. The one option where messages leave the device — sent to Anthropic's API with your own key.",
  },
];

function ClaudeConsentGate() {
  const { update } = useArchive();
  return (
    <div className="card">
      <h2 className="font-serif text-lg text-ink-50">
        Claude sends words off-device
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        Unlike the other interviewers, Claude sends what you type in this
        conversation to Anthropic's API. Nothing else in your archive is sent
        — only this conversation, only while you use it. The local engines
        (Guided, On-device AI, Ollama) never send anything anywhere.
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
  );
}

function KeyGate({ onSaved }: { onSaved: () => void }) {
  return (
    <div className="card">
      <h2 className="font-serif text-lg text-ink-50">Bring your own key</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        Claude runs with your own Anthropic API key. The key is stored only in
        this browser and is never included in archive exports. Get one at
        console.anthropic.com — or pick a free local engine above.
      </p>
      <form
        className="mt-4 flex gap-3"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const key = String(new FormData(e.currentTarget).get("key") ?? "").trim();
          if (!key) return;
          setApiKey(key);
          onSaved();
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
  );
}

function OllamaGate() {
  return (
    <div className="card">
      <h2 className="font-serif text-lg text-ink-50">
        Can't reach Ollama on this machine
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        Install Ollama from ollama.com (free, open source), pull a model, and
        allow this app's origin, then reload:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-md bg-ink-950 p-3 text-xs text-ink-200">
        {`ollama pull ${OLLAMA_MODEL}\nOLLAMA_ORIGINS=${window.location.origin} ollama serve`}
      </pre>
    </div>
  );
}

function WebGpuGate() {
  return (
    <div className="card">
      <h2 className="font-serif text-lg text-ink-50">
        This browser can't run on-device AI
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        The on-device interviewer needs WebGPU (Chrome or Edge 113+). Pick the
        Guided engine — it works everywhere — or use Ollama.
      </p>
    </div>
  );
}

export default function Interview() {
  const { archive, update } = useArchive();
  const [engineId, setEngineId] = useState<EngineId>(getSavedEngineId);
  const [hasKey, setHasKey] = useState(() => Boolean(getApiKey()));
  const [ollamaUp, setOllamaUp] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<{ text: string; value: number } | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTitle, setSavedTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const engine = useMemo(
    () =>
      makeEngine(engineId, (text, value) => setProgress({ text, value })),
    [engineId],
  );

  useEffect(() => {
    if (engineId === "ollama") {
      setOllamaUp(null);
      ollamaReachable().then(setOllamaUp);
    }
  }, [engineId]);

  const ready =
    engineId === "guided" ||
    (engineId === "webllm" && webGpuAvailable()) ||
    (engineId === "ollama" && ollamaUp === true) ||
    (engineId === "claude" && archive.consent.conversations && hasKey);

  // (Re)start the conversation whenever a ready engine is selected.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setTurns([]);
    setSavedTitle(null);
    setError(null);
    setBusy(true);
    engine
      .nextQuestion([])
      .then((q) => {
        if (!cancelled) setTurns([{ role: "assistant", content: q }]);
      })
      .catch(() => {
        if (!cancelled) setError("The interviewer couldn't start — try again.");
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
          setProgress(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [engine, ready]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  function selectEngine(id: EngineId) {
    setEngineId(id);
    saveEngineId(id);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    setSavedTitle(null);
    const next: ChatTurn[] = [...turns, { role: "user", content: trimmed }];
    setTurns(next);
    setInput("");
    setBusy(true);
    try {
      const question = await engine.nextQuestion(next);
      setTurns([...next, { role: "assistant", content: question }]);
    } catch {
      setError("The interviewer hit a snag — try again.");
      setTurns(turns);
      setInput(trimmed);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function saveAsStory() {
    if (saving || turns.filter((t) => t.role === "user").length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const draft = await engine.draftStory(turns);
      update((a) => ({
        ...a,
        entries: [
          ...a.entries,
          {
            id: newId(),
            kind: "story",
            title: draft.title,
            content: draft.story,
            date: new Date().toISOString().slice(0, 10),
            tags: ["interview"],
            createdAt: new Date().toISOString(),
          },
        ],
      }));
      setSavedTitle(draft.title);
    } catch {
      setError("Couldn't draft the story — try again.");
    } finally {
      setSaving(false);
    }
  }

  const current = ENGINES.find((e) => e.id === engineId)!;

  return (
    <div>
      <PageHeader
        title="Interviewer"
        subtitle="Talking beats a blank page. Pick an interviewer — three of the four are free and fully private — answer one question at a time, then turn the conversation into a story."
      />

      <div className="mb-2 flex flex-wrap gap-2">
        {ENGINES.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => selectEngine(e.id)}
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
      <p className="mb-6 max-w-2xl text-xs leading-relaxed text-ink-400">
        {current.blurb}
      </p>

      {engineId === "claude" && !archive.consent.conversations ? (
        <ClaudeConsentGate />
      ) : engineId === "claude" && !hasKey ? (
        <KeyGate onSaved={() => setHasKey(true)} />
      ) : engineId === "webllm" && !webGpuAvailable() ? (
        <WebGpuGate />
      ) : engineId === "ollama" && ollamaUp === false ? (
        <OllamaGate />
      ) : engineId === "ollama" && ollamaUp === null ? (
        <div className="card flex items-center gap-3 text-sm text-ink-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Looking for Ollama on
          localhost…
        </div>
      ) : (
        <div className="card flex min-h-[24rem] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pb-4">
            {turns.map((turn, i) => (
              <div
                key={i}
                className={
                  turn.role === "assistant"
                    ? "flex items-start gap-3"
                    : "flex justify-end"
                }
              >
                {turn.role === "assistant" && (
                  <MessageCircle className="mt-1 h-4 w-4 shrink-0 text-ember-400" />
                )}
                <p
                  className={
                    turn.role === "assistant"
                      ? "max-w-prose text-sm leading-relaxed text-ink-100"
                      : "max-w-prose rounded-lg bg-ink-800 px-3 py-2 text-sm leading-relaxed text-ink-100"
                  }
                >
                  {turn.content}
                </p>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-3 text-xs text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress
                  ? `${progress.text} ${Math.round(progress.value * 100)}%`
                  : null}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <p className="mb-2 text-sm text-red-300">{error}</p>}
          {savedTitle && (
            <p className="mb-2 text-sm text-ember-300">
              Saved "{savedTitle}" to your archive —{" "}
              <Link to="/app/timeline" className="underline">
                see it on the timeline
              </Link>
              .
            </p>
          )}

          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              className="field flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Answer out loud in your head, then just type it plainly."
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={busy || !input.trim()}
              aria-label="Send answer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <DictationButton
              onText={(text) => setInput((v) => (v ? `${v} ${text}` : text))}
            />
            <button
              type="button"
              className="btn-ghost"
              disabled={
                saving || turns.filter((t) => t.role === "user").length === 0
              }
              onClick={saveAsStory}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              Turn this into a story
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
