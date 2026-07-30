/** A single captured moment of a life. Everything in the app derives from these. */
export type EntryKind =
  | "journal"
  | "story"
  | "milestone"
  | "value"
  | "photo"
  | "voice";

export interface Entry {
  id: string;
  kind: EntryKind;
  title: string;
  /** Free-form text: the journal body, the story itself, why a value matters. */
  content: string;
  /** ISO date the moment happened (not when it was recorded). */
  date: string;
  tags: string[];
  createdAt: string;
}

export interface FutureMessage {
  id: string;
  recipient: string;
  /** ISO date the message should be delivered on. */
  deliverOn: string;
  subject: string;
  body: string;
  createdAt: string;
}

/** Per-source consent. Nothing is captured from a source unless it is on. */
export interface Consent {
  journal: boolean;
  photos: boolean;
  voice: boolean;
  conversations: boolean;
  calendar: boolean;
  socialMedia: boolean;
  email: boolean;
}

export interface Profile {
  name: string;
  birthYear: number | null;
  /** One line the person would want remembered. */
  epitaph: string;
}

/** App-level preferences that travel with the archive. */
export interface Settings {
  /** "ritual" adds a read-it-once-more confirmation before the wax is pressed. */
  sealCeremony: "ritual" | "quiet";
}

export const DEFAULT_SETTINGS: Settings = {
  sealCeremony: "ritual",
};

/** The entire on-device archive, versioned for future migrations. */
export interface Archive {
  version: 1;
  profile: Profile;
  consent: Consent;
  settings: Settings;
  entries: Entry[];
  messages: FutureMessage[];
  /** ISO timestamp of the last full backup export, for the backup nudge. */
  lastExportedAt: string | null;
}

export const DEFAULT_CONSENT: Consent = {
  journal: true,
  photos: false,
  voice: false,
  conversations: false,
  calendar: false,
  socialMedia: false,
  email: false,
};

export const EMPTY_ARCHIVE: Archive = {
  version: 1,
  profile: { name: "", birthYear: null, epitaph: "" },
  consent: DEFAULT_CONSENT,
  settings: DEFAULT_SETTINGS,
  entries: [],
  messages: [],
  lastExportedAt: null,
};

export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  journal: "Journal",
  story: "Story",
  milestone: "Milestone",
  value: "Value",
  photo: "Photo",
  voice: "Voice note",
};
