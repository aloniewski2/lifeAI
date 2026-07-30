import { DoubleRule, Eyebrow, MattedPhoto } from "@/components/Letterpress";
import { useArchive } from "@/lib/store";
import { sortByDate } from "@/lib/archive";
import { Entry } from "@/lib/types";

function StoryWithDropCap({ entry }: { entry: Entry }) {
  const dropCap = entry.content.charAt(0);
  const rest = entry.content.slice(1);
  return (
    <div>
      <h3 className="mb-2.5 text-center font-serif text-[17px] font-medium text-ink-600">
        {entry.title}
      </h3>
      <p className="whitespace-pre-wrap font-serif text-base leading-[1.8] text-[#2e2921]">
        <span
          aria-hidden
          className="float-left pr-[9px] pt-[7px] font-serif text-[50px] leading-[0.8] text-wax-600"
        >
          {dropCap}
        </span>
        {rest}
      </p>
    </div>
  );
}

export default function Memorial() {
  const { archive, update } = useArchive();
  const name = archive.profile.name || "A life worth keeping";
  const firstName = archive.profile.name.split(" ")[0] || "they";
  const hasName = Boolean(archive.profile.name);
  const values = archive.entries.filter((e) => e.kind === "value");
  const stories = sortByDate(archive.entries.filter((e) => e.kind === "story"));
  const milestones = sortByDate(
    archive.entries.filter((e) => e.kind === "milestone"),
  );
  const photos = sortByDate(
    archive.entries.filter((e) => e.kind === "photo"),
  ).slice(0, 6);
  const portrait = photos[0] ?? null;
  const isEmpty =
    values.length === 0 && stories.length === 0 && milestones.length === 0;

  return (
    <div className="min-h-screen bg-paper-50 px-6 pb-40 pt-16 sm:px-8 sm:pt-[90px]">
      <div className="mx-auto max-w-[640px] text-center">
        <Eyebrow className="tracking-[0.3em]">In loving memory</Eyebrow>

        {/* Arched portrait */}
        <div
          className="mx-auto mt-10 border border-paper-200 bg-paper-100 p-[9px]"
          style={{
            width: 170,
            height: 210,
            borderRadius: "85px 85px 4px 4px",
            boxShadow: "0 3px 14px rgba(34,30,24,0.1)",
          }}
        >
          {portrait ? (
            <MattedPhoto
              entryId={portrait.id}
              alt={portrait.title}
              className="h-full border-none bg-transparent p-0 shadow-none"
              imgClassName="[border-radius:76px_76px_2px_2px]"
            />
          ) : (
            <div
              className="photo-weave flex h-full items-center justify-center"
              style={{ borderRadius: "76px 76px 2px 2px" }}
            >
              <span className="font-mono text-[10px] text-ink-400">
                portrait
              </span>
            </div>
          )}
        </div>

        <h1 className="mt-9 font-serif text-4xl font-normal text-ink-900 sm:text-[52px]">
          {name}
        </h1>
        {archive.profile.birthYear && (
          <p className="mt-3 font-serif text-[17px] tracking-[0.1em] text-ink-400">
            b. {archive.profile.birthYear}
          </p>
        )}
        <div className="mx-auto mt-6 max-w-[360px]">
          <input
            aria-label="A line to be remembered by"
            className="field-paper text-center text-[23px] italic leading-[1.45] text-ink-600 placeholder:text-stone-400"
            placeholder="“A line to be remembered by…”"
            value={archive.profile.epitaph}
            onChange={(e) =>
              update((a) => ({
                ...a,
                profile: { ...a.profile, epitaph: e.target.value },
              }))
            }
          />
        </div>

        <DoubleRule strong width={80} className="mt-14" />

        {isEmpty && (
          <p className="mx-auto mt-14 max-w-[380px] font-serif text-base italic leading-[1.7] text-ink-500">
            Capture stories, values, and milestones to see how they come
            together here.
          </p>
        )}

        {values.length > 0 && (
          <section className="mt-14">
            <h2 className="eyebrow text-wax-600">
              What {hasName ? firstName : "they"} believed
            </h2>
            <div className="mt-7 flex flex-col gap-7">
              {values.map((v) => (
                <div key={v.id}>
                  <p className="font-serif text-[22px] italic text-ink-900">
                    “{v.title}”
                  </p>
                  {v.content && (
                    <p className="mx-auto mt-2 max-w-[420px] text-sm leading-[1.7] text-ink-500">
                      {v.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {milestones.length > 0 && (
          <section className="mt-[68px]">
            <h2 className="eyebrow text-wax-600">A life in moments</h2>
            <div className="mt-6 inline-flex flex-col gap-2.5 text-left">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-baseline gap-[18px]">
                  <span className="w-[52px] shrink-0 text-right font-serif text-[15px] text-wax-600">
                    {m.date.slice(0, 4)}
                  </span>
                  <span className="font-serif text-base text-[#2e2921]">
                    {m.title}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {photos.length > 0 && (
          <section className="mt-[68px]">
            <h2 className="eyebrow text-wax-600">A life in pictures</h2>
            <div className="mt-[26px] flex flex-wrap justify-center gap-[18px]">
              {photos.map((p) => (
                <figure key={p.id} className="m-0">
                  <MattedPhoto
                    entryId={p.id}
                    alt={p.title}
                    className="h-[150px] w-[150px] p-[7px]"
                  />
                  <figcaption className="mt-2 font-serif text-xs italic text-ink-400">
                    {p.title}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {stories.length > 0 && (
          <section className="mt-[68px] text-left">
            <h2 className="eyebrow text-center text-wax-600">
              Stories {hasName ? `${firstName} told` : "they told"}
            </h2>
            <div className="mt-[30px] flex flex-col gap-9">
              {stories.map((s) => (
                <StoryWithDropCap key={s.id} entry={s} />
              ))}
            </div>
          </section>
        )}

        <DoubleRule strong width={80} className="mt-[72px]" />
        <p className="mx-auto mt-10 max-w-[380px] text-[13px] leading-[1.7] text-ink-400">
          Every word on this page was written or spoken by{" "}
          {hasName ? firstName : "its subject"} and chosen for this purpose.
          Nothing was generated.
        </p>
      </div>
    </div>
  );
}
