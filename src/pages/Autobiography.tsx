import { ListenButton } from "@/components/ListenButton";
import { chapterWord, DoubleRule, Eyebrow } from "@/components/Letterpress";
import { useArchive } from "@/lib/store";
import { chaptersByYear } from "@/lib/archive";
import { Entry } from "@/lib/types";

/** Prose entries only — photos live on the timeline, not in the book. */
function proseOf(entries: Entry[]): Entry[] {
  return entries.filter((e) => e.kind !== "photo" && e.content);
}

function ChapterEntry({ entry }: { entry: Entry }) {
  const dropCap = entry.content.charAt(0);
  const rest = entry.content.slice(1);
  return (
    <div>
      <h3 className="mb-3 text-center font-serif text-[17px] font-medium tracking-[0.04em] text-ink-600">
        {entry.title}
      </h3>
      <p className="whitespace-pre-wrap font-serif text-[17px] leading-[1.8] text-[#2e2921]">
        <span
          aria-hidden
          className="float-left pr-2.5 pt-2 font-serif text-[58px] leading-[0.78] text-wax-600"
        >
          {dropCap}
        </span>
        {rest}
      </p>
    </div>
  );
}

export default function Autobiography() {
  const { archive } = useArchive();
  const chapters = chaptersByYear(archive.entries)
    .map(({ year, entries }) => ({ year, entries: proseOf(entries) }))
    .filter(({ entries }) => entries.length > 0);
  const name = archive.profile.name || "A life";

  if (chapters.length === 0) {
    return (
      <div className="min-h-screen bg-paper-100">
        <div className="mx-auto max-w-[640px] px-6 pb-40 pt-24 text-center sm:pt-36">
          <Eyebrow>The autobiography</Eyebrow>
          <h1 className="mt-6 font-serif text-3xl font-normal leading-[1.2] text-ink-900 sm:text-[40px]">
            The book is waiting
            <br />
            for its first page.
          </h1>
          <p className="mx-auto mt-5 max-w-[400px] text-base leading-[1.7] text-ink-500">
            Capture a few moments and chapters will assemble themselves here,
            in your own words.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-100 px-4 pb-[140px] pt-10 sm:px-6 sm:pt-14">
      {/* Title page */}
      <div className="mx-auto max-w-[720px] bg-paper-50 px-8 pb-[90px] pt-[70px] text-center shadow-sheet sm:px-[84px] sm:pt-[110px]">
        <Eyebrow className="tracking-[0.3em]">The life of</Eyebrow>
        <h1 className="mt-7 font-serif text-4xl font-normal text-ink-900 sm:text-[54px]">
          {name}
        </h1>
        {archive.profile.epitaph && (
          <p className="mx-auto mt-5 max-w-[340px] font-serif text-[19px] italic leading-[1.5] text-ink-500">
            {archive.profile.epitaph}
          </p>
        )}
        <DoubleRule strong width={80} className="mt-11" />
        <p className="mt-11 text-xs uppercase tracking-[0.12em] text-stone-400">
          Written in their own words
          <br />
          <span className="normal-case tracking-[0.06em]">
            Nothing on these pages was invented.
          </span>
        </p>
      </div>

      {/* Chapters */}
      {chapters.map(({ year, entries }, index) => (
        <div
          key={year}
          className="relative mx-auto mt-7 max-w-[720px] bg-paper-50 px-6 pb-16 pt-14 shadow-sheet sm:px-[84px] sm:pt-[84px]"
        >
          <Eyebrow className="text-center tracking-[0.3em]">
            Chapter {chapterWord(index + 1)}
          </Eyebrow>
          <h2 className="mt-4 text-center font-serif text-3xl font-normal italic text-ink-900 sm:text-[38px]">
            {year}
          </h2>
          <p className="mt-2.5 text-center text-[13px] text-ink-400">
            Assembled from {entries.length}{" "}
            {entries.length === 1 ? "entry" : "entries"} in their own words
          </p>
          <div
            className="mx-auto mt-[30px] border-t border-paper-300"
            style={{ width: 60 }}
          />
          <div className="mt-[26px]">
            <ListenButton
              variant="letterpress"
              label="Listen to this chapter"
              text={entries.map((e) => `${e.title}. ${e.content}`).join(" ")}
            />
          </div>

          <div className="mt-11 flex flex-col gap-9">
            {entries.map((entry) => (
              <ChapterEntry key={entry.id} entry={entry} />
            ))}
          </div>

          <p className="mt-[60px] text-center font-serif text-sm text-stone-400">
            · {index + 1} ·
          </p>
        </div>
      ))}
    </div>
  );
}
