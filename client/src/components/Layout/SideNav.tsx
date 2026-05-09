import { NavLink } from "react-router-dom";
import clsx from "clsx";

const links = [
  { to: "/", label: "Home" },
  { to: "/lessons", label: "Lessons" },
  { to: "/practice", label: "Practice" },
  { to: "/theory", label: "Theory" },
  { to: "/jam", label: "Jam Coach" },
  { to: "/settings", label: "Settings" },
];

export function SideNav() {
  return (
    <nav className="hidden md:flex md:flex-col gap-1 p-3 w-48 border-r border-border">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === "/"}
          className={({ isActive }) =>
            clsx(
              "px-3 py-2 rounded-lg text-sm transition-colors",
              isActive
                ? "bg-bg-elev text-text"
                : "text-text-muted hover:text-text hover:bg-bg-elev",
            )
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function MobileTabBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 md:hidden bg-bg-elev border-t border-border px-2 py-1 flex justify-around z-10">
      {links.slice(0, 5).map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === "/"}
          className={({ isActive }) =>
            clsx(
              "px-2 py-1.5 text-xs rounded-md",
              isActive ? "text-accent" : "text-text-muted",
            )
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
