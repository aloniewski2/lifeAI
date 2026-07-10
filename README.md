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
| **Capture** | Record journals, stories, milestones, and values with dates and tags |
| **Timeline** | The whole archive in chronological order, filterable by kind |
| **Autobiography** | Chapters auto-assembled by year from the owner's own words |
| **Future messages** | Sealed letters that unlock on a chosen date |
| **Memorial** | A preview of the family-facing archive: values, milestones, stories |
| **Vault** | Per-source consent switches, JSON export/import, permanent wipe |

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

- Photo and voice-note capture (processed on-device)
- Conversation capture with always-visible recording indicators
- AI editing pass that polishes autobiography prose without inventing facts
- Delivery of future messages to recipients (email / family accounts)
- Shareable memorial and family archive with per-person access
- Conversational "ask them a question" mode over the archive, clearly
  labeled as a simulation
- End-to-end encrypted sync and family inheritance/executor flow

## Development

```sh
npm install
npm run dev      # start the app
npm test         # run the data-layer tests
npm run build    # typecheck + production build
```

Stack: Vite, React 18, TypeScript, Tailwind CSS, React Router. Pure data
logic lives in `src/lib/` and is covered by Vitest.
