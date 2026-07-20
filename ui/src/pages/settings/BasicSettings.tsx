import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { gql } from "@/lib/graphql";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorFallback } from "@/components/shared/ErrorFallback";

export function BasicSettings() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql(`query project($id: ID!) { project(id: $id) { name description } }`, { id });
      if (res.errors) { setError(res.errors[0].message); return; }
      setName(res.data.project.name ?? "");
      setDescription(res.data.project.description ?? "");
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("项目名称不能为空"); return; }
    setSaving(true);
    try {
      const res = await gql(
        `mutation updateProject($id: ID!, $name: String!, $desc: String) { updateProject(id: $id, name: $name, description: $desc) { id name description } }`,
        { id, name: name.trim(), desc: description.trim() || null }
      );
      if (res.errors) { toast.error(res.errors[0].message); return; }
      setName(res.data.updateProject.name);
      setDescription(res.data.updateProject.description ?? "");
      toast.success("保存成功");
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="border bg-card p-4 rounded-lg space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-20 w-full" /></div>;
  if (error) return <ErrorFallback message={error} onRetry={fetchData} />;

  return (
    <div className="border bg-card p-4 rounded-lg space-y-4">
      <h2 className="text-base font-semibold">基本设置</h2>
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">项目名称</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="项目名称"
          className="w-full rounded-md text-xl font-semibold placeholder:text-muted-foreground/40 bg-transparent border-none outline-none focus:ring-0"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">项目描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="项目的简要说明..."
          rows={3}
          className="w-full resize-none text-sm leading-relaxed placeholder:text-muted-foreground/40 bg-transparent border-none outline-none focus:ring-0"
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} size="sm" disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  );
}
