import { Link } from "react-router-dom";
import { ArrowRight, Blocks, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import BrandLogo from "../components/BrandLogo";

export default function HomePage() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Secure Auth",
      text: "Register and login with JWT access + refresh flow built for your assignment."
    },
    {
      icon: Blocks,
      title: "Document Dashboard",
      text: "Create, rename, and delete documents with latest updated time visibility."
    },
    {
      icon: Sparkles,
      title: "Block-first Vision",
      text: "Prepared architecture for paragraph, heading, todo, code, divider, and image blocks."
    }
  ];

  const milestones = [
    "Day 1: Auth + Dashboard + DB schema",
    "Day 2-3: Core block editor interactions",
    "Day 4: Reorder, autosave, share read-only link",
    "Day 5: Edge-case hardening + final docs"
  ];

  return (
    <main className="page-shell py-6 sm:py-8">
      <nav className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <BrandLogo linked className="text-sm font-semibold tracking-[-0.02em]" />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Register</Link>
          </Button>
        </div>
      </nav>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-border/80 bg-card/95">
          <CardContent className="relative p-8 sm:p-10">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-stone-200/35 to-transparent" />
            <div className="relative space-y-6">
              <Badge variant="subtle" className="w-fit gap-2 px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
                <FileText className="h-3.5 w-3.5" />
                Notion-like workspace
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-balance font-sans text-4xl font-semibold leading-none tracking-[-0.06em] text-foreground sm:text-6xl">
                  Write in blocks, organize with calm, and keep the UI out of your way.
                </h1>
                <p className="max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
                  A clean block editor starter with document management, smooth auth flow, and a softer,
                  more editorial interface inspired by Notion.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full px-6">
                  <Link to="/login">
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-6">
                  <Link to="/register">Create account</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/80 bg-background notion-grid">
          <CardContent className="p-0">
            <div className="border-b border-border/80 bg-card/90 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-stone-300" />
                  <span className="h-2 w-2 rounded-full bg-stone-300" />
                  <span className="h-2 w-2 rounded-full bg-stone-300" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Untitled</span>
              </div>
            </div>
            <div className="space-y-4 p-6">
              <div className="space-y-2 rounded-2xl border border-border/70 bg-card/95 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Heading 1</p>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">Daily Notes</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Capture ideas fast, then turn them into structured blocks without losing context.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Todo</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <span className="h-4 w-4 rounded border border-border bg-background" />
                    Draft API edge-case tests
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-4 w-4 rounded border border-border bg-background" />
                    Polish onboarding copy
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Code</p>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">Snippet</span>
                </div>
                <pre className="overflow-hidden rounded-xl bg-stone-950/95 p-3 text-[11px] leading-5 text-stone-100">
{`const saveState = {
  inFlight: true,
  queued: 2
};`}
                </pre>
              </div>

              <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-stone-200/55 to-stone-100/35 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Image</p>
                <div className="mt-2 h-16 rounded-xl border border-white/60 bg-gradient-to-r from-white/70 via-white/40 to-white/70" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        {features.map((item) => (
          <Card key={item.title} className="border-border/80 bg-card/95">
            <CardContent className="space-y-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold tracking-[-0.03em]">{item.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{item.text}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 bg-card/95">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">Block types</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                A small, focused set to keep the editing surface simple and recognizable.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["paragraph", "heading_1", "heading_2", "todo", "code", "divider", "image"].map((item) => (
                <Badge key={item} variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">Timeline</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                The current app structure is already staged around these milestones.
              </p>
            </div>
            <div className="space-y-3">
              {milestones.map((step, index) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
