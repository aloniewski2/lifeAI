import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { DictationButton } from "@/components/DictationButton";
import { Eyebrow } from "@/components/Letterpress";
import { useArchive } from "@/lib/store";
import { newId } from "@/lib/archive";
import { getApiKey, setApiKey } from "@/lib/apiKey";
import { putAudio } from "@/lib/audioStore";
import { speak, stopSpeaking } from "@/lib/tts";
import {
  ChatTurn,
  EngineId,
  getSavedEngineId,
  interviewLeads,
  makeEngine,
  ollamaReachable,
  OLLAMA_MODEL,
  saveEngineId,
  webGpuAvailable,
} from "@/lib/interview";

/**
 * A conversation in progress survives navigation: it lives in
 * localStorage until it's saved as a story or explicitly restarted.
 */
const SESSION_KEY = "ai-legacy-os/interview-session";

function loadSessionTurns(): ChatTurn[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { turns?: ChatTurn[] };
    return Array.isArray(parsed.turns) ? parsed.turns : [];
  } catch {
    return [];
  }
}

const ENGINES: {
  id: EngineId;
  label: string;
  badge: string;
}[] = [
  { id: "guided", label: "Guided", badge: "Built-in, no AI — private" },
  {
    id: "webllm",
    label: "On-device AI",
    badge: "~880MB one-time download — private",
  },
  {
    id: "ollama",
    label: "Ollama",
    badge: `Your machine ("${OLLAMA_MODEL}") — private`,
  },
  { id: "claude", label: "Claude", badge: "Cloud — your own API key" },
];

function ClaudeConsentGate() {
  const { update } = useArchive();
  return (
    <div className="card mx-auto max-w-xl">
      <h2 className="font-serif text-lg text-parch-100">
        Claude sends words off-device
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-parch-300">
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
    <div className="card mx-auto max-w-xl">
      <h2 className="font-serif text-lg text-parch-100">Bring your own key</h2>
      <p className="mt-2 text-sm leading-relaxed text-parch-300">
        Claude runs with your own Anthropic API key. The key is stored only in
        this browser and is never included in archive exports. Get one at
        console.anthropic.com — or pick a free local engine above.
      </p>
      <form
        className="mt-4 flex gap-3"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const key = String(
            new FormData(e.currentTarget).get("key") ?? "",
          ).trim();
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
    <div className="card mx-auto max-w-xl">
      <h2 className="font-serif text-lg text-parch-100">
        Can't reach Ollama on this machine
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-parch-300">
        Install Ollama from ollama.com (free, open source), pull a model, and
        allow this app's origin, then reload:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-[3px] bg-ink-950 p-3 text-xs text-parch-200">
        {`ollama pull ${OLLAMA_MODEL}\nOLLAMA_ORIGINS=${window.location.origin} ollama serve`}
      </pre>
    </div>
  );
}

function WebGpuGate() {
  return (
    <div className="card mx-auto max-w-xl">
      <h2 className="font-serif text-lg text-parch-100">
        This browser can't run on-device AI
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-parch-300">
        The on-device interviewer needs WebGPU (Chrome or Edge 113+). Pick the
        Guided engine — it works everywhere — or use Ollama.
      </p>
    </div>
  );
}

