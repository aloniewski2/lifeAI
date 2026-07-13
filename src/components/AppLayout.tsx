import { NavLink, Outlet, Link } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Feather,
  Flame,
  LayoutDashboard,
  Lock,
  Mail,
  MessageCircle,
  PenLine,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/capture", label: "Capture", icon: PenLine },
  { to: "/app/interview", label: "Interview", icon: MessageCircle },
  { to: "/app/timeline", label: "Timeline", icon: Clock },
  { to: "/app/autobiography", label: "Autobiography", icon: BookOpen },
  { to: "/app/messages", label: "Future messages", icon: Mail },
  { to: "/app/memorial", label: "Memorial", icon: Flame },
  { to: "/app/vault", label: "Vault & privacy", icon: Lock },
];

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-900 p-4">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <Feather className="h-5 w-5 text-ember-400" />
          <span className="font-serif text-lg text-ink-50">Legacy OS</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-ink-800 text-ember-300"
                    : "text-ink-300 hover:bg-ink-800 hover:text-ink-100",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-2 text-xs leading-relaxed text-ink-400">
          Everything you record stays on this device unless you export it.
        </p>
      </aside>
      <main className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-3xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
