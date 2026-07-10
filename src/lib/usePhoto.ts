import { useEffect, useState } from "react";
import { getPhoto } from "./photoStore";

/** Object URL for a stored photo, revoked on unmount. */
export function usePhoto(entryId: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    getPhoto(entryId).then((blob) => {
      if (blob && !cancelled) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [entryId]);

  return url;
}
