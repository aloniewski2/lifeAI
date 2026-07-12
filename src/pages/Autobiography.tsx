import { PageHeader } from "@/components/PageHeader";
import { ListenButton } from "@/components/ListenButton";
import { useArchive } from "@/lib/store";
import { chaptersByYear } from "@/lib/archive";

export default function Autobiography() {
  const { archive } = useArchive();
  const chapters = chaptersByYear(archive.entries);
  const name = archive.profile.name || "A life";

  return (
    <div>
      <PageHeader
        title="Autobiography"
        subtitle="Assembled from your own entries, chapter by chapter, in your own words. Nothing here is invented — an AI editing pass to smooth the prose is on the roadmap, and it will always be labeled."
      />

      {chapters.length === 0 ? (
        <p className="text-sm text-ink-400">
          The book is waiting for its first page. Capture a few moments and
          chapters will assemble themselves here.
        </p>
      ) : (
        <article className="card px-8 py-10">
          <h2 className="text-center font-serif text-3xl text-ink-50">
            {name}
          </h2>
          <p className="mt-2 text-center text-sm italic text-ink-400">
            {archive.profile.epitaph || "As remembered, in their own words."}
          </p>
          <div className="mt-10 space-y-10">
            {chapters.map(({ year, entries }, index) => (
              <section key={year}>
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-serif text-xl text-ember-300">
                    Chapter {index + 1} · {year}
                  </h3>
                  <ListenButton
                    text={entries
                      .map((e) => `${e.title}. ${e.content}`)
                      .join(" ")}
                  />
                </div>
                <div className="mt-4 space-y-6">
                  {entries.map((entry) => (
                    <div key={entry.id}>
                      <h4 className="font-serif text-base text-ink-50">
                        {entry.title}
                      </h4>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-ink-200">
                        {entry.content}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}
