import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { hasToken, me, refreshAuthToken } from "../api";
import { Card, CardContent } from "./ui/card";

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    async function validate() {
      if (!hasToken()) {
        const refreshed = await refreshAuthToken();
        if (!refreshed) {
          setStatus("unauthorized");
          return;
        }
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
    return (
      <div className="page-shell flex min-h-screen items-center justify-center py-10">
        <Card className="w-full max-w-sm border-border/80 bg-card/95">
          <CardContent className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            Checking your session...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "unauthorized") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