/** The interviewer's presence: a candle, not a face. */
function Candle({ active }: { active: boolean }) {
  return (
    <div className="candle-anim relative mt-9 flex h-[210px] w-[200px] justify-center">
      <div
        className="absolute rounded-full"
        style={{
          top: 0,
          left: "50%",
          marginLeft: -95,
          width: 190,
          height: 190,
          background:
            "radial-gradient(circle, rgba(224,164,88,0.32), rgba(224,164,88,0) 70%)",
          animation: active
            ? "haloTalk 0.9s ease-in-out infinite"
            : "haloBreath 4.5s ease-in-out infinite",
        }}
      />
      <div
        className="absolute"
        style={{ bottom: 58, left: "50%", marginLeft: -22 }}
      >
        <div
          style={{
            width: 44,
            height: 78,
            borderRadius: "50%",
            filter: "blur(6px)",
            background:
              "radial-gradient(circle at 50% 65%, rgba(224,164,88,0.9), rgba(224,164,88,0) 70%)",
            transformOrigin: "50% 100%",
            animation: active
              ? "flameFlick 0.42s ease-in-out infinite"
              : "flameSway 3.2s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 13,
            bottom: 12,
            width: 18,
            height: 34,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 50% 60%, #fff7e0, rgba(255,247,224,0) 75%)",
            transformOrigin: "50% 100%",
            animation: active
              ? "flameFlick 0.3s ease-in-out infinite"
              : "flameSway 2.6s ease-in-out infinite",
          }}
        />
      </div>
      <div
        className="absolute"
        style={{
          bottom: 24,
          left: "50%",
          width: 30,
          marginLeft: -15,
          height: 40,
          background: "linear-gradient(#efe6d2, #d9cbae)",
          borderRadius: "4px 4px 2px 2px",
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: 18,
          left: "50%",
          width: 74,
          marginLeft: -37,
          height: 7,
          background: "#2c261e",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}

const BAR_HEIGHTS = [10, 16, 22, 26, 22, 16, 10];

function VoiceBars({ active }: { active: boolean }) {
  return (
    <div className="candle-anim mt-1.5 flex h-[26px] items-center gap-1">
      {BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className={clsx(
            "w-[3px] rounded-full",
            active ? "bg-candle-400" : "bg-ink-700",
          )}
          style={{
            height: h,
            transform: active ? undefined : "scaleY(0.3)",
            transformOrigin: "center",
            animation: active
              ? `barTalk ${0.7 + (i % 3) * 0.15}s ease-in-out ${i * 0.08}s infinite`
              : undefined,
          }}
        />
      ))}
    </div>
  );
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Wall-clock typewriter at 40cps — dropped frames jump ahead, never lag. */
function useTypewriter(text: string): { shown: string; typing: boolean } {
  const [chars, setChars] = useState(() => text.length);

  useEffect(() => {
    if (!text || reducedMotion()) {
      setChars(text.length);
      return;
    }
    setChars(0);
    const startTs = Date.now();
    const CPS = 40;
    const timer = window.setInterval(() => {
      const n = Math.floor(((Date.now() - startTs) / 1000) * CPS);
      if (n >= text.length) {
        setChars(text.length);
        window.clearInterval(timer);
      } else {
        setChars(n);
      }
    }, 90);
    return () => window.clearInterval(timer);
  }, [text]);

  return { shown: text.slice(0, chars), typing: chars < text.length };
}

export default function Interview() {
  const { archive, update } = useArchive();
  const location = useLocation();
  const [engineId, setEngineId] = useState<EngineId>(getSavedEngineId);
  const [hasKey, setHasKey] = useState(() => Boolean(getApiKey()));
  const [ollamaUp, setOllamaUp] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<{
    text: string;
    value: number;
  } | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>(() => {
    // A question handed over from the dashboard starts a fresh interview;
    // otherwise resume whatever conversation was in flight.
    const handedOver = (location.state as { question?: string } | null)
      ?.question;
    if (handedOver) {
      return [
        { role: "assistant", content: `Let's start here: ${handedOver}` },
      ];
    }
    return loadSessionTurns();
  });
  const [storyDate, setStoryDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTitle, setSavedTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readAloud, setReadAloud] = useState(
    () => localStorage.getItem("ai-legacy-os/read-aloud") === "1",
  );
  const [voiceProgress, setVoiceProgress] = useState<number | null>(null);
  const takesRef = useRef<Blob[]>([]);

  // Speak each new question with the on-device natural voice (Kokoro).
  // The first use downloads the ~86MB voice model, then it's cached.
  useEffect(() => {
    if (!readAloud) return;
    const last = turns[turns.length - 1];
    if (!last || last.role !== "assistant") return;
    let active = true;
    void speak(last.content, (p) => {
      if (active) setVoiceProgress(p < 1 ? p : null);
    }).finally(() => {
      if (active) setVoiceProgress(null);
    });
    return () => {
      active = false;
      stopSpeaking();
    };
  }, [turns, readAloud]);

  function toggleReadAloud() {
    setReadAloud((v) => {
      const next = !v;
      localStorage.setItem("ai-legacy-os/read-aloud", next ? "1" : "0");
      if (!next) {
        stopSpeaking();
        setVoiceProgress(null);
      }
      return next;
    });
  }

  // The engine reads the archive when constructed, so its questions build
  // on what's already recorded. archiveRef keeps the engine memo stable
  // across saves (rebuilding it would restart the conversation).
  const archiveRef = useRef(archive);
  archiveRef.current = archive;
  const engine = useMemo(
    () =>
      makeEngine(
        engineId,
        (text, value) => setProgress({ text, value }),
        archiveRef.current,
      ),
    [engineId],
  );
  const leads = useMemo(
    () => interviewLeads(archive, new Date().toISOString().slice(0, 10), 4),
    [archive],
  );

  // Persist the conversation so navigating away doesn't lose it.
  useEffect(() => {
    try {
      if (turns.length > 0) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ turns }));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // storage full or unavailable — the conversation still works
    }
  }, [turns]);

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

  // Start the conversation when a ready engine has nothing to resume.
  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  useEffect(() => {
    if (!ready || turnsRef.current.length > 0) return;
    let cancelled = false;
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

  function startOver() {
    stopSpeaking();
    setTurns([]);
    setSavedTitle(null);
    setError(null);
    setBusy(true);
    engine
      .nextQuestion([])
      .then((q) => setTurns([{ role: "assistant", content: q }]))
      .catch(() => setError("The interviewer couldn't start — try again."))
      .finally(() => {
        setBusy(false);
        setProgress(null);
      });
  }

  function selectEngine(id: EngineId) {
    if (id !== engineId) {
      setTurns([]);
      setSavedTitle(null);
      setError(null);
    }
    setEngineId(id);
    saveEngineId(id);
  }

  function askLead(question: string) {
    if (busy) return;
    stopSpeaking();
    setTurns((t) => [...t, { role: "assistant", content: question }]);
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
      const id = newId();
      update((a) => ({
        ...a,
        entries: [
          ...a.entries,
          {
            id,
            kind: "story",
            title: draft.title,
            content: draft.story,
            date: storyDate,
            tags: ["interview"],
            createdAt: new Date().toISOString(),
          },
        ],
      }));
      // Attach the spoken answers so the story keeps their actual voice.
      if (takesRef.current.length > 0) {
        void putAudio(id, takesRef.current);
        takesRef.current = [];
      }
      setSavedTitle(draft.title);
    } catch {
      setError("Couldn't draft the story — try again.");
    } finally {
      setSaving(false);
    }
  }

  const current = ENGINES.find((e) => e.id === engineId)!;

  // The candle speaks the latest question; earlier exchanges become transcript.
  const lastAssistantIndex = turns.reduce(
    (acc, t, i) => (t.role === "assistant" ? i : acc),
    -1,
  );
  const question =
    lastAssistantIndex >= 0 ? turns[lastAssistantIndex].content : "";
  const { shown, typing } = useTypewriter(question);
  const candleActive = typing || busy;

  const transcript: { q: string; a: string }[] = [];
  for (let i = 0; i < turns.length; i++) {
    if (turns[i].role === "user") {
      transcript.push({
        q:
          i > 0 && turns[i - 1].role === "assistant"
            ? turns[i - 1].content
            : "",
        a: turns[i].content,
      });
    }
  }

  const gate =
    engineId === "claude" && !archive.consent.conversations ? (
      <ClaudeConsentGate />
    ) : engineId === "claude" && !hasKey ? (
      <KeyGate onSaved={() => setHasKey(true)} />
    ) : engineId === "webllm" && !webGpuAvailable() ? (
      <WebGpuGate />
    ) : engineId === "ollama" && ollamaUp === false ? (
      <OllamaGate />
    ) : engineId === "ollama" && ollamaUp === null ? (
      <div className="card mx-auto flex max-w-xl items-center gap-3 text-sm text-parch-300">
        <Loader2 className="h-4 w-4 animate-spin" /> Looking for Ollama on
        localhost…
      </div>
    ) : null;

  return (
    <div
      className="min-h-screen bg-ink-950 px-5 pb-40 pt-12 sm:px-8 sm:pt-16"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 900px 520px at 50% 220px, rgba(224,164,88,0.07), transparent 70%)",
      }}
    >
      <div className="mx-auto flex max-w-[640px] flex-col items-center">
        <Eyebrow dark>The interview</Eyebrow>

        <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
          {ENGINES.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => selectEngine(e.id)}
              title={e.badge}
              className={clsx(
                "pb-0.5 text-xs uppercase tracking-[0.12em] transition-colors",
                engineId === e.id
                  ? "border-b border-wax-400 text-wax-400"
                  : "border-b border-transparent text-ink-400 hover:text-parch-300",
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-ink-400">{current.badge}</p>

        {gate ? (
          <div className="mt-12 w-full">{gate}</div>
        ) : (
          <>
            <Candle active={candleActive} />
            <VoiceBars active={candleActive} />

            <div className="mt-7 min-h-[108px] text-center">
              <p className="mx-auto max-w-[540px] font-serif text-xl italic leading-[1.5] text-parch-100 [text-wrap:balance] sm:text-[27px]">
                {shown}
                {typing && (
                  <span
                    className="text-candle-400"
                    style={{ animation: "caretBlink 0.9s step-end infinite" }}
                  >
                    |
                  </span>
                )}
                {busy && !typing && (
                  <span className="text-sm not-italic text-ink-400">
                    {progress
                      ? `${progress.text} ${Math.round(progress.value * 100)}%`
                      : "…"}
                  </span>
                )}
              </p>
            </div>

            <form
              className="mt-6 w-full max-w-[560px] bg-paper-50 px-6 py-[22px] shadow-sheet-dark sm:px-[26px]"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <textarea
                rows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Answer the way you'd tell it at the kitchen table…"
                className="field-paper resize-none text-[17px] leading-[1.7] text-[#2e2921]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-3.5 border-t border-paper-200 pt-3.5">
                <DictationButton
                  inlineConsent
                  variant="letterpress"
                  label="Dictate instead"
                  stopLabel="Stop & review"
                  disabled={busy}
                  onText={(text, audio) => {
                    setInput((v) => (v ? `${v.trimEnd()} ${text}` : text));
                    takesRef.current.push(audio);
                  }}
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="btn-ink px-[22px] py-3 text-sm"
                >
                  That's my answer
                </button>
              </div>
            </form>

            {error && <p className="mt-4 text-sm text-wax-400">{error}</p>}
            {savedTitle && (
              <p className="mt-4 text-sm text-parch-200">
                Saved "{savedTitle}" to your archive —{" "}
                <Link
                  to="/app/timeline"
                  className="text-candle-400 underline hover:text-parch-100"
                >
                  see it on the timeline
                </Link>
                .
              </p>
            )}

            {leads.length > 0 && (
              <div className="mt-10 text-center">
                <p className="mb-3.5 text-[11px] uppercase tracking-[0.24em] text-[#6b5f4e]">
                  Worth asking about
                </p>
                <div className="flex max-w-[560px] flex-wrap justify-center gap-2.5">
                  {leads.map((lead) => (
                    <button
                      key={lead.label}
                      type="button"
                      onClick={() => askLead(lead.question)}
                      disabled={busy}
                      title={lead.question}
                      className="rounded-full border border-ink-700 px-[18px] py-2.5 font-serif text-[15px] italic text-parch-200 transition-colors hover:border-parch-300 hover:text-parch-100 disabled:opacity-50"
                    >
                      {lead.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.14em]">
              <button
                type="button"
                onClick={toggleReadAloud}
                aria-pressed={readAloud}
                className={clsx(
                  "transition-colors",
                  readAloud
                    ? "text-candle-400"
                    : "text-ink-400 hover:text-parch-300",
                )}
              >
                {voiceProgress != null
                  ? `Voice… ${Math.round(voiceProgress * 100)}%`
                  : readAloud
                    ? "♪ Voice on"
                    : "♪ Voice off"}
              </button>
              <button
                type="button"
                onClick={startOver}
                disabled={busy}
                className="text-ink-400 transition-colors hover:text-parch-300 disabled:opacity-50"
              >
                Start over
              </button>
              <label className="flex items-center gap-2 text-ink-400">
                Happened on
                <input
                  type="date"
                  value={storyDate}
                  onChange={(e) => setStoryDate(e.target.value)}
                  className="field w-auto py-1 text-xs normal-case tracking-normal"
                />
              </label>
              <button
                type="button"
                disabled={
                  saving || turns.filter((t) => t.role === "user").length === 0
                }
                onClick={saveAsStory}
                className="text-wax-400 transition-colors hover:text-parch-100 disabled:opacity-40"
              >
                {saving ? "Binding…" : "Turn this into a story"}
              </button>
            </div>

            {transcript.length > 0 && (
              <div className="mt-14 flex w-full max-w-[560px] flex-col gap-[22px] border-t border-ink-800 pt-[26px]">
                {transcript.map((t, i) => (
                  <div key={i}>
                    {t.q && (
                      <p className="font-serif text-[15px] italic text-[#8a7c65]">
                        {t.q}
                      </p>
                    )}
                    <p className="mt-1.5 text-sm leading-[1.7] text-parch-200">
                      {t.a}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
