import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider as UrqlProvider } from "urql";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { urqlClient } from "@/lib/urql";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Layout } from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";

const LoginPage = lazy(() => import("@/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const ProjectDetailPage = lazy(() => import("@/pages/ProjectDetailPage").then(m => ({ default: m.ProjectDetailPage })));
const IssueDetailPage = lazy(() => import("@/pages/IssueDetailPage").then(m => ({ default: m.IssueDetailPage })));
const ProposalDetailPage = lazy(() => import("@/pages/ProposalDetailPage").then(m => ({ default: m.ProposalDetailPage })));
const TaskDetailPage = lazy(() => import("@/pages/TaskDetailPage").then(m => ({ default: m.TaskDetailPage })));
const AgentDetailPage = lazy(() => import("@/pages/AgentDetailPage").then(m => ({ default: m.AgentDetailPage })));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage").then(m => ({ default: m.ProjectsPage })));
const ProjectSettingsLayout = lazy(() => import("@/pages/settings/ProjectSettingsLayout").then(m => ({ default: m.ProjectSettingsLayout })));
const BasicSettings = lazy(() => import("@/pages/settings/BasicSettings").then(m => ({ default: m.BasicSettings })));
const WorkflowSettings = lazy(() => import("@/pages/settings/WorkflowSettings").then(m => ({ default: m.WorkflowSettings })));
const AgentSettings = lazy(() => import("@/pages/settings/AgentSettings").then(m => ({ default: m.AgentSettings })));
const LabelSettings = lazy(() => import("@/pages/settings/LabelSettings").then(m => ({ default: m.LabelSettings })));
const MilestoneSettings = lazy(() => import("@/pages/settings/MilestoneSettings").then(m => ({ default: m.MilestoneSettings })));
const NotificationSettings = lazy(() => import("@/pages/settings/NotificationSettings").then(m => ({ default: m.NotificationSettings })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));

function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="space-y-4 w-full max-w-lg">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function PageBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoading />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <UrqlProvider value={urqlClient}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<PageBoundary><LoginPage /></PageBoundary>} />
                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/projects" replace />} />
                  <Route path="/projects" element={<PageBoundary><ProjectsPage /></PageBoundary>} />
                  <Route path="/projects/:id" element={<PageBoundary><ProjectDetailPage /></PageBoundary>} />
                  <Route path="/projects/:id/settings" element={<PageBoundary><ProjectSettingsLayout /></PageBoundary>}>
                    <Route index element={<Navigate to="basic" replace />} />
                    <Route path="basic" element={<PageBoundary><BasicSettings /></PageBoundary>} />
                    <Route path="workflow" element={<PageBoundary><WorkflowSettings /></PageBoundary>} />
                    <Route path="agents" element={<PageBoundary><AgentSettings /></PageBoundary>} />
                    <Route path="labels" element={<PageBoundary><LabelSettings /></PageBoundary>} />
                    <Route path="milestones" element={<PageBoundary><MilestoneSettings /></PageBoundary>} />
                    <Route path="notifications" element={<PageBoundary><NotificationSettings /></PageBoundary>} />
                  </Route>
                  <Route path="/issues/:id" element={<PageBoundary><IssueDetailPage /></PageBoundary>} />
                  <Route path="/proposals/:id" element={<PageBoundary><ProposalDetailPage /></PageBoundary>} />
                  <Route path="/tasks/:id" element={<PageBoundary><TaskDetailPage /></PageBoundary>} />
                  <Route path="/agents/:id" element={<PageBoundary><AgentDetailPage /></PageBoundary>} />
                </Route>
                <Route path="/404" element={<PageBoundary><NotFoundPage /></PageBoundary>} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </BrowserRouter>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </UrqlProvider>
    </ErrorBoundary>
  );
}
