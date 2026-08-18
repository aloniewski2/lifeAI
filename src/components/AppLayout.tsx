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
  MessagesSquare,
  PenLine,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/capture", label: "Capture", icon: PenLine },
  { to: "/app/interview", label: "Interview", icon: MessageCircle },
  { to: "/app/timeline", label: "Timeline", icon: Clock },
  { to: "/app/autobiography", label: "Autobiography", icon: BookOpen },
  { to: "/app/ask", label: "Ask", icon: MessagesSquare },
  { to: "/app/messages", label: "Letters", icon: Mail },
  { to: "/app/memorial", label: "Memorial", icon: Flame },
  { to: "/app/vault", label: "Vault & privacy", icon: Lock },
];

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-950 p-4">
        <Link to="/" className="mb-8 flex items-baseline gap-2 px-2">
          <Feather className="h-4 w-4 translate-y-0.5 text-wax-400" />
          <span className="font-serif text-[15px] uppercase tracking-[0.18em] text-parch-100">
            Legacy&nbsp;OS
          </span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-[3px] px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-ink-900 text-wax-400"
                    : "text-parch-300 hover:bg-ink-900 hover:text-parch-100",
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
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}

/** Standard wrapper for dark-study utility pages (forms, settings). */
export function UtilityPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto max-w-3xl">{children}</div>
    </div>
  );
}
