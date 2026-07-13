import { FormEvent } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ListenButton } from "@/components/ListenButton";
import { useArchive } from "@/lib/store";
import { dueMessages, newId, pendingMessages } from "@/lib/archive";
import { FutureMessage } from "@/lib/types";

function MessageCard({
  message,
  onDelete,
}: {
  message: FutureMessage;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-400">
            To {message.recipient} ·{" "}
            {format(new Date(message.deliverOn + "T00:00:00"), "MMMM d, yyyy")}
          </p>
          <h3 className="mt-1 font-serif text-lg text-ink-50">
            {message.subject}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => onDelete(message.id)}
          className="text-ink-400 transition-colors hover:text-red-400"
          aria-label={`Delete message to ${message.recipient}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
        {message.body}
      </p>
      <div className="mt-3">
        <ListenButton text={message.body} />
      </div>
    </div>
  );
}

export default function Messages() {
  const { archive, update } = useArchive();
  const today = new Date().toISOString().slice(0, 10);
  const pending = pendingMessages(archive.messages, today);
  const due = dueMessages(archive.messages, today);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const recipient = String(data.get("recipient") ?? "").trim();
    const subject = String(data.get("subject") ?? "").trim();
    const body = String(data.get("body") ?? "").trim();
    const deliverOn = String(data.get("deliverOn") ?? "");
    if (!recipient || !subject || !body || !deliverOn) return;

    update((a) => ({
      ...a,
      messages: [
        ...a.messages,
        {
          id: newId(),
          recipient,
          subject,
          body,
          deliverOn,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    form.reset();
  }

  function removeMessage(id: string) {
    if (!window.confirm("Delete this message?")) return;
    update((a) => ({
      ...a,
      messages: a.messages.filter((m) => m.id !== id),
    }));
  }

  return (
    <div>
      <PageHeader
        title="Future messages"
        subtitle="Letters that wait. Write for a wedding day, an eighteenth birthday, or an ordinary Tuesday years from now. In this preview they unlock on this device on the chosen date; delivery to loved ones is on the roadmap."
      />

      <form onSubmit={handleSubmit} className="card mb-10 space-y-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex-1 text-sm text-ink-300">
            To
            <input
              name="recipient"
              required
              className="field mt-1"
              placeholder="My daughter"
            />
          </label>
          <label className="text-sm text-ink-300">
            Deliver on
            <input
              name="deliverOn"
              type="date"
              required
              min={today}
              className="field mt-1"
            />
          </label>
        </div>
        <input
          name="subject"
          required
          className="field"
          placeholder="For the day you graduate"
        />
        <textarea
          name="body"
          required
          rows={6}
          className="field resize-y"
          placeholder="Write it the way you'd say it."
        />
        <button type="submit" className="btn-primary">
          Seal the letter
        </button>
      </form>

      {due.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-serif text-xl text-ink-50">
            Delivered
          </h2>
          <div className="space-y-3">
            {due.map((m) => (
              <MessageCard key={m.id} message={m} onDelete={removeMessage} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-serif text-xl text-ink-50">
          Waiting for their day
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-ink-400">No sealed letters yet.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((m) => (
              <MessageCard key={m.id} message={m} onDelete={removeMessage} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
