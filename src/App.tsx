import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Route, Routes } from "react-router-dom";
import { ArchiveContext, loadArchive, saveArchive } from "@/lib/store";
import { requestPersistence } from "@/lib/db";
import { Archive } from "@/lib/types";
import { AppLayout } from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Capture from "@/pages/Capture";
import Timeline from "@/pages/Timeline";
import Autobiography from "@/pages/Autobiography";
import Messages from "@/pages/Messages";
import Memorial from "@/pages/Memorial";
import Vault from "@/pages/Vault";

// Lazy: keeps the Anthropic SDK out of the main bundle until it's used.
const Interview = lazy(() => import("@/pages/Interview"));
const Ask = lazy(() => import("@/pages/Ask"));

function LoadedApp({ initial }: { initial: Archive }) {
  const [archive, setArchive] = useState<Archive>(initial);

  const update = useCallback((mutate: (draft: Archive) => Archive) => {
    setArchive((current) => {
      const next = mutate(current);
      saveArchive(next);
      return next;
    });
  }, []);

  const store = useMemo(() => ({ archive, update }), [archive, update]);

  return (
    <ArchiveContext.Provider value={store}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<AppLayout />}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/capture" element={<Capture />} />
          <Route path="/app/timeline" element={<Timeline />} />
          <Route path="/app/autobiography" element={<Autobiography />} />
          <Route
            path="/app/interview"
            element={
              <Suspense fallback={null}>
                <Interview />
              </Suspense>
            }
          />
          <Route
            path="/app/ask"
            element={
              <Suspense fallback={null}>
                <Ask />
              </Suspense>
            }
          />
          <Route path="/app/messages" element={<Messages />} />
          <Route path="/app/memorial" element={<Memorial />} />
          <Route path="/app/vault" element={<Vault />} />
        </Route>
      </Routes>
    </ArchiveContext.Provider>
  );
}

export default function App() {
  const [initial, setInitial] = useState<Archive | null>(null);

  useEffect(() => {
    // Ask the browser to protect the archive from storage eviction, then
    // load it (migrating from the old localStorage home if needed).
    void requestPersistence();
    loadArchive().then(setInitial);
  }, []);

  if (!initial) return null;
  return <LoadedApp initial={initial} />;
}
