import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FolderKanban } from "lucide-react";

const navItems = [
  { to: "/projects", icon: FolderKanban, label: "项目" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-14 flex-col border-r bg-card lg:flex">
      <div className="flex h-12 items-center justify-center border-b">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
          C
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center rounded-md px-2 py-1.5 text-xs transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
            title={item.label}
          >
            <item.icon className="h-4 w-4" />
          </NavLink>
        ))}
      </nav>

      <div className="flex justify-center border-t p-3">
        <div className="h-2 w-2 rounded-full bg-green-500" />
      </div>
    </aside>
  );
}
