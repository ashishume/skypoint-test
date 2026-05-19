import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, LayoutDashboard, LogOut, Search, UserRound, UsersRound } from "lucide-react";
import { useAuth } from "@/app/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const sideNav = [
  { to: "/hr", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { to: "/hr/jobs", label: "Active Searches", icon: Search, enabled: true },
  { to: "/hr/candidates", label: "Candidates", icon: UsersRound, enabled: true },
];

const candidateSideNav = [
  { to: "/candidate/jobs", label: "Dashboard", icon: LayoutDashboard },
  { to: "/candidate/jobs?searchMode=1", label: "Active Searches", icon: Search },
  { to: "/candidate/applications", label: "Applications", icon: ClipboardList },
  { to: "/candidate/profile", label: "Profile", icon: UserRound },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initials = user?.full_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isHr = user?.role === "hr";

  function handleLogout() {
    logout();
    navigate("/auth", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#091426]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-8">
            <Link to={isHr ? "/hr" : "/candidate/jobs"} className="shrink-0 text-2xl font-bold tracking-tight">
              RecruitFlow
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {isHr ? (
              <>
                <Button asChild className="hidden rounded-md bg-[#091426] px-5 text-white hover:bg-[#172640] sm:inline-flex">
                  <Link to="/hr/jobs?create=1">Post a Job</Link>
                </Button>
              </>
            ) : null}
            <Link to={isHr ? "/hr" : "/candidate/profile"} aria-label="Open profile">
              <Avatar className="h-9 w-9 border border-slate-200 bg-[#173447] shadow-sm">
                <AvatarFallback className="bg-[#173447] text-xs font-bold text-white">
                  {initials || <UserRound className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Button type="button" variant="ghost" size="icon" onClick={handleLogout} aria-label="Sign out">
              <LogOut className="h-4 w-4 text-slate-600" />
            </Button>
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] w-64 flex-col border-r border-slate-200 bg-slate-50 p-5 md:flex">
          <div className="mb-9">
            <h2 className="text-xl font-bold tracking-tight">{isHr ? "Recruiter Portal" : "Candidate Portal"}</h2>
            <p className="text-sm font-semibold text-slate-600">{isHr ? "Enterprise Tier" : "Job Seeker"}</p>
          </div>
          <nav className="flex-1 space-y-3">
            {(isHr ? sideNav : candidateSideNav).map(({ to, label, icon: Icon }) => {
              const isActive = (() => {
                if (to === "/hr") return location.pathname === "/hr";
                if (to === "/candidate/jobs") {
                  return location.pathname === "/candidate/jobs" && !location.search.includes("searchMode=1");
                }
                if (to.includes("?")) return `${location.pathname}${location.search}` === to;
                return location.pathname.startsWith(to);
              })();
              const content = (
                <>
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </>
              );

              return (
                <NavLink
                  key={label}
                  to={to}
                  end={to === "/hr"}
                  className={cn(
                    "flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-white hover:text-blue-700 hover:shadow-sm active:scale-[0.99]",
                    isActive && "bg-blue-700 text-white shadow-md hover:bg-blue-700 hover:text-white"
                  )}
                >
                  {content}
                </NavLink>
              );
            })}
          </nav>
          <Separator className="mb-4 bg-slate-200" />
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-4 py-2 text-left text-sm font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

      <main className="pt-16 md:ml-64">
        <Outlet />
      </main>
    </div>
  );
}
