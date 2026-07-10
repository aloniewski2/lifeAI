import { EntryKind } from "./types";

/**
 * The prompt bank. One question per day, chosen deterministically from the
 * date, so the same question greets the user all day and a new one arrives
 * each morning — no server, no state.
 */
export interface Prompt {
  kind: EntryKind;
  question: string;
}

export const PROMPTS: Prompt[] = [
  // Childhood & family
  { kind: "story", question: "Describe the house you grew up in. Which room do you remember best?" },
  { kind: "story", question: "What's a story your family tells about you again and again?" },
  { kind: "story", question: "Who was your childhood best friend, and what did you two get up to?" },
  { kind: "story", question: "What did a Sunday look like in your house growing up?" },
  { kind: "story", question: "What's the earliest memory you can place?" },
  { kind: "story", question: "Tell the story of how your parents met — as you heard it." },
  { kind: "story", question: "What smell instantly takes you back to childhood?" },
  { kind: "story", question: "What was dinner like at your family table?" },
  { kind: "story", question: "Describe a family holiday that didn't go to plan." },
  { kind: "story", question: "What did your grandparents' home feel like?" },
  { kind: "story", question: "What game or toy did you wear out as a kid?" },
  { kind: "story", question: "Who in your family were you most like, and how?" },

  // School & growing up
  { kind: "story", question: "Which teacher changed how you saw the world?" },
  { kind: "story", question: "What were you known for in school?" },
  { kind: "story", question: "Tell the story of your first day somewhere new." },
  { kind: "story", question: "What music defined your teenage years, and where were you when you heard it?" },
  { kind: "story", question: "What was the first thing you saved up your own money to buy?" },
  { kind: "story", question: "Describe a summer you never wanted to end." },
  { kind: "milestone", question: "When did you first feel like an adult?" },
  { kind: "story", question: "What rule did you break that you're glad you broke?" },

  // Work & purpose
  { kind: "story", question: "Tell the story of your first job — the good and the bad." },
  { kind: "story", question: "What's the best piece of work you've ever done?" },
  { kind: "story", question: "Describe a boss or mentor who shaped you." },
  { kind: "milestone", question: "What was the biggest professional risk you ever took?" },
  { kind: "story", question: "What did a hard day at work look like — and how did you get through it?" },
  { kind: "value", question: "What does 'good work' mean to you?" },
  { kind: "story", question: "What's something you built, made, or fixed that you're still proud of?" },

  // Love & friendship
  { kind: "story", question: "Tell the story of meeting someone who changed your life." },
  { kind: "story", question: "What's the kindest thing anyone has ever done for you?" },
  { kind: "story", question: "Describe a friendship that survived distance or time." },
  { kind: "story", question: "What do you remember about falling in love?" },
  { kind: "story", question: "Who made you laugh harder than anyone?" },
  { kind: "value", question: "What have you learned about keeping a relationship alive?" },

  // Places & adventures
  { kind: "story", question: "Describe the best trip you ever took." },
  { kind: "story", question: "What's a place that felt like it belonged to you?" },
  { kind: "story", question: "Tell the story of a time you were completely lost." },
  { kind: "story", question: "What's the most beautiful thing you've ever seen with your own eyes?" },
  { kind: "story", question: "Describe a meal you'll never forget — where were you, and who was there?" },
  { kind: "milestone", question: "When did you move somewhere new, and what did you leave behind?" },

  // Hard times & growth
  { kind: "story", question: "What's the hardest thing you've come through, and what got you through it?" },
  { kind: "value", question: "What do you know now that you wish you'd known at twenty?" },
  { kind: "story", question: "Describe a failure that turned out to matter less than you feared." },
  { kind: "value", question: "What's a belief you held strongly and later changed your mind about?" },
  { kind: "story", question: "Tell about a time you had to be braver than you felt." },
  { kind: "value", question: "How do you get through a bad day?" },
  { kind: "story", question: "What loss taught you the most?" },

  // Values & beliefs
  { kind: "value", question: "What do you believe that most people around you don't?" },
  { kind: "value", question: "What's worth fighting for?" },
  { kind: "value", question: "What does a good life look like to you?" },
  { kind: "value", question: "What do you hope people say about you when you're not in the room?" },
  { kind: "value", question: "What's the best advice you ever received — and did you take it?" },
  { kind: "value", question: "What tradition do you hope your family keeps forever?" },
  { kind: "value", question: "What are you most grateful for that money never bought?" },

  // Everyday life & joy
  { kind: "journal", question: "What made you smile today, even a little?" },
  { kind: "journal", question: "What does an ordinary perfect day look like for you right now?" },
  { kind: "journal", question: "What are you looking forward to?" },
  { kind: "journal", question: "What's on your mind lately that you haven't said out loud?" },
  { kind: "journal", question: "Describe today so someone fifty years from now could feel it." },
  { kind: "story", question: "What's a small pleasure you never get tired of?" },
  { kind: "journal", question: "Who did you talk to today, and what did you talk about?" },

  // Legacy & reflection
  { kind: "value", question: "What do you want your grandchildren to know about you?" },
  { kind: "story", question: "What's a story only you can tell?" },
  { kind: "value", question: "If you could keep one memory forever, which one?" },
  { kind: "value", question: "What would you tell someone facing the year you found hardest?" },
  { kind: "milestone", question: "What moment split your life into before and after?" },
  { kind: "value", question: "What's something you did that made the world a little better?" },
];

/**
 * Deterministic index for a given ISO date (YYYY-MM-DD): same question all
 * day, different question tomorrow, cycles through the whole bank.
 */
export function promptIndexForDate(isoDate: string, bankSize: number): number {
  let hash = 0;
  for (let i = 0; i < isoDate.length; i++) {
    hash = (hash * 31 + isoDate.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % bankSize;
}

export function promptOfTheDay(isoDate: string): Prompt {
  return PROMPTS[promptIndexForDate(isoDate, PROMPTS.length)];
}

/** A different prompt from the same bank, for the "give me another" button. */
export function anotherPrompt(current: Prompt): Prompt {
  const others = PROMPTS.filter((p) => p.question !== current.question);
  return others[Math.floor(Math.random() * others.length)];
}
