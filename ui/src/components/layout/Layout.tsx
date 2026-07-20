import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TopBar } from "./TopBar";

export function Layout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="flex-1 min-w-0 p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
}
