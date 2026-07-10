import { Link } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Feather,
  Flame,
  Lock,
  Mail,
  MessageCircle,
  PenLine,
} from "lucide-react";

const FEATURES = [
  {
    icon: PenLine,
    title: "Capture what matters",
    text: "Journals, stories, values, milestones — recorded in minutes, kept for generations.",
  },
  {
    icon: Clock,
    title: "An interactive timeline",
    text: "Your whole life laid out year by year, searchable and explorable by the people you love.",
  },
  {
    icon: BookOpen,
    title: "Your autobiography",
    text: "Chapters assemble themselves from what you record. You edit; nothing is invented.",
  },
  {
    icon: Mail,
    title: "Messages to the future",
    text: "A letter for a wedding day, a birthday, a hard year. Written now, delivered when it counts.",
  },
  {
    icon: MessageCircle,
    title: "An AI that remembers like you",
    text: "One day, family will be able to ask questions and hear answers drawn from your own words — always clearly labeled as a simulation, never a replacement.",
  },
  {
    icon: Flame,
    title: "A living memorial",
    text: "A family archive that outlasts any single device, service, or generation.",
  },
];

const PRINCIPLES = [
  {
    title: "Local-first",
    text: "Your archive lives on your device. Nothing leaves it unless you export it yourself.",
  },
  {
    title: "Consent per source",
    text: "Photos, voice, conversations, email — each source is off until you turn it on, and you can turn it off again.",
  },
  {
    title: "A simulation, not a person",
    text: "Anything generated from your archive is labeled as a reconstruction. The AI speaks from your words; it is not you.",
  },
  {
    title: "Yours to delete",
    text: "One button wipes everything, permanently. No retention, no dark patterns.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Feather className="h-5 w-5 text-ember-400" />
          <span className="font-serif text-lg text-ink-50">AI Legacy OS</span>
        </div>
        <Link to="/app" className="btn-ghost">
          Open your archive
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-20 pt-24 text-center">
        <h1 className="font-serif text-5xl leading-tight text-ink-50">
          Everyone dies.
          <br />
          Not everyone has to disappear.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-300">
          AI Legacy OS quietly gathers your life — your words, your stories,
          your values — and turns it into something your family can hold onto:
          an autobiography, a timeline, letters to the future, a memorial that
          lasts.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link to="/app/capture" className="btn-primary">
            <PenLine className="h-4 w-4" />
            Start your first entry
          </Link>
          <Link to="/app" className="btn-ghost">
            Explore the OS
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <Icon className="h-5 w-5 text-ember-400" />
              <h3 className="mt-3 font-serif text-lg text-ink-50">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-ink-800 bg-ink-900/50">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="mb-8 flex items-center gap-2">
            <Lock className="h-5 w-5 text-ember-400" />
            <h2 className="font-serif text-2xl text-ink-50">
              Privacy is the product
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {PRINCIPLES.map(({ title, text }) => (
              <div key={title}>
                <h3 className="text-sm font-medium text-ember-300">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-300">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-10 text-center text-xs text-ink-400">
        A life is worth keeping. AI Legacy OS — early preview, local-first.
      </footer>
    </div>
  );
}
