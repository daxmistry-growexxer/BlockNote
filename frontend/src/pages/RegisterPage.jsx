import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { hasToken, refreshAuthToken, register } from "../api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(false);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (hasToken()) {
        return;
      }

      setCheckingSession(true);
      const ok = await refreshAuthToken();
      if (active && ok) {
        navigate("/dashboard", { replace: true });
      }
      if (active) {
        setCheckingSession(false);
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (hasToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (checkingSession) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center py-10">
        <Card className="w-full max-w-sm border-border/80 bg-card/95">
          <CardContent className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            Restoring your session...
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await register({ email, password });
      toast.success("Account created");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.message || "Registration failed");
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell flex min-h-screen items-center py-8">
      <div className="grid w-full gap-4 lg:grid-cols-[1.08fr_440px]">
        <Card className="overflow-hidden border-border/80 bg-card/95">
          <CardContent className="flex h-full flex-col justify-between gap-8 p-8 sm:p-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 text-sm font-semibold tracking-[-0.02em]">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                <span>BlockNote</span>
              </div>
              <Badge variant="subtle" className="w-fit gap-2 rounded-full px-3 py-1 uppercase tracking-[0.16em]">
                <Sparkles className="h-3.5 w-3.5" />
                Notion-style onboarding
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-xl text-balance text-4xl font-semibold leading-none tracking-[-0.06em] sm:text-5xl">
                  Create your workspace and start writing in blocks.
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground">
                  This is a UI refactor only. Your registration flow, validation rules, and backend interaction remain unchanged.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-secondary/60 p-5">
              <p className="text-sm font-medium">Password rule</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                At least 8 characters and 1 number, exactly as enforced by your existing backend.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-background/95">
          <CardContent className="p-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Register</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em]">Create account</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Same form behavior, cleaner presentation.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-3 rounded-xl border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="flex items-center gap-3 rounded-xl border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars + 1 number"
                    autoComplete="new-password"
                    className="border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={busy} className="w-full rounded-xl">
                {busy ? "Creating..." : "Register"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>
                Already registered?{" "}
                <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Login
                </Link>
              </p>
              <Link to="/" className="font-medium underline-offset-4 hover:underline">
                Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
