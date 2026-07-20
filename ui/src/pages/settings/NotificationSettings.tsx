import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { gql } from "@/lib/graphql";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorFallback } from "@/components/shared/ErrorFallback";

export function NotificationSettings() {
  const { id } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Array<{ agent: { id: string; number: number; name: string }; role: string }>>([]);
  const [notifTypes, setNotifTypes] = useState<Array<{ type: string; description: string }>>([]);
  const [notifSettings, setNotifSettings] = useState<Array<{ id: string; agentID: string; notificationType: string; enabled: boolean; channel: string }>>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [notifUpdating, setNotifUpdating] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql(`query project($id: ID!) { project(id: $id) { members { agent { id number name } role } } }`, { id });
      if (res.errors) { setError(res.errors[0].message); return; }
      setMembers(res.data.project.members || []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  useEffect(() => {
    gql(`query { notificationTypes { type description } }`)
      .then(res => { if (!res.errors) setNotifTypes(res.data?.notificationTypes || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedMember) { setNotifSettings([]); return; }
    setSettingsLoading(true);
    gql(
      `query notifSettings($aid: ID!) { notificationSettings(agentID: $aid) { id agentID notificationType enabled channel } }`,
      { aid: selectedMember }
    )
      .then(res => { if (!res.errors) setNotifSettings(res.data?.notificationSettings || []); })
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  }, [selectedMember]);

  const handleToggle = useCallback(async (notifType: string, enabled: boolean) => {
    if (!selectedMember) return;
    setNotifUpdating(notifType);
    try {
      const res = await gql(
        `mutation updateNotifSetting($aid: ID!, $type: String!, $enabled: Boolean!) { updateNotificationSetting(agentID: $aid, notificationType: $type, enabled: $enabled) { id enabled } }`,
        { aid: selectedMember, type: notifType, enabled }
      );
      if (res.errors) { toast.error(res.errors[0].message); return; }
      setNotifSettings(prev => {
        const existing = prev.find(s => s.notificationType === notifType);
        if (existing) return prev.map(s => s.notificationType === notifType ? { ...s, enabled } : s);
        return [...prev, { id: "", agentID: selectedMember, notificationType: notifType, enabled, channel: "in_app" }];
      });
    } catch { toast.error("网络错误"); }
    finally { setNotifUpdating(null); }
  }, [selectedMember]);

  if (loading) return <div className="border bg-card p-4 rounded-lg space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-12 w-full" /></div>;
  if (error) return <ErrorFallback message={error} onRetry={fetchProject} />;

  return (
    <div className="border bg-card p-4 rounded-lg space-y-4">
      <h2 className="text-base font-semibold">通知设置</h2>
      <p className="text-sm text-muted-foreground">选择项目成员，配置其通知偏好。未配置的类型默认开启。</p>

      <div className="flex flex-wrap gap-2">
        {members.map(m => (
          <button
            key={m.agent.id}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors min-h-[44px] ${
              selectedMember === m.agent.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-accent"
            }`}
            onClick={() => setSelectedMember(m.agent.id)}
          >
            #{m.agent.number} {m.agent.name}
          </button>
        ))}
      </div>

      {!selectedMember ? (
        <p className="text-sm text-muted-foreground">请选择一个成员查看通知设置</p>
      ) : settingsLoading || (notifTypes.length === 0) ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="divide-y border">
          {notifTypes.map(nt => {
            const setting = notifSettings.find(s => s.notificationType === nt.type);
            const enabled = setting ? setting.enabled : true;
            const updating = notifUpdating === nt.type;
            return (
              <div key={nt.type} className="flex items-center justify-between gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{nt.description}</p>
                  <p className="text-xs text-muted-foreground font-mono">{nt.type}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={enabled}
                    disabled={!!updating}
                    onChange={() => handleToggle(nt.type, !enabled)}
                  />
                  <div className={`w-10 h-5 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all ${
                    updating ? "bg-muted cursor-wait" : "bg-muted peer-checked:bg-primary cursor-pointer"
                  } peer-checked:after:translate-x-5`} />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
