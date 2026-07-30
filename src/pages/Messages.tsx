import { FormEvent, useState } from "react";
import { format } from "date-fns";
import { useArchive } from "@/lib/store";
import { dueMessages, newId, pendingMessages } from "@/lib/archive";
import { FutureMessage } from "@/lib/types";
import { Eyebrow } from "@/components/Letterpress";
import { ListenButton } from "@/components/ListenButton";

function fmtDate(iso: string): string {
  return format(new Date(iso + "T00:00:00"), "MMMM d, yyyy");
}

interface Draft {
  recipient: string;
  deliverOn: string;
  subject: string;
  body: string;
}

const EMPTY_DRAFT: Draft = {
  recipient: "",
  deliverOn: "",
  subject: "",
  body: "",
};

function WaxSeal({
  initial,
  size,
  pressed = false,
}: {
  initial?: string;
  size: number;
  pressed?: boolean;
}) {
  return (
    <div
      className="mx-auto flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 36% 32%, #cd6a52, #a33d2a 52%, #6e2417 96%)",
        boxShadow:
          size > 40
            ? "0 3px 10px rgba(110,36,23,0.5), inset 0 2px 6px rgba(255,255,255,0.25)"
            : undefined,
        animation: pressed
          ? "waxPress 0.65s cubic-bezier(0.34, 1.3, 0.5, 1) both"
          : undefined,
      }}
    >
      {initial && (
        <span
          className="font-serif"
          style={{
            fontSize: size * 0.35,
            color: "#f0d9c8",
            textShadow: "0 -1px 1px rgba(0,0,0,0.35)",
          }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}

function ShelfCard({
  message,
  onRemove,
}: {
  message: FutureMessage;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="group relative w-[218px] px-5 pb-5 pt-[22px]"
      style={{
        background: "#efe8d6",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="pointer-events-none absolute border"
        style={{ inset: 7, borderColor: "#ddd3bd" }}
      />
      <div className="mb-3">
        <WaxSeal size={26} />
      </div>
      <p className="text-center font-serif text-base italic leading-[1.4] text-ink-900">
        {message.subject}
      </p>
      <p className="mt-2.5 text-center text-[11px] uppercase tracking-[0.1em] text-ink-400">
        for {message.recipient}
      </p>
      <p className="mt-1 text-center text-xs text-stone-400">
        opens {fmtDate(message.deliverOn)}
      </p>
      <button
        type="button"
        onClick={() => onRemove(message.id)}
        className="absolute bottom-1.5 right-2.5 z-10 text-[11px] text-stone-400 opacity-0 transition-opacity hover:text-wax-600 focus:opacity-100 group-hover:opacity-100"
        aria-label={`Remove letter for ${message.recipient}`}
      >
        remove
      </button>
    </div>
  );
}

function OpenedLetter({
  message,
  onRemove,
}: {
  message: FutureMessage;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="group bg-paper-50 px-8 py-9 text-center shadow-sheet-dark sm:px-12">
      <Eyebrow>Opened on its day</Eyebrow>
      <h3 className="mt-3 font-serif text-2xl italic text-ink-900">
        {message.subject}
      </h3>
      <p className="mt-2 text-sm text-ink-500">
        to {message.recipient} · sealed{" "}
        {format(new Date(message.createdAt), "MMMM d, yyyy")}
      </p>
      <div className="mx-auto mt-6 max-w-[440px] border-y border-paper-200 px-1 py-6 text-left">
        <p className="whitespace-pre-wrap font-serif text-base leading-[1.8] text-[#2e2921]">
          {message.body}
        </p>
      </div>
      <div className="mt-4">
        <ListenButton
          variant="letterpress"
          label="Hear it read aloud"
          text={message.body}
        />
      </div>
      <button
        type="button"
        onClick={() => onRemove(message.id)}
        className="mt-2 text-[11px] text-stone-400 opacity-0 transition-opacity hover:text-wax-600 focus:opacity-100 group-hover:opacity-100"
      >
        remove
      </button>
    </div>
  );
}

export default function Messages() {
  const { archive, update } = useArchive();
  const today = new Date().toISOString().slice(0, 10);
  const pending = pendingMessages(archive.messages, today);
  const due = dueMessages(archive.messages, today);
  const ceremony = archive.settings.sealCeremony;

  const [stage, setStage] = useState<"write" | "confirm" | "sealed">("write");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const sealInitial = (
    archive.profile.name.trim().charAt(0) || "✦"
  ).toUpperCase();

  function draftComplete(): boolean {
    return Boolean(
      draft.recipient.trim() &&
        draft.subject.trim() &&
        draft.body.trim() &&
        draft.deliverOn &&
        draft.deliverOn > today,
    );
  }

  function beginSeal(e: FormEvent) {
    e.preventDefault();
    if (!draftComplete()) return;
    if (ceremony === "ritual") {
      setStage("confirm");
    } else {
      pressSeal();
    }
  }

  /** The point of no return: the letter is stored the moment the wax lands. */
  function pressSeal() {
    update((a) => ({
      ...a,
      messages: [
        ...a.messages,
        {
          id: newId(),
          recipient: draft.recipient.trim(),
          subject: draft.subject.trim(),
          body: draft.body.trim(),
          deliverOn: draft.deliverOn,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setStage("sealed");
  }

  function shelveAndReset() {
    setDraft(EMPTY_DRAFT);
    setStage("write");
  }

  function removeMessage(id: string) {
    if (!window.confirm("Remove this letter? It will never be delivered."))
      return;
    update((a) => ({
      ...a,
      messages: a.messages.filter((m) => m.id !== id),
    }));
  }

  const yearsAway = draft.deliverOn
    ? Math.max(
        1,
        Math.round(
          (new Date(draft.deliverOn).getTime() - Date.now()) /
            (365.25 * 24 * 3600 * 1000),
        ),
      )
    : 1;

  const field = (key: keyof Draft) => ({
    value: draft[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((d) => ({ ...d, [key]: e.target.value })),
  });

  return (
    <div className="min-h-screen bg-ink-950 px-5 pb-40 pt-14 sm:px-8 sm:pt-[70px]">
      <div className="mx-auto max-w-[680px]">
        <header className="mb-12 text-center">
          <Eyebrow dark>Letters to the future</Eyebrow>
          <h1 className="mt-4 font-serif text-3xl font-normal leading-tight text-parch-100 sm:text-[40px]">
            Write it now.
            <br />
            Let it wait.
          </h1>
          <p className="mx-auto mt-3.5 max-w-[420px] text-[15px] leading-[1.7] text-parch-300">
            A letter for a wedding day, an eighteenth birthday, an ordinary
            Tuesday years from now. Once sealed, it cannot be reopened — even
            by you.
          </p>
        </header>

        {stage === "write" && (
          <form
            onSubmit={beginSeal}
            className="bg-paper-50 px-6 pb-11 pt-12 shadow-sheet-dark sm:px-[52px]"
          >
            <div className="flex flex-wrap justify-between gap-6 border-b border-paper-200 pb-[18px]">
              <label className="min-w-[180px] flex-1 text-[11px] uppercase tracking-[0.16em] text-wax-600">
                To
                <input
                  {...field("recipient")}
                  required
                  placeholder="My daughter"
                  className="field-paper mt-1.5 text-xl"
                />
              </label>
              <label className="text-[11px] uppercase tracking-[0.16em] text-wax-600">
                To be opened
                <input
                  {...field("deliverOn")}
                  type="date"
                  required
                  min={today}
                  className="field-paper mt-1.5 text-[17px]"
                />
              </label>
            </div>
            <input
              {...field("subject")}
              required
              placeholder="For the day you graduate"
              className="field-paper mt-[22px] text-2xl italic"
            />
            <textarea
              {...field("body")}
              required
              rows={9}
              placeholder="Write it the way you'd say it."
              className="field-paper mt-4 resize-y text-[17px] leading-[1.8] text-[#2e2921]"
            />
            <div className="mt-[26px] flex flex-wrap items-center justify-between gap-4 border-t border-paper-200 pt-[22px]">
              <p className="max-w-[300px] text-xs leading-[1.6] text-ink-400">
                Sealing is permanent. The letter waits, unread, until its day.
              </p>
              <button
                type="submit"
                disabled={!draftComplete()}
                className="btn-wax shrink-0"
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 35%, #d4765f, #a33d2a 60%, #6e2417 100%)",
                  }}
                />
                Seal this letter
              </button>
            </div>
          </form>
        )}

        {stage === "confirm" && (
          <div
            className="bg-paper-50 px-6 py-14 text-center shadow-sheet-dark sm:px-[52px]"
            style={{ animation: "riseIn 0.5s ease both" }}
          >
            <p className="eyebrow tracking-[0.24em] text-wax-600">
              Read it once more
            </p>
            <h2 className="mt-[18px] font-serif text-[28px] font-normal italic text-ink-900">
              {draft.subject}
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              to {draft.recipient} · to be opened {fmtDate(draft.deliverOn)}
            </p>
            <div className="mx-auto mt-7 max-w-[440px] border-y border-paper-200 px-1 py-6 text-left">
              <p className="whitespace-pre-wrap font-serif text-base leading-[1.8] text-[#2e2921]">
                {draft.body}
              </p>
            </div>
            <p className="mx-auto mt-[26px] max-w-[340px] text-[13px] leading-[1.6] text-ink-400">
              Once the wax is pressed, this letter closes — for{" "}
              {yearsAway === 1 ? "a year or more" : `${yearsAway} years`}. Not
              even you can open it early.
            </p>
            <div className="mt-[26px] flex items-center justify-center gap-[22px]">
              <button
                type="button"
                onClick={() => setStage("write")}
                className="border-b border-paper-200 p-0.5 text-sm text-ink-400 hover:text-ink-900"
              >
                Keep writing
              </button>
              <button type="button" onClick={pressSeal} className="btn-wax">
                Press the seal
              </button>
            </div>
          </div>
        )}

        {stage === "sealed" && (
          <div
            className="text-center"
            style={{ animation: "dimIn 0.7s ease both" }}
          >
            <div
              className="relative mx-auto max-w-[480px] px-8 py-[54px] sm:px-11"
              style={{
                background: "#f0e9d8",
                boxShadow: "0 10px 50px rgba(0,0,0,0.6)",
              }}
            >
              <div
                className="pointer-events-none absolute border border-paper-200"
                style={{ inset: 10 }}
              />
              <p className="font-serif text-2xl italic text-ink-900">
                {draft.subject}
              </p>
              <p className="mt-2.5 text-[13px] tracking-[0.08em] text-ink-500">
                for {draft.recipient}
              </p>
              <div className="mt-[30px]">
                <WaxSeal initial={sealInitial} size={74} pressed />
              </div>
              <p className="mt-7 text-xs uppercase tracking-[0.2em] text-wax-600">
                Sealed {fmtDate(today)}
              </p>
              <p className="mt-2 font-serif text-[15px] italic text-ink-500">
                to be opened {fmtDate(draft.deliverOn)}
              </p>
            </div>
            <p className="mx-auto mt-[34px] max-w-[320px] text-sm leading-[1.7] text-parch-300">
              It will wait quietly with the others. You can write another
              whenever you like.
            </p>
            <button
              type="button"
              onClick={shelveAndReset}
              className="mt-[22px] rounded-[3px] border px-6 py-3 text-sm transition-colors"
              style={{ borderColor: "#4a4034", color: "#d9cbb4" }}
            >
              Place it on the shelf
            </button>
          </div>
        )}

        {/* The shelf */}
        {pending.length > 0 && (
          <section className="mt-[72px]">
            <p className="mb-5 text-center text-xs uppercase tracking-[0.24em] text-[#6b5f4e]">
              Waiting for their day
            </p>
            <div className="flex flex-wrap justify-center gap-[18px]">
              {pending.map((m) => (
                <ShelfCard key={m.id} message={m} onRemove={removeMessage} />
              ))}
            </div>
            <div
              className="mx-auto mt-[26px] max-w-[560px]"
              style={{
                borderTop: "2px solid #2c261e",
                boxShadow: "0 3px 0 #0e0b08",
              }}
            />
          </section>
        )}

        {due.length > 0 && (
          <section className="mt-[72px] space-y-6">
            {due.map((m) => (
              <OpenedLetter key={m.id} message={m} onRemove={removeMessage} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
