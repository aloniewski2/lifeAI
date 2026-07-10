import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Loader2, MessageCircle, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DictationButton } from "@/components/DictationButton";
import { useArchive } from "@/lib/store";
import { newId } from "@/lib/archive";
import { getApiKey, setApiKey } from "@/lib/apiKey";
import { ChatTurn, draftStory, nextQuestion } from "@/lib/interviewer";

function ConsentGate() {
  const { update } = useArchive();
  return (
    <div className="card">
      <h2 className="font-serif text-lg text-ink-50">
        The interviewer sends words off-device
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        Unlike everything else in this app, the AI interviewer sends what you
        type in this conversation to Anthropic's API to generate its
        questions. Nothing else in your archive is sent — only this
        conversation, only while you use it. It stays off unless you turn it
        on.
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
        I understand — enable conversations
      </button>
    </div>
  );
}

function KeyGate({ onSaved }: { onSaved: () => void }) {
  return (
    <div className="card">
      <h2 className="font-serif text-lg text-ink-50">Bring your own key</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        The interviewer runs on Claude using your own Anthropic API key. The
        key is stored only in this browser and is never included in archive
        exports. Get one at console.anthropic.com.
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

export default function Interview() {
  const { archive, update } = useArchive();
  const [hasKey, setHasKey] = useState(() => Boolean(getApiKey()));
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTitle, setSavedTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const enabled = archive.consent.conversations && hasKey;

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    setBusy(true);
    nextQuestion([])
      .then((q) => setTurns([{ role: "assistant", content: q }]))
      .catch(() => setError("Couldn't reach the API — check your key."))
      .finally(() => setBusy(false));
  }, [enabled]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

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
      const question = await nextQuestion(next);
      setTurns([...next, { role: "assistant", content: question }]);
    } catch {
      setError("Couldn't reach the API — check your key and try again.");
      setTurns(turns);
      setInput(trimmed);
    } finally {
      setBusy(false);
    }
  }

  async function saveAsStory() {
    if (saving || turns.filter((t) => t.role === "user").length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const draft = await draftStory(turns);
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

  return (
    <div>
      <PageHeader
        title="AI interviewer"
        subtitle="Talking beats a blank page. The interviewer asks one question at a time and follows up like a curious grandchild — then turns the conversation into a story in your own words, clearly labeled as drafted from this interview."
      />

      {!archive.consent.conversations ? (
        <ConsentGate />
      ) : !hasKey ? (
        <KeyGate onSaved={() => setHasKey(true)} />
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
            {busy && <Loader2 className="h-4 w-4 animate-spin text-ink-400" />}
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
            <DictationButton onText={(text) => setInput((v) => (v ? `${v} ${text}` : text))} />
            <button
              type="button"
              className="btn-ghost"
              disabled={saving || turns.filter((t) => t.role === "user").length === 0}
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
