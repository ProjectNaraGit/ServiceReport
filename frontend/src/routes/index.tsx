import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "../pages/auth/Login.tsx";
import DashboardShell from "../components/layout/DashboardShell.tsx";
import AdminDashboard from "../pages/admin/AdminDashboard.tsx";
import ReportForm from "../pages/admin/ReportForm.tsx";
import HistoryPage from "../pages/admin/HistoryPage.tsx";
import UserManagement from "../pages/admin/UserManagement.tsx";
import TechnicianReports from "../pages/teknisi/TechnicianReports.tsx";
import TechnicianUpdate from "../pages/teknisi/TechnicianUpdate.tsx";
import { ProtectedRoute } from "./ProtectedRoute.tsx";
import { useAuth } from "../hooks/useAuth.tsx";

function DefaultLanding() {
  const { user } = useAuth();
  if (user?.role === "TEKNISI") {
    return <Navigate to="/teknisi/reports" replace />;
  }
  return <AdminDashboard />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute roles={["MASTER_ADMIN", "ADMIN", "TEKNISI"]}>
            <DefaultLanding />
          </ProtectedRoute>
        ),
      },
      {
        path: "users",
        element: (
          <ProtectedRoute roles={["MASTER_ADMIN", "ADMIN"]}>
            <UserManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "reports/new",
        element: (
          <ProtectedRoute roles={["ADMIN"]}>
            <ReportForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "history",
        element: (
          <ProtectedRoute roles={["MASTER_ADMIN", "ADMIN"]}>
            <HistoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "teknisi/reports",
        element: (
          <ProtectedRoute roles={["TEKNISI", "ADMIN", "MASTER_ADMIN"]}>
            <TechnicianReports />
          </ProtectedRoute>
        ),
      },
      {
        path: "teknisi/reports/:id",
        element: (
          <ProtectedRoute roles={["TEKNISI", "ADMIN", "MASTER_ADMIN"]}>
            <TechnicianUpdate />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
