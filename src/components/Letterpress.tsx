import { ReactNode } from "react";
import clsx from "clsx";
import { usePhoto } from "@/lib/usePhoto";

/** Small-caps letterspaced label that opens every letterpress section. */
export function Eyebrow({
  children,
  dark = false,
  className,
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <p
      className={clsx(
        "eyebrow",
        dark ? "text-wax-400" : "text-wax-600",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Centered ornamental double rule. */
export function DoubleRule({
  width = 80,
  strong = false,
  className,
}: {
  width?: number;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mx-auto",
        strong ? "double-rule-strong" : "double-rule",
        className,
      )}
      style={{ width }}
    />
  );
}

/** A matted, framed archive photo; woven placeholder while it loads. */
export function MattedPhoto({
  entryId,
  alt,
  className,
  imgClassName,
}: {
  entryId: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const url = usePhoto(entryId);
  return (
    <div
      className={clsx(
        "border border-paper-200 bg-paper-100 shadow-photo",
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          className={clsx("h-full w-full object-cover", imgClassName)}
        />
      ) : (
        <div className="photo-weave flex h-full w-full items-center justify-center">
          <span className="font-mono text-[10px] text-ink-400">
            photograph
          </span>
        </div>
      )}
    </div>
  );
}

/** Roman numerals for chapter headings. */
export function toRoman(n: number): string {
  const table: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  let rest = Math.max(1, Math.floor(n));
  for (const [value, glyph] of table) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

const CHAPTER_WORDS = [
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

export function chapterWord(n: number): string {
  return CHAPTER_WORDS[n - 1] ?? String(n);
}
