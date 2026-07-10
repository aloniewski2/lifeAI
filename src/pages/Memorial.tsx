import { PageHeader } from "@/components/PageHeader";
import { useArchive } from "@/lib/store";
import { sortByDate } from "@/lib/archive";
import { usePhoto } from "@/lib/usePhoto";

function MemorialPhoto({ entryId, title }: { entryId: string; title: string }) {
  const url = usePhoto(entryId);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={title}
      className="h-32 w-32 rounded-md border border-ink-800 object-cover"
    />
  );
}

export default function Memorial() {
  const { archive, update } = useArchive();
  const name = archive.profile.name || "A life worth keeping";
  const values = archive.entries.filter((e) => e.kind === "value");
  const stories = sortByDate(
    archive.entries.filter((e) => e.kind === "story"),
  );
  const milestones = sortByDate(
    archive.entries.filter((e) => e.kind === "milestone"),
  );
  const photos = sortByDate(
    archive.entries.filter((e) => e.kind === "photo"),
  ).slice(0, 12);

  return (
    <div>
      <PageHeader
        title="Memorial preview"
        subtitle="How the family archive would present you — built only from what you've chosen to record. This page is a preview; sharing it with family, and an interactive 'ask them a question' AI clearly labeled as a simulation, are on the roadmap."
      />

      <div className="card px-8 py-10 text-center">
        <p className="text-xs uppercase tracking-widest text-ink-400">
          In loving memory
        </p>
        <h2 className="mt-3 font-serif text-4xl text-ink-50">{name}</h2>
        <div className="mx-auto mt-6 max-w-md">
          <input
            className="field text-center italic"
            placeholder="A line to be remembered by…"
            value={archive.profile.epitaph}
            onChange={(e) =>
              update((a) => ({
                ...a,
                profile: { ...a.profile, epitaph: e.target.value },
              }))
            }
          />
        </div>

        {values.length > 0 && (
          <section className="mt-10 text-left">
            <h3 className="text-center font-serif text-xl text-ember-300">
              What they believed
            </h3>
            <ul className="mt-4 space-y-4">
              {values.map((v) => (
                <li key={v.id}>
                  <p className="font-serif text-ink-50">{v.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-300">
                    {v.content}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {milestones.length > 0 && (
          <section className="mt-10 text-left">
            <h3 className="text-center font-serif text-xl text-ember-300">
              A life in moments
            </h3>
            <ul className="mt-4 space-y-2">
              {milestones.map((m) => (
                <li key={m.id} className="flex gap-3 text-sm">
                  <span className="shrink-0 text-ink-400">
                    {m.date.slice(0, 4)}
                  </span>
                  <span className="text-ink-200">{m.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {photos.length > 0 && (
          <section className="mt-10">
            <h3 className="font-serif text-xl text-ember-300">
              A life in pictures
            </h3>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {photos.map((p) => (
                <MemorialPhoto key={p.id} entryId={p.id} title={p.title} />
              ))}
            </div>
          </section>
        )}

        {stories.length > 0 && (
          <section className="mt-10 text-left">
            <h3 className="text-center font-serif text-xl text-ember-300">
              Stories they told
            </h3>
            <div className="mt-4 space-y-6">
              {stories.map((s) => (
                <div key={s.id}>
                  <p className="font-serif text-ink-50">{s.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-300">
                    {s.content}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {values.length === 0 &&
          stories.length === 0 &&
          milestones.length === 0 && (
            <p className="mt-10 text-sm text-ink-400">
              Capture stories, values, and milestones to see how they come
              together here.
            </p>
          )}
      </div>
    </div>
  );
}
