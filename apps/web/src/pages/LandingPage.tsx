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
    <div className="min-h-screen bg-white">
      <GalleryNav />

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
        {/* Decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        {/* Glow */}
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />

        <div className="relative mx-auto max-w-6xl px-6 py-28 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300">
            <Sparkles className="h-4 w-4" />
            AI-powered pitch decks
          </div>

          <h1 className="mx-auto mb-6 max-w-3xl text-5xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
            Pitch decks that{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              win deals
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300">
            Generate persuasive presentations tailored to your audience, story framework,
            and industry knowledge — in minutes, not days.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="flex items-center gap-2 rounded-xl bg-blue-500 px-8 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-400 hover:shadow-blue-400/30"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#gallery"
              className="flex items-center gap-2 rounded-xl border border-white/15 px-8 py-3.5 font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/5"
            >
              Browse Gallery
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────── */}
      <section className="border-b border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 px-6 sm:grid-cols-3">
          <div ref={presentations.ref} className="text-center">
            <p className="text-4xl font-bold text-slate-900">{presentations.count.toLocaleString()}+</p>
            <p className="mt-1 text-sm text-slate-500">Presentations created</p>
          </div>
          <div ref={users.ref} className="text-center">
            <p className="text-4xl font-bold text-slate-900">{users.count.toLocaleString()}+</p>
            <p className="mt-1 text-sm text-slate-500">Active users</p>
          </div>
          <div ref={slides.ref} className="text-center">
            <p className="text-4xl font-bold text-slate-900">{slides.count.toLocaleString()}+</p>
            <p className="mt-1 text-sm text-slate-500">Slides generated</p>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              Everything you need to pitch with confidence
            </h2>
            <p className="text-slate-500">
              A complete system for creating, refining, and reusing pitch decks
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BookOpen,
                title: 'Pitch Briefs',
                desc: 'Curate knowledge collections backed by knowledge graphs. Your AI draws from real context, not generic filler.',
                color: 'text-emerald-600 bg-emerald-50',
              },
              {
                icon: Focus,
                title: 'Pitch Lenses',
                desc: 'Define audience, goal, tone, and story framework. Reuse lenses across presentations for consistent messaging.',
                color: 'text-purple-600 bg-purple-50',
              },
              {
                icon: Sparkles,
                title: 'AI Generation',
                desc: 'Outline, approve, generate. Each slide reviewed for quality, density, and audience fit before delivery.',
                color: 'text-blue-600 bg-blue-50',
              },
              {
                icon: GitFork,
                title: 'Reuse & Fork',
                desc: 'Proven deck structures become templates. Fork with different Brief and Lens for instant context swaps.',
                color: 'text-amber-600 bg-amber-50',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
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
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-600/20">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold text-slate-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Public Gallery ───────────────────────────── */}
      <section id="gallery" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="mb-1 text-3xl font-bold text-slate-900">Community Gallery</h2>
              <p className="text-slate-500">Public presentations from the Pitchable community</p>
            </div>
            {gallery.length > 0 && (
              <Link
                to="/gallery"
                className="flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
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
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
              <Layers className="mb-4 h-12 w-12 text-slate-300" />
              <p className="mb-2 text-lg font-medium text-slate-400">Gallery coming soon</p>
              <p className="text-sm text-slate-400">
                Be the first to publish a presentation
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Ready to pitch with confidence?
          </h2>
          <p className="mb-8 text-lg text-slate-300">
            Start creating AI-powered presentations for free. No credit card required.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-400"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-slate-900">Pitchable</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link to="/gallery" className="hover:text-slate-900">Gallery</Link>
            <Link to="/login" className="hover:text-slate-900">Log in</Link>
            <Link to="/register" className="hover:text-slate-900">Sign up</Link>
          </div>
          <p className="text-sm text-slate-400">
            Built with AI. Designed to win.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
