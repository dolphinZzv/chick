import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { gql } from "@/lib/graphql";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorFallback } from "@/components/shared/ErrorFallback";

export function WorkflowSettings() {
  const { id } = useParams<{ id: string }>();
  const [allowCreatorTransition, setAllowCreatorTransition] = useState(true);
  const [requireCreatorCloseApproval, setRequireCreatorCloseApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql(`query project($id: ID!) { project(id: $id) { allowCreatorTransition requireCreatorCloseApproval } }`, { id });
      if (res.errors) { setError(res.errors[0].message); return; }
      setAllowCreatorTransition(res.data.project.allowCreatorTransition ?? true);
      setRequireCreatorCloseApproval(res.data.project.requireCreatorCloseApproval ?? false);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await gql(
        `mutation updateProjectConfig($id: ID!, $allowCreatorTransition: Boolean, $requireCreatorCloseApproval: Boolean) { updateProjectConfig(id: $id, allowCreatorTransition: $allowCreatorTransition, requireCreatorCloseApproval: $requireCreatorCloseApproval) { id } }`,
        { id, allowCreatorTransition, requireCreatorCloseApproval }
      );
      if (res.errors) { toast.error(res.errors[0].message); return; }
      toast.success("工作流配置已更新");
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="border bg-card p-4 rounded-lg space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
  if (error) return <ErrorFallback message={error} onRetry={fetchData} />;

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
    </label>
  );

  return (
    <div className="border bg-card p-4 rounded-lg space-y-4">
      <h2 className="text-base font-semibold">工作流配置</h2>
      <p className="text-sm text-muted-foreground">配置 Issue 的状态流转权限。</p>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium">允许创建者自己流转</label>
          <p className="text-xs text-muted-foreground">启用后，Issue 创建者可以自行变更状态</p>
        </div>
        <Toggle checked={allowCreatorTransition} onChange={setAllowCreatorTransition} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium">创建者审批后才能关闭</label>
          <p className="text-xs text-muted-foreground">启用后，只有 Issue 创建者才能关闭 Issue</p>
        </div>
        <Toggle checked={requireCreatorCloseApproval} onChange={setRequireCreatorCloseApproval} />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  );
}
