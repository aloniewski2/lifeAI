# AI Legacy OS

> Everyone dies. Not everyone has to disappear.

AI Legacy OS quietly records a life over decades — journals, stories, values,
milestones, and eventually photos, voice, and conversations — and turns it
into things a family can keep: an autobiography, an interactive timeline,
messages delivered in the future, and a lasting memorial.

## What's in this MVP

A local-first web app. The entire archive lives in the browser
(`localStorage`) — no account, no server, no data leaving the device unless
the owner exports it.

| Area | What it does today |
| --- | --- |
| **Question of the day** | A daily writing prompt from a curated bank — answering takes two minutes |
| **Capture** | Journals, stories, milestones, and values with dates and tags; dictation via on-device Whisper |
| **Photo import** | Batch-import photos, auto-placed on the timeline by their EXIF date; stored on-device (IndexedDB) |
| **Calendar import** | Drop in an .ics export; events become suggested milestones you review before keeping — recurring events collapse to one suggestion |
| **Interviewer** | The app's capture engine: archive-aware (it hunts timeline gaps, unexplored values, and thin stories), resumable across navigation, and stories save with the date they happened. Four engines: Guided (built-in, no AI), on-device Llama 3.2 (WebLLM), Ollama on localhost, or Claude (opt-in, bring-your-own key) |
| **Ask** | Ask the archive a question; answers are reconstructed only from recorded memories, with sources cited and a permanent simulation label |
| **Timeline** | The whole archive in chronological order, filterable by kind |
| **Autobiography** | Chapters auto-assembled by year from the owner's own words |
| **Future messages** | Sealed letters that unlock on a chosen date |
| **Memorial** | A preview of the family-facing archive: values, milestones, stories, photos |
| **Vault** | Per-source consent switches, JSON export/import, permanent wipe |

### How capture stays fast

- **Prompt of the day** kills the blank page — one curated question, rotated
  deterministically by date.
- **Voice dictation** runs Whisper (`@huggingface/transformers`) entirely in
  the browser. The model ships with the app in `public/models/` — no runtime
  download — and audio never leaves the device. Gated behind the voice
  consent switch. (Workers intercept the libraries' hardcoded huggingface.co
  URLs and serve the vendored files; see `src/lib/localModels.ts`.)
- **Photo import** reads each photo's EXIF capture date client-side
  (`exifr`), downscales it, and stores it in IndexedDB — decades of timeline
  anchors from one multi-select. Gated behind the photos consent switch.
- **Calendar import** parses .ics exports on-device (`src/lib/ics.ts`, no
  dependency) into a review list: recurring events collapse to a single
  suggestion, already-archived events are filtered out, and only checked
  events become milestones. Gated behind the calendar consent switch.
- **The interviewer** has four engines, three of them free and fully local:
  - **Guided** (default) — a curated opener plus the follow-up questions a
    good interviewer always asks; the saved story is the speaker's exact
    words, stitched verbatim. No AI, no download, works in every browser.
  - **On-device AI** — Llama 3.2 1B running in the browser via
    [WebLLM](https://github.com/mlc-ai/web-llm) (Apache-2.0) on WebGPU.
    ~880MB one-time download, cached; then it works offline.
  - **Ollama** — talks to a local [Ollama](https://ollama.com) server at
    `localhost:11434` (start it with
    `OLLAMA_ORIGINS=<app origin> ollama serve`). Best local quality.
  - **Claude** — the optional cloud tier (`claude-haiku-4-5`, user's own
    key stored outside the archive so exports never contain it). The only
    engine where words leave the device, so it alone sits behind the
    conversations consent switch.
- **Prepare this device** (Vault) downloads every on-device model in one
  tap — narration voice, dictation, and the interviewer — so nothing has to
  download mid-conversation and everything keeps working offline. Sequential
  downloads, per-model progress, already-cached models are skipped.

## Product principles

1. **Local-first.** Data stays on-device by default. Sync, when it comes, is
   end-to-end encrypted and opt-in.
2. **Consent per source.** Every input (photos, voice, conversations,
   calendar, social media, email) has its own switch, off by default. The
   switches ship before the features so consent is designed in, not bolted on.
3. **A simulation, not a person.** Anything generated from the archive — the
   future "ask them a question" AI included — is permanently labeled as a
   reconstruction drawn from the person's own words.
4. **Yours to delete.** One action wipes everything, with no server copy to
   linger.

## Roadmap

- Social-media export importers — suggested entries, reviewed before keeping
- AI editing pass that polishes autobiography prose without inventing facts
- Delivery of future messages to recipients (email / family accounts)
- Shareable memorial and family archive with per-person access
- Conversational "ask them a question" mode over the archive, clearly
  labeled as a simulation
- End-to-end encrypted sync and family inheritance/executor flow
- Keeping original voice recordings alongside transcripts

## Development

```sh
npm install
npm run dev      # start the app
npm test         # run the data-layer tests
npm run build    # typecheck + production build
```

Stack: Vite, React 18, TypeScript, Tailwind CSS, React Router. Pure data
logic lives in `src/lib/` and is covered by Vitest.
