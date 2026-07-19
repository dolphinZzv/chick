import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { gql } from "@/lib/graphql";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { Plus } from "lucide-react";

interface ProjectBrief {
  id: string;
  name: string;
  description: string;
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = useCallback(() => {
    setLoading(true);
    setError(null);
    gql(`query projects { projects { id name description } }`)
      .then((json) => {
        if (json.errors) { setError(json.errors[0].message); return; }
        setProjects(json.data.projects);
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-medium">项目</h1>
        <div className="grid gap-2 lg:grid-cols-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (error) return <ErrorFallback message={error} onRetry={fetchProjects} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">项目</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 size-3.5" />创建项目
        </Button>
      </div>

      <p className="text-xs text-muted-foreground -mt-3">{projects.length} 个项目</p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建项目</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            setCreating(true);
            try {
              const json = await gql(
                `mutation createProject($name: String!, $desc: String) {
                  createProject(name: $name, description: $desc) { id name }
                }`,
                { name: newName, desc: newDesc || null }
              );
              if (json.errors) { toast.error(json.errors[0].message); return; }
              toast.success("项目创建成功");
              setCreateOpen(false);
              setNewName("");
              setNewDesc("");
              fetchProjects();
            } catch { toast.error("网络错误"); }
            finally { setCreating(false); }
          }} className="space-y-4">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="项目名称"
              required
              className="w-full border-b bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-foreground transition-colors"
            />
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="描述（可选）"
              rows={3}
              className="w-full resize-none border-b bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-foreground transition-colors"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="submit" size="sm" disabled={creating}>{creating ? "创建中..." : "创建"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {projects.length === 0 ? (
        <EmptyState title="暂无项目" description="创建一个项目开始使用" />
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="block rounded-lg border bg-card p-3.5 transition-colors hover:bg-accent"
            >
              <h3 className="text-sm font-medium">{p.name}</h3>
              {p.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
