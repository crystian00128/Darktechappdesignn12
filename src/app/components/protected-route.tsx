import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredType?: "admin" | "vendedor" | "cliente" | "motorista";
}

export function ProtectedRoute({ children, requiredType }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    
    if (!currentUser) {
      navigate("/");
      return;
    }

    try {
      const user = JSON.parse(currentUser);
      
      const userRole = user.role || user.tipo;
      // Allow admin to view vendedor panel via adminViewing flag
      if (requiredType && userRole !== requiredType) {
        if (user.adminViewing && requiredType === "vendedor") {
          // Admin is viewing vendedor panel - allow access
        } else {
          navigate("/");
          return;
        }
      }
      
      setIsAuthorized(true);
    } catch (error) {
      localStorage.removeItem("currentUser");
      navigate("/");
    }
  }, [navigate, requiredType]);

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}