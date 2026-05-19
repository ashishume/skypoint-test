import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { BriefcaseBusiness, ClipboardList, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/app/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navByRole = {
  hr: [
    { to: "/hr", label: "Dashboard", icon: LayoutDashboard },
    { to: "/hr/jobs", label: "Jobs", icon: BriefcaseBusiness },
  ],
  candidate: [
    { to: "/candidate/jobs", label: "Jobs", icon: BriefcaseBusiness },
    { to: "/candidate/applications", label: "Applications", icon: ClipboardList },
  ],
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.full_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleLogout() {
    logout();
    navigate("/auth", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <span>RecruitFlow</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {user
              ? navByRole[user.role].map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end
                    className={({ isActive }) =>
                      cn(
                        "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        isActive && "bg-primary/10 text-primary"
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                ))
              : null}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.full_name}</p>
              <p className="text-xs capitalize text-muted-foreground">{user?.role}</p>
            </div>
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">{initials || <UserRound />}</AvatarFallback>
            </Avatar>
            <Button type="button" variant="ghost" size="icon" onClick={handleLogout} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Separator />
        <nav className="flex gap-1 overflow-x-auto px-4 py-2 md:hidden">
          {user
            ? navByRole[user.role].map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) =>
                    cn(
                      "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground",
                      isActive && "bg-primary/10 text-primary"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))
            : null}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
