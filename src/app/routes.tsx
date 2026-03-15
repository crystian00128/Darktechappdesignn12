import { createBrowserRouter, Navigate } from "react-router";
import { LoginPage } from "./pages/login-page";
import { AdminPanel } from "./pages/admin-panel";
import { VendedorPanel } from "./pages/vendedor-panel";
import { ClientePanel } from "./pages/cliente-panel";
import { MotoristaPanel } from "./pages/motorista-panel";
import { RegisterPage } from "./pages/register-page";
import { ProtectedRoute } from "./components/protected-route";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/register/:type",
    Component: RegisterPage,
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute requiredType="admin">
        <AdminPanel />
      </ProtectedRoute>
    ),
  },
  {
    path: "/vendedor",
    element: (
      <ProtectedRoute requiredType="vendedor">
        <VendedorPanel />
      </ProtectedRoute>
    ),
  },
  {
    path: "/cliente",
    element: (
      <ProtectedRoute requiredType="cliente">
        <ClientePanel />
      </ProtectedRoute>
    ),
  },
  {
    path: "/motorista",
    element: (
      <ProtectedRoute requiredType="motorista">
        <MotoristaPanel />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);