import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/app/auth-context";
import { AppLayout } from "@/layouts/app-layout";
import type { UserRole } from "@/api/types";

const AuthPage = lazy(() => import("@/pages/auth-page"));
const CandidateJobsPage = lazy(() => import("@/pages/candidate-jobs-page"));
const CandidateJobDetailsPage = lazy(() => import("@/pages/candidate-job-details-page"));
const CandidateApplicationsPage = lazy(() => import("@/pages/candidate-applications-page"));
const CandidateProfilePage = lazy(() => import("@/pages/candidate-profile-page"));
const HrDashboardPage = lazy(() => import("@/pages/hr-dashboard-page"));
const HrJobDetailsPage = lazy(() => import("@/pages/hr-job-details-page"));
const HrJobsPage = lazy(() => import("@/pages/hr-jobs-page"));

function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading workspace
      </div>
    </div>
  );
}

function ProtectedRoute({ role }: { role: UserRole }) {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  if (user.role !== role) {
    return <Navigate to={user.role === "hr" ? "/hr" : "/candidate/jobs"} replace />;
  }
  return <Outlet />;
}

function RootRedirect() {
  const { user, isBootstrapping } = useAuth();
  if (isBootstrapping) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={user.role === "hr" ? "/hr" : "/candidate/jobs"} replace />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<ProtectedRoute role="candidate" />}>
          <Route element={<AppLayout />}>
            <Route path="/candidate/jobs" element={<CandidateJobsPage />} />
            <Route path="/candidate/jobs/:jobId" element={<CandidateJobDetailsPage />} />
            <Route path="/candidate/applications" element={<CandidateApplicationsPage />} />
            <Route path="/candidate/profile" element={<CandidateProfilePage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute role="hr" />}>
          <Route element={<AppLayout />}>
            <Route path="/hr" element={<HrDashboardPage />} />
            <Route path="/hr/jobs" element={<HrJobsPage />} />
            <Route path="/hr/jobs/:jobId" element={<HrJobDetailsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
}
