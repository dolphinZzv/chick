import { NavLink, Outlet, useParams, Link } from "react-router-dom";
import { Settings, Workflow, Bot, Tag, Milestone, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "basic", label: "基本", icon: Settings },
  { to: "workflow", label: "工作流", icon: Workflow },
  { to: "agents", label: "Agent", icon: Bot },
  { to: "labels", label: "标签", icon: Tag },
  { to: "milestones", label: "里程碑", icon: Milestone },
  { to: "notifications", label: "通知", icon: Bell },
];

export function ProjectSettingsLayout() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-4">
      <Link
        to={`/projects/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← 返回项目
      </Link>
      <h1 className="text-2xl font-semibold">项目设置</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="w-full shrink-0 lg:w-48" aria-label="设置导航">
          <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-x-visible">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
