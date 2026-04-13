import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { hasToken, me } from "../api";

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    async function validate() {
      if (!hasToken()) {
        setStatus("unauthorized");
        return;
      }

      try {
        await me();
        setStatus("authorized");
      } catch {
        setStatus("unauthorized");
      }
    }

    validate();
  }, []);

  if (status === "checking") {
    return <div className="center-card">Loading...</div>;
  }

  if (status === "unauthorized") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
