import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Clock, Mail, PenLine, RefreshCw, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useArchive } from "@/lib/store";
import { chaptersByYear, pendingMessages } from "@/lib/archive";
import { anotherPrompt, promptOfTheDay } from "@/lib/prompts";
import { ENTRY_KIND_LABELS } from "@/lib/types";

export default function Dashboard() {
  const { archive, update } = useArchive();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [prompt, setPrompt] = useState(() => promptOfTheDay(today));
  const chapters = chaptersByYear(archive.entries);
  const pending = pendingMessages(archive.messages, today);
  const name = archive.profile.name;

  return (
    <div>
      <PageHeader
        title={name ? `Welcome back, ${name}` : "Your archive"}
        subtitle="A quiet place where your life accumulates. Everything below is stored only on this device."
        action={
          <Link to="/app/capture" className="btn-primary">
            <PenLine className="h-4 w-4" />
            New entry
          </Link>
        }
      />

      <div className="card mb-6 border-ember-500/30">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-ember-400">
          <Sparkles className="h-3.5 w-3.5" />
          Today's question
        </div>
        <p className="mt-3 font-serif text-xl leading-snug text-ink-50">
          {prompt.question}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              navigate("/app/capture", {
                state: { kind: prompt.kind, question: prompt.question },
              })
            }
          >
            Answer it — takes two minutes
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setPrompt((p) => anotherPrompt(p))}
          >
            <RefreshCw className="h-4 w-4" />
            Different question
          </button>
        </div>
      </div>

      {!name && (
        <div className="card mb-6">
          <h2 className="font-serif text-lg text-ink-50">
            Whose life is this?
          </h2>
          <p className="mt-1 text-sm text-ink-300">
            Add a name so the autobiography and memorial know who they belong
            to.
          </p>
          <form
            className="mt-4 flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const value = new FormData(form).get("name");
              const trimmed = typeof value === "string" ? value.trim() : "";
              if (!trimmed) return;
              update((a) => ({
                ...a,
                profile: { ...a.profile, name: trimmed },
              }));
            }}
          >
            <input
              name="name"
              className="field max-w-xs"
              placeholder="Your name"
            />
            <button type="submit" className="btn-ghost">
              Save
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/app/timeline" className="card hover:border-ink-700">
          <Clock className="h-5 w-5 text-ember-400" />
          <p className="mt-3 text-2xl text-ink-50">{archive.entries.length}</p>
          <p className="text-sm text-ink-300">
            {archive.entries.length === 1 ? "moment" : "moments"} on your
            timeline
          </p>
        </Link>
        <Link to="/app/autobiography" className="card hover:border-ink-700">
          <BookOpen className="h-5 w-5 text-ember-400" />
          <p className="mt-3 text-2xl text-ink-50">{chapters.length}</p>
          <p className="text-sm text-ink-300">
            {chapters.length === 1 ? "chapter" : "chapters"} drafted
          </p>
        </Link>
        <Link to="/app/messages" className="card hover:border-ink-700">
          <Mail className="h-5 w-5 text-ember-400" />
          <p className="mt-3 text-2xl text-ink-50">{pending.length}</p>
          <p className="text-sm text-ink-300">
            {pending.length === 1 ? "message" : "messages"} waiting for the
            future
          </p>
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-serif text-xl text-ink-50">Recent moments</h2>
        {archive.entries.length === 0 ? (
          <p className="text-sm text-ink-400">
            Nothing recorded yet. Your first entry takes about two minutes —
            start with a story you tell often.
          </p>
        ) : (
          <ul className="space-y-2">
            {[...archive.entries]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 5)
              .map((entry) => (
                <li key={entry.id} className="card py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="truncate text-sm text-ink-100">
                      {entry.title}
                    </span>
                    <span className="shrink-0 text-xs text-ink-400">
                      {ENTRY_KIND_LABELS[entry.kind]} · {entry.date}
                    </span>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
