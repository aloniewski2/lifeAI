import { Link } from "react-router-dom";
import { DoubleRule, Eyebrow } from "@/components/Letterpress";

const TOC = [
  {
    numeral: "I.",
    title: "The autobiography",
    text: "Chapters assembled from what you record, in your own words. You edit; nothing is invented.",
  },
  {
    numeral: "II.",
    title: "The timeline",
    text: "A whole life in order — stories, photographs, milestones — for family to walk through.",
  },
  {
    numeral: "III.",
    title: "Letters to the future",
    text: "Sealed now, delivered on a wedding day, a birthday, a hard year. Wax and all.",
  },
  {
    numeral: "IV.",
    title: "The memorial",
    text: "A page worthy of a remembrance, built only from what you chose to leave.",
  },
];

const PRINCIPLES = [
  {
    numeral: "i",
    title: "Local-first",
    text: "Your archive lives on your device. Nothing leaves it unless you export it yourself.",
  },
  {
    numeral: "ii",
    title: "Consent per source",
    text: "Photos, voice, calendars — each source is off until you turn it on, and you can turn it off again.",
  },
  {
    numeral: "iii",
    title: "A simulation, not a person",
    text: "Anything generated from your archive is labeled as a reconstruction. It speaks from your words; it is not you.",
  },
  {
    numeral: "iv",
    title: "Yours to delete",
    text: "One action wipes everything, permanently. No retention, no dark patterns.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper-50">
      <header className="mx-auto flex max-w-[1080px] items-baseline justify-between px-6 py-7 sm:px-8">
        <span className="font-serif text-[15px] uppercase tracking-[0.22em] text-ink-900">
          AI&nbsp;Legacy&nbsp;OS
        </span>
        <Link
          to="/app"
          className="border-b border-paper-200 pb-[3px] text-[13px] uppercase tracking-[0.08em] text-ink-500 hover:text-ink-900"
        >
          Open your archive
        </Link>
      </header>

      <section className="mx-auto max-w-[760px] px-6 pb-16 pt-14 text-center sm:px-8 sm:pb-[72px] sm:pt-[90px]">
        <Eyebrow>The archive of a life</Eyebrow>
        <h1 className="mx-auto mt-6 max-w-[640px] font-serif text-4xl font-normal leading-[1.12] text-ink-900 [text-wrap:balance] sm:text-[62px] sm:leading-[1.08]">
          Everyone dies. Not everyone has to disappear.
        </h1>
        <p className="mx-auto mt-6 max-w-[460px] text-[15px] leading-[1.7] text-ink-500 sm:text-[17px]">
          What you write here becomes a book your family keeps — chapters, a
          timeline, letters that wait for their day. It reads like one from the
          first page.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-[26px]">
          <Link to="/app" className="btn-ink w-full sm:w-auto">
            Begin your archive
          </Link>
          <a
            href="#privacy"
            className="border-b border-paper-200 pb-0.5 text-sm text-ink-500 hover:text-ink-900"
          >
            How privacy works ↓
          </a>
        </div>
        <DoubleRule width={100} className="mt-16" />
      </section>

      <section className="mx-auto max-w-[720px] px-6 pb-[88px] sm:px-8">
        <p className="mb-[26px] text-center font-serif text-[22px] italic text-ink-900">
          What your family will be handed
        </p>
        <div className="flex flex-col">
          {TOC.map(({ numeral, title, text }) => (
            <div
              key={numeral}
              className="flex items-baseline gap-4 border-t border-paper-200 px-2 py-5 sm:gap-[22px]"
            >
              <span className="w-8 shrink-0 font-serif text-[17px] text-wax-600 sm:w-10">
                {numeral}
              </span>
              <div className="flex-1">
                <h3 className="font-serif text-[19px] font-medium text-ink-900 sm:text-[21px]">
                  {title}
                </h3>
                <p className="mt-[5px] max-w-[480px] text-sm leading-[1.65] text-ink-500">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-paper-200" />
      </section>

      <section id="privacy" className="bg-ink-950 px-6 pb-[84px] pt-[76px] sm:px-8">
        <div className="mx-auto max-w-[720px]">
          <Eyebrow dark className="text-center">
            Privacy is the product
          </Eyebrow>
          <p className="mx-auto mt-[18px] max-w-[460px] text-center font-serif text-[22px] leading-[1.4] text-parch-100 sm:text-2xl">
            Four promises, kept in the code — not the terms of service.
          </p>
          <div className="mt-11 grid gap-9 sm:grid-cols-2 sm:gap-x-12">
            {PRINCIPLES.map(({ numeral, title, text }) => (
              <div key={numeral}>
                <p className="font-serif text-base text-wax-400">
                  {numeral}. <span className="text-parch-100">{title}</span>
                </p>
                <p className="mt-2 text-sm leading-[1.7] text-parch-300">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-paper-50 px-6 pb-24 pt-[34px] text-center">
        <p className="font-serif text-sm italic text-ink-400">
          A life is worth keeping.
        </p>
      </footer>
    </div>
  );
}
