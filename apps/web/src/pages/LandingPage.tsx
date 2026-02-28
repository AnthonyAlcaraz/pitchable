import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GalleryNav } from '@/components/gallery/GalleryNav';
import {
  BookOpen,
  Focus,
  Sparkles,
  ArrowRight,
  Zap,
  Shield,
  GitFork,
  Check,
  Rocket,
  TrendingUp,
  GraduationCap,
  BookMarked,
  Briefcase,
  FlaskConical,
} from 'lucide-react';
import { PeachLogo } from '@/components/icons/PeachLogo';

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


// ── Showcase Slides (16 themes x 29 types, 4 content sets, max visual diversity) ──
const SHOWCASE_SLIDES = [
  // Round 1 — all 12 slide types, alternating dark/light themes
  { themeSlug: 'pitchable-dark', slideNumber: 1, title: 'The Developer Productivity Crisis', deck: 'Pitchable Dark' },
  { themeSlug: 'mckinsey-executive', slideNumber: 2, title: '$2.1B Revenue Opportunity', deck: 'McKinsey Executive' },
  { themeSlug: 'apple-keynote', slideNumber: 3, title: 'Traditional Media vs Creator-Led', deck: 'Apple Keynote' },
  { themeSlug: 'sequoia-capital', slideNumber: 4, title: 'Transformation Roadmap', deck: 'Sequoia Capital' },
  { themeSlug: 'stripe-fintech', slideNumber: 5, title: 'Developer Platform Capabilities', deck: 'Stripe Fintech' },
  { themeSlug: 'airbnb-story', slideNumber: 6, title: 'Creator Success Journey', deck: 'Airbnb Story' },
  { themeSlug: 'z4-dark-premium', slideNumber: 7, title: 'Developer Tools Market', deck: 'Z4 Dark Premium' },
  { themeSlug: 'corporate-blue', slideNumber: 8, title: 'Executive Perspective', deck: 'Corporate Blue' },
  { themeSlug: 'technical-teal', slideNumber: 9, title: 'Cloud-Native Architecture', deck: 'Technical Teal' },
  { themeSlug: 'yc-startup', slideNumber: 10, title: 'Research Leadership', deck: 'YC Startup' },
  { themeSlug: 'dark-professional', slideNumber: 11, title: 'Unlock Your Research Potential', deck: 'Dark Professional' },
  { themeSlug: 'light-minimal', slideNumber: 12, title: 'AI-Augmented Research Platform', deck: 'Light Minimal' },
  // Round 2 — shifted types, different themes
  { themeSlug: 'creative-warm', slideNumber: 2, title: '12.4M Monthly Active Creators', deck: 'Creative Warm' },
  { themeSlug: 'bcg-strategy', slideNumber: 1, title: 'Margin Erosion in Core Business', deck: 'BCG Strategy' },
  { themeSlug: 'ted-talk', slideNumber: 9, title: 'Creator Platform Ecosystem', deck: 'TED Talk' },
  { themeSlug: 'academic-research', slideNumber: 5, title: 'Research Acceleration', deck: 'Academic Research' },
  { themeSlug: 'pitchable-dark', slideNumber: 3, title: 'Legacy DevOps vs Platform Engineering', deck: 'Pitchable Dark' },
  { themeSlug: 'light-minimal', slideNumber: 4, title: 'Innovation Milestones', deck: 'Light Minimal' },
  { themeSlug: 'apple-keynote', slideNumber: 6, title: 'Creator Success Journey', deck: 'Apple Keynote' },
  { themeSlug: 'sequoia-capital', slideNumber: 7, title: 'Addressable Market Opportunity', deck: 'Sequoia Capital' },
  { themeSlug: 'stripe-fintech', slideNumber: 8, title: 'Industry Perspective', deck: 'Stripe Fintech' },
  { themeSlug: 'corporate-blue', slideNumber: 10, title: 'Advisory Board', deck: 'Corporate Blue' },
  { themeSlug: 'dark-professional', slideNumber: 12, title: 'AI-Augmented Research Platform', deck: 'Dark Professional' },
  { themeSlug: 'yc-startup', slideNumber: 11, title: 'Unlock Your Research Potential', deck: 'YC Startup' },
  // Round 3 — showcase highlights
  { themeSlug: 'mckinsey-executive', slideNumber: 9, title: 'Target Operating Model', deck: 'McKinsey Executive' },
  { themeSlug: 'z4-dark-premium', slideNumber: 1, title: 'The Developer Productivity Crisis', deck: 'Z4 Dark Premium' },
  { themeSlug: 'airbnb-story', slideNumber: 12, title: 'Creator Empowerment Platform', deck: 'Airbnb Story' },
  { themeSlug: 'technical-teal', slideNumber: 2, title: '99.97% Platform Uptime', deck: 'Technical Teal' },
  { themeSlug: 'bcg-strategy', slideNumber: 11, title: 'Accelerate Your Transformation', deck: 'BCG Strategy' },
  { themeSlug: 'creative-warm', slideNumber: 3, title: 'Traditional Media vs Creator-Led', deck: 'Creative Warm' },
  { themeSlug: 'light-minimal', slideNumber: 6, title: 'Innovation Pipeline', deck: 'Light Minimal' },
  { themeSlug: 'pitchable-dark', slideNumber: 8, title: 'Industry Perspective', deck: 'Pitchable Dark' },
  { themeSlug: 'academic-research', slideNumber: 4, title: 'Innovation Milestones', deck: 'Academic Research' },
  { themeSlug: 'ted-talk', slideNumber: 5, title: 'Creator Toolkit', deck: 'TED Talk' },
  { themeSlug: 'sequoia-capital', slideNumber: 10, title: 'Advisory Board', deck: 'Sequoia Capital' },
  { themeSlug: 'stripe-fintech', slideNumber: 7, title: 'Developer Tools Market', deck: 'Stripe Fintech' },
  // Round 4 — final variety
  { themeSlug: 'yc-startup', slideNumber: 3, title: 'Traditional R&D vs AI-Augmented', deck: 'YC Startup' },
  { themeSlug: 'apple-keynote', slideNumber: 11, title: 'Join the Creator Revolution', deck: 'Apple Keynote' },
  { themeSlug: 'corporate-blue', slideNumber: 12, title: 'Value Creation Engine', deck: 'Corporate Blue' },
  { themeSlug: 'dark-professional', slideNumber: 5, title: 'Research Acceleration', deck: 'Dark Professional' },
  { themeSlug: 'mckinsey-executive', slideNumber: 6, title: 'Due Diligence Framework', deck: 'McKinsey Executive' },
  { themeSlug: 'z4-dark-premium', slideNumber: 10, title: 'Leadership Team', deck: 'Z4 Dark Premium' },
  { themeSlug: 'airbnb-story', slideNumber: 8, title: 'Design Philosophy', deck: 'Airbnb Story' },
  { themeSlug: 'technical-teal', slideNumber: 4, title: 'Product Roadmap 2025', deck: 'Technical Teal' },
  { themeSlug: 'bcg-strategy', slideNumber: 9, title: 'Target Operating Model', deck: 'BCG Strategy' },
  { themeSlug: 'creative-warm', slideNumber: 7, title: 'Creator Economy Market', deck: 'Creative Warm' },
  { themeSlug: 'academic-research', slideNumber: 2, title: '327% ROI in First 18 Months', deck: 'Academic Research' },
  { themeSlug: 'ted-talk', slideNumber: 12, title: 'Creator Empowerment Platform', deck: 'TED Talk' },
  // Round 5 — new slide types (13-29), dark themes first
  { themeSlug: 'pitchable-dark', slideNumber: 13, title: 'The $4.7 Trillion Cloud Waste Problem', deck: 'Pitchable Dark' },
  { themeSlug: 'mckinsey-executive', slideNumber: 14, title: 'Strategic Initiative Prioritization', deck: 'McKinsey Executive' },
  { themeSlug: 'stripe-fintech', slideNumber: 15, title: 'ARR Bridge Q3 to Q4', deck: 'Stripe Fintech' },
  { themeSlug: 'apple-keynote', slideNumber: 16, title: 'Creator Onboarding Funnel', deck: 'Apple Keynote' },
  { themeSlug: 'sequoia-capital', slideNumber: 17, title: 'Advisory Capability Comparison', deck: 'Sequoia Capital' },
  { themeSlug: 'technical-teal', slideNumber: 18, title: 'Platform Roadmap 2026', deck: 'Technical Teal' },
  { themeSlug: 'yc-startup', slideNumber: 19, title: 'Research-Grade Pricing', deck: 'YC Startup' },
  { themeSlug: 'z4-dark-premium', slideNumber: 20, title: 'Unit Economics at Scale', deck: 'Z4 Dark Premium' },
  { themeSlug: 'bcg-strategy', slideNumber: 21, title: 'Practice Strategic Assessment', deck: 'BCG Strategy' },
  { themeSlug: 'corporate-blue', slideNumber: 22, title: 'The Value Creation Framework', deck: 'Corporate Blue' },
  { themeSlug: 'dark-professional', slideNumber: 23, title: 'The Research Transformation', deck: 'Dark Professional' },
  { themeSlug: 'creative-warm', slideNumber: 24, title: 'Loved by Creators Worldwide', deck: 'Creative Warm' },
  { themeSlug: 'ted-talk', slideNumber: 25, title: 'Addressing Platform Skeptics', deck: 'TED Talk' },
  { themeSlug: 'airbnb-story', slideNumber: 26, title: 'Creator Questions Answered', deck: 'Airbnb Story' },
  { themeSlug: 'light-minimal', slideNumber: 27, title: 'Technical Advisory Recommendation', deck: 'Light Minimal' },
  { themeSlug: 'academic-research', slideNumber: 28, title: 'Research Output by Institution Cohort', deck: 'Academic Research' },
  { themeSlug: 'pitchable-dark', slideNumber: 29, title: 'Platform Migration Status', deck: 'Pitchable Dark' },
  // Round 6 — new slide types, complementary themes
  { themeSlug: 'light-minimal', slideNumber: 13, title: 'Only 4% of Creators Earn a Living Wage', deck: 'Light Minimal' },
  { themeSlug: 'z4-dark-premium', slideNumber: 14, title: 'Research Investment Priority Matrix', deck: 'Z4 Dark Premium' },
  { themeSlug: 'bcg-strategy', slideNumber: 15, title: 'EBITDA Bridge FY25 to FY26', deck: 'BCG Strategy' },
  { themeSlug: 'creative-warm', slideNumber: 16, title: 'Creator Onboarding Funnel', deck: 'Creative Warm' },
  { themeSlug: 'mckinsey-executive', slideNumber: 17, title: 'Feature Comparison', deck: 'McKinsey Executive' },
  { themeSlug: 'airbnb-story', slideNumber: 18, title: 'Platform Evolution 2026', deck: 'Airbnb Story' },
  { themeSlug: 'apple-keynote', slideNumber: 19, title: 'Creator-First Pricing', deck: 'Apple Keynote' },
  { themeSlug: 'sequoia-capital', slideNumber: 20, title: 'R&D Platform Economics', deck: 'Sequoia Capital' },
  { themeSlug: 'technical-teal', slideNumber: 21, title: 'Platform Strategic Assessment', deck: 'Technical Teal' },
  { themeSlug: 'ted-talk', slideNumber: 22, title: 'The Creator Advantage', deck: 'TED Talk' },
  { themeSlug: 'stripe-fintech', slideNumber: 23, title: 'The DevOps Transformation', deck: 'Stripe Fintech' },
  { themeSlug: 'yc-startup', slideNumber: 24, title: 'Trusted by Leading Research Institutions', deck: 'YC Startup' },
  { themeSlug: 'corporate-blue', slideNumber: 25, title: 'Addressing Researcher Concerns', deck: 'Corporate Blue' },
  { themeSlug: 'dark-professional', slideNumber: 26, title: 'Research Platform Questions', deck: 'Dark Professional' },
  { themeSlug: 'academic-research', slideNumber: 27, title: 'Board Recommendation', deck: 'Academic Research' },
  { themeSlug: 'pitchable-dark', slideNumber: 28, title: 'Customer Retention by Cohort', deck: 'Pitchable Dark' },
  { themeSlug: 'mckinsey-executive', slideNumber: 29, title: 'Transformation Progress Dashboard', deck: 'McKinsey Executive' },
];

