import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { GalleryNav } from '@/components/gallery/GalleryNav';
import { GalleryCard } from '@/components/gallery/GalleryCard';
import type { GalleryPresentation } from '@/components/gallery/GalleryCard';
import {
  Layers,
  BookOpen,
  Focus,
  Sparkles,
  ArrowRight,
  Zap,
  Shield,
  GitFork,
  Check,
} from 'lucide-react';

// ── Animated Counter ─────────────────────────────────────────

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

// ── Landing Page ─────────────────────────────────────────────

export function LandingPage() {
  const [stats, setStats] = useState({ totalPresentations: 0, totalUsers: 0, totalSlides: 0 });
  const [gallery, setGallery] = useState<GalleryPresentation[]>([]);

  useEffect(() => {
    fetch('/gallery/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});

    fetch('/gallery/presentations?limit=6')
      .then((r) => r.json())
      .then((d) => setGallery(d.items ?? []))
      .catch(() => {});
  }, []);

  const presentations = useCountUp(stats.totalPresentations);
  const users = useCountUp(stats.totalUsers);
  const slides = useCountUp(stats.totalSlides);

  return (
    <div className="min-h-screen bg-background">
      <GalleryNav />

      {/* ── Hero — Lovable-inspired gradient: black → orange luminescence ─── */}
      <section className="relative overflow-hidden">
        {/* Base: deep black */}
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        {/* Orange/amber gradient glow — fades from bottom center */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_120%,rgba(249,115,22,0.3),transparent)]" />
        {/* Subtle warm highlight top-center */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(249,115,22,0.06),transparent)]" />

        <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 text-center sm:pb-32 sm:pt-28 md:pb-40 md:pt-36">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-sm text-orange-300">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered pitch decks
          </div>

          <h1 className="mx-auto mb-6 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Make your ideas{' '}
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300 bg-clip-text text-transparent">
              pitchable
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-xl text-lg leading-relaxed text-[#a1a1a1]">
            Generate persuasive presentations tailored to your audience,
            story framework, and industry knowledge.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-400 hover:shadow-orange-400/25"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#gallery"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-8 py-3.5 font-semibold text-white/80 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              Browse Gallery
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────── */}
      <section className="border-y border-border bg-card/50 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 px-6 sm:grid-cols-3">
          <div ref={presentations.ref} className="text-center">
            <p className="text-4xl font-bold text-foreground">{presentations.count.toLocaleString()}+</p>
            <p className="mt-1 text-sm text-muted-foreground">Presentations created</p>
          </div>
          <div ref={users.ref} className="text-center">
            <p className="text-4xl font-bold text-foreground">{users.count.toLocaleString()}+</p>
            <p className="mt-1 text-sm text-muted-foreground">Active users</p>
          </div>
          <div ref={slides.ref} className="text-center">
            <p className="text-4xl font-bold text-foreground">{slides.count.toLocaleString()}+</p>
            <p className="mt-1 text-sm text-muted-foreground">Slides generated</p>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold text-foreground">
              Everything you need to pitch with confidence
            </h2>
            <p className="text-muted-foreground">
              A complete system for creating, refining, and reusing pitch decks
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BookOpen,
                title: 'Pitch Briefs',
                desc: 'Curate knowledge collections backed by knowledge graphs. Your AI draws from real context, not generic filler.',
                color: 'text-orange-400 bg-orange-500/10',
              },
              {
                icon: Focus,
                title: 'Pitch Lenses',
                desc: 'Define audience, goal, tone, and story framework. Reuse lenses across presentations for consistent messaging.',
                color: 'text-amber-400 bg-amber-500/10',
              },
              {
                icon: Sparkles,
                title: 'AI Generation',
                desc: 'Outline, approve, generate. Each slide reviewed for quality, density, and audience fit before delivery.',
                color: 'text-orange-300 bg-orange-400/10',
              },
              {
                icon: GitFork,
                title: 'Reuse & Fork',
                desc: 'Proven deck structures become templates. Fork with different Brief and Lens for instant context swaps.',
                color: 'text-yellow-400 bg-yellow-500/10',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/5"
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section className="border-y border-border bg-card/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold text-foreground">
              Three steps to a winning deck
            </h2>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {[
              {
                step: '01',
                icon: Zap,
                title: 'Brief your AI',
                desc: 'Upload documents, link knowledge sources. Your Pitch Brief builds a searchable knowledge graph.',
              },
              {
                step: '02',
                icon: Focus,
                title: 'Set your lens',
                desc: 'Pick your audience, goal, and storytelling framework. The AI adapts tone and structure.',
              },
              {
                step: '03',
                icon: Shield,
                title: 'Generate & refine',
                desc: 'Review the outline, approve, and watch slides generate with real-time quality checks.',
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-lg font-bold text-white shadow-lg shadow-orange-500/20">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold text-foreground">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground">
              Start free. Upgrade when you need more.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: 'Free',
                price: '$0',
                period: '',
                description: 'Try Pitchable with 10 free credits',
                features: [
                  '10 credits on signup',
                  '1 deck per month',
                  'AI-powered content (Claude Opus 4.6)',
                  'PPTX, PDF, HTML export',
                ],
                cta: 'Get Started',
                popular: false,
              },
              {
                name: 'Starter',
                price: '$19',
                period: '/month',
                description: 'For regular presenters',
                features: [
                  '40 credits per month',
                  '10 decks per month',
                  'AI image generation',
                  'Priority support',
                ],
                cta: 'Start Free Trial',
                popular: true,
              },
              {
                name: 'Pro',
                price: '$49',
                period: '/month',
                description: 'For power users and teams',
                features: [
                  '100 credits per month',
                  'Unlimited decks',
                  'AI image generation',
                  'Priority support',
                ],
                cta: 'Start Free Trial',
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 transition-all hover:shadow-lg ${
                  plan.popular
                    ? 'border-orange-500 bg-card shadow-lg shadow-orange-500/10'
                    : 'border-border bg-card hover:border-orange-500/20 hover:shadow-orange-500/5'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="mb-1 text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block w-full rounded-xl py-3 text-center font-semibold transition-all ${
                    plan.popular
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-400'
                      : 'border border-border text-foreground hover:bg-accent'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Public Gallery ───────────────────────────── */}
      <section id="gallery" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-1 text-3xl font-bold text-foreground">Community Gallery</h2>
              <p className="text-muted-foreground">Public presentations from the Pitchable community</p>
            </div>
            {gallery.length > 0 && (
              <Link
                to="/gallery"
                className="flex items-center gap-1 text-sm font-medium text-orange-400 transition-colors hover:text-orange-300"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {gallery.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((p) => (
                <GalleryCard key={p.id} presentation={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-20">
              <Layers className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="mb-2 text-lg font-medium text-muted-foreground">Gallery coming soon</p>
              <p className="text-sm text-muted-foreground">
                Be the first to publish a presentation
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA — gradient glow from bottom ───────────────────── */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(249,115,22,0.25),transparent)]" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Ready to pitch with confidence?
          </h2>
          <p className="mb-8 text-lg text-[#a1a1a1]">
            Start creating AI-powered presentations for free. No credit card required.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-400"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer — Lovable-style elevated panel ────────────── */}
      <footer className="bg-card py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-foreground">Pitchable</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/gallery" className="transition-colors hover:text-foreground">Gallery</Link>
            <Link to="/docs" className="transition-colors hover:text-foreground">Docs</Link>
            <Link to="/login" className="transition-colors hover:text-foreground">Log in</Link>
            <Link to="/register" className="transition-colors hover:text-foreground">Sign up</Link>
          </div>
          <p className="text-sm text-muted-foreground/70">
            Built with AI. Designed to win.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
