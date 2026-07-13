import { useEffect, useState } from "react";
import { getAudio } from "./audioStore";

/** Object URLs for an entry's voice recordings, revoked on unmount. */
export function useAudio(entryId: string): string[] {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let objectUrls: string[] = [];
    let cancelled = false;
    getAudio(entryId).then((takes) => {
      if (cancelled || takes.length === 0) return;
      objectUrls = takes.map((t) => URL.createObjectURL(t));
      setUrls(objectUrls);
    });
    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [entryId]);

  return urls;
}