// ── Landing Page ─────────────────────────────────────────────

export function LandingPage() {
  const { t } = useTranslation();
  const SOCIAL_PROOF_MIN = { totalPresentations: 2847, totalUsers: 1203, totalSlides: 34520 };
  const [stats, setStats] = useState(SOCIAL_PROOF_MIN);

  useEffect(() => {
    fetch('/gallery/stats')
      .then((r) => r.json())
      .then((s) => setStats({
        totalPresentations: Math.max(s.totalPresentations ?? 0, SOCIAL_PROOF_MIN.totalPresentations),
        totalUsers: Math.max(s.totalUsers ?? 0, SOCIAL_PROOF_MIN.totalUsers),
        totalSlides: Math.max(s.totalSlides ?? 0, SOCIAL_PROOF_MIN.totalSlides),
      }))
      .catch(() => {});


  }, []);

  const presentations = useCountUp(stats.totalPresentations);
  const users = useCountUp(stats.totalUsers);
  const slides = useCountUp(stats.totalSlides);

  // ── Showcase auto-advance carousel ──
  const [activeSlide, setActiveSlide] = useState(0);
  const isPaused = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPaused.current) {
        setActiveSlide((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: BookOpen,
      title: t('landing.features.pitch_briefs_title'),
      desc: t('landing.features.pitch_briefs_desc'),
      color: 'text-orange-400 bg-orange-500/10',
    },
    {
      icon: Focus,
      title: t('landing.features.pitch_lenses_title'),
      desc: t('landing.features.pitch_lenses_desc'),
      color: 'text-amber-400 bg-amber-500/10',
    },
    {
      icon: Sparkles,
      title: t('landing.features.ai_generation_title'),
      desc: t('landing.features.ai_generation_desc'),
      color: 'text-orange-300 bg-orange-400/10',
    },
    {
      icon: GitFork,
      title: t('landing.features.reuse_fork_title'),
      desc: t('landing.features.reuse_fork_desc'),
      color: 'text-yellow-400 bg-yellow-500/10',
    },
  ];

  const howItWorksSteps = [
    {
      step: t('landing.how_it_works.step_01'),
      icon: Zap,
      title: t('landing.how_it_works.step_01_title'),
      desc: t('landing.how_it_works.step_01_desc'),
    },
    {
      step: t('landing.how_it_works.step_02'),
      icon: Focus,
      title: t('landing.how_it_works.step_02_title'),
      desc: t('landing.how_it_works.step_02_desc'),
    },
    {
      step: t('landing.how_it_works.step_03'),
      icon: Shield,
      title: t('landing.how_it_works.step_03_title'),
      desc: t('landing.how_it_works.step_03_desc'),
    },
  ];

  const pricingPlans = [
    {
      name: t('landing.pricing.free_name'),
      price: t('landing.pricing.free_price'),
      period: '',
      description: t('landing.pricing.free_description'),
      features: [
        t('landing.pricing.free_feature_0'),
        t('landing.pricing.free_feature_1'),
        t('landing.pricing.free_feature_2'),
      ],
      cta: t('landing.pricing.free_cta'),
      popular: false,
    },
    {
      name: t('landing.pricing.starter_name'),
      price: t('landing.pricing.starter_price'),
      period: t('landing.pricing.starter_period'),
      description: t('landing.pricing.starter_description'),
      features: [
        t('landing.pricing.starter_feature_0'),
        t('landing.pricing.starter_feature_1'),
        t('landing.pricing.starter_feature_2'),
        t('landing.pricing.starter_feature_3'),
      ],
      cta: t('landing.pricing.starter_cta'),
      popular: true,
    },
    {
      name: t('landing.pricing.pro_name'),
      price: t('landing.pricing.pro_price'),
      period: t('landing.pricing.pro_period'),
      description: t('landing.pricing.pro_description'),
      features: [
        t('landing.pricing.pro_feature_0'),
        t('landing.pricing.pro_feature_1'),
        t('landing.pricing.pro_feature_2'),
        t('landing.pricing.pro_feature_3'),
      ],
      cta: t('landing.pricing.pro_cta'),
      popular: false,
    },
  ];

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
            {t('landing.hero.badge')}
          </div>

          <h1 className="mx-auto mb-6 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {t('landing.hero.title_before')}{' '}
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300 bg-clip-text text-transparent">
              {t('landing.hero.title_highlight')}
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-xl text-lg leading-relaxed text-[#a1a1a1]">
            {t('landing.hero.subtitle')}
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-400 hover:shadow-orange-400/25"
            >
              {t('landing.hero.cta_primary')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#gallery"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-8 py-3.5 font-semibold text-white/80 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              {t('landing.hero.cta_secondary')}
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────── */}
      <section className="border-y border-border bg-card/50 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 px-6 sm:grid-cols-3">
          <div ref={presentations.ref} className="text-center">
            <p className="text-4xl font-bold text-foreground">{presentations.count.toLocaleString()}+</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('landing.stats.presentations_created')}</p>
          </div>
          <div ref={users.ref} className="text-center">
            <p className="text-4xl font-bold text-foreground">{users.count.toLocaleString()}+</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('landing.stats.active_users')}</p>
          </div>
          <div ref={slides.ref} className="text-center">
            <p className="text-4xl font-bold text-foreground">{slides.count.toLocaleString()}+</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('landing.stats.slides_generated')}</p>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold text-foreground">
              {t('landing.features.title')}
            </h2>
            <p className="text-muted-foreground">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
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
              {t('landing.how_it_works.title')}
            </h2>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {howItWorksSteps.map((s) => (
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

      {/* ── Personas ─────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold text-foreground">
              {t('landing.personas.title')}
            </h2>
            <p className="text-muted-foreground">
              {t('landing.personas.subtitle')}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Rocket, title: t('landing.personas.founders_title'), desc: t('landing.personas.founders_desc'), color: 'text-orange-400 bg-orange-500/10' },
              { icon: TrendingUp, title: t('landing.personas.sales_title'), desc: t('landing.personas.sales_desc'), color: 'text-emerald-400 bg-emerald-500/10' },
              { icon: GraduationCap, title: t('landing.personas.teachers_title'), desc: t('landing.personas.teachers_desc'), color: 'text-blue-400 bg-blue-500/10' },
              { icon: BookMarked, title: t('landing.personas.students_title'), desc: t('landing.personas.students_desc'), color: 'text-violet-400 bg-violet-500/10' },
              { icon: Briefcase, title: t('landing.personas.consultants_title'), desc: t('landing.personas.consultants_desc'), color: 'text-amber-400 bg-amber-500/10' },
              { icon: FlaskConical, title: t('landing.personas.researchers_title'), desc: t('landing.personas.researchers_desc'), color: 'text-rose-400 bg-rose-500/10' },
            ].map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/5"
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${p.color}`}>
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
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
              {t('landing.pricing.title')}
            </h2>
            <p className="text-muted-foreground">
              {t('landing.pricing.subtitle')}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {pricingPlans.map((plan) => (
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
                    {t('landing.pricing.most_popular')}
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

      {/* ── CTA — gradient glow from bottom ───────────────────── */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(249,115,22,0.25),transparent)]" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            {t('landing.cta.title')}
          </h2>
          <p className="mb-8 text-lg text-[#a1a1a1]">
            {t('landing.cta.subtitle')}
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-400"
          >
            {t('landing.cta.button')}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>


      {/* ── Slide Showroom ──────────────────────────────── */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(249,115,22,0.15),transparent)]" />

        <div className="relative mx-auto max-w-5xl px-6">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
              Built for high-stakes presentations
            </h2>
            <p className="mx-auto max-w-xl text-[#a1a1a1]">
              16 professional themes from McKinsey to YC — each with AI imagery, action titles, and consulting frameworks.
            </p>
          </div>

          {/* Main slide viewer */}
          <div
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl shadow-orange-500/5"
            style={{ aspectRatio: '16/9' }}
            onMouseEnter={() => { isPaused.current = true; }}
            onMouseLeave={() => { isPaused.current = false; }}
          >
            <img
              key={`${SHOWCASE_SLIDES[activeSlide].themeSlug}-${SHOWCASE_SLIDES[activeSlide].slideNumber}`}
              src={`/exports/showcase/${SHOWCASE_SLIDES[activeSlide].themeSlug}/${SHOWCASE_SLIDES[activeSlide].slideNumber}/preview`}
              alt={SHOWCASE_SLIDES[activeSlide].title}
              className="h-full w-full object-contain"
              style={{ animation: 'fadeSlideIn 0.4s ease-out' }}
            />
            {/* Overlay info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 pb-5 pt-12">
              <span className="mb-1 inline-block rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-semibold text-orange-400">
                {SHOWCASE_SLIDES[activeSlide].deck}
              </span>
              <p className="text-sm font-medium text-white/90">{SHOWCASE_SLIDES[activeSlide].title}</p>
            </div>
            {/* Slide counter */}
            <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">
              {activeSlide + 1} / {SHOWCASE_SLIDES.length}
            </div>
          </div>

          {/* Thumbnail strip */}
          <div className="mt-4 flex justify-center gap-2 overflow-x-auto pb-1">
            {SHOWCASE_SLIDES.map((slide, i) => (
              <button
                key={`${slide.themeSlug}-${slide.slideNumber}-${i}`}
                onClick={() => setActiveSlide(i)}
                className={`flex-shrink-0 overflow-hidden rounded border transition-all ${
                  i === activeSlide
                    ? 'border-orange-500 ring-1 ring-orange-500/30'
                    : 'border-white/10 opacity-40 hover:opacity-70'
                }`}
                style={{ width: 80, aspectRatio: '16/9' }}
              >
                <img
                  src={`/exports/showcase/${slide.themeSlug}/${slide.slideNumber}/preview`}
                  alt={slide.title}
                  className="h-full w-full object-contain bg-black"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer — Lovable-style elevated panel ────────────── */}
      <footer className="bg-card py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <PeachLogo className="h-5 w-5" />
            <span className="font-semibold text-foreground">{t('common.app_name')}</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/gallery" className="transition-colors hover:text-foreground">{t('landing.footer.gallery')}</Link>
            <Link to="/docs" className="transition-colors hover:text-foreground">{t('landing.footer.docs')}</Link>
            <Link to="/login" className="transition-colors hover:text-foreground">{t('landing.footer.log_in')}</Link>
            <Link to="/register" className="transition-colors hover:text-foreground">{t('landing.footer.sign_up')}</Link>
          </div>
          <p className="text-sm text-muted-foreground/70">
            {t('landing.footer.tagline')}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
