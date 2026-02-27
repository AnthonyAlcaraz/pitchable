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


// ── Showcase Slides (all slides from 8 themes, interleaved) ─────────────────
const SHOWCASE_SLIDES = [
  // McKinsey Executive (white bg, navy/blue, Georgia serif)
  { id: '5797312e-b95a-4a56-acf0-d819f0cc7e72', title: 'Scaling AI from experimentation to enterprise value', deck: 'McKinsey Executive' },
  { id: 'e2662e95-3d34-4087-b182-155de4abefdb', title: 'Fewer than 11% of Fortune 500 firms back AI spending', deck: 'McKinsey Executive' },
  { id: '0c3c8087-02b3-4a48-94f2-779233400218', title: 'Three systemic barriers prevent scaling AI', deck: 'McKinsey Executive' },
  { id: '00b5891b-35b0-441e-b311-f19ee8b44b0f', title: 'AI adoption stalls without leadership mandate', deck: 'McKinsey Executive' },
  { id: 'cdceb4ba-3258-4bd0-bd94-4c1033a6de4c', title: 'Targeted resolution closes the performance gap', deck: 'McKinsey Executive' },
  { id: '1c7525b0-c0f8-4735-a6c3-781043886ac3', title: 'Unified orchestration layer', deck: 'McKinsey Executive' },
  { id: '92e07318-4a88-47b8-bccc-07b1917fb202', title: 'SoftBank 90% efficiency gains', deck: 'McKinsey Executive' },
  { id: 'b40d31ec-f86f-4250-8d60-5b8d633fa853', title: 'Amazon and J.P. Morgan prove CEO-led AI mandates', deck: 'McKinsey Executive' },
  { id: 'a496b034-ce4b-4a6f-a5bf-20ba60009ba5', title: 'Four-phase orchestration path', deck: 'McKinsey Executive' },
  { id: 'cb2fad49-1e7c-4d1b-abd4-d94436192491', title: 'Winners embrace orchestration', deck: 'McKinsey Executive' },
  { id: 'e52a20bc-5b49-4dbc-94a7-fd0414c511a9', title: 'Three actions this quarter', deck: 'McKinsey Executive' },
  // Pitchable Dark (deep slate, blue/cyan accents)
  { id: '13b31193-02dd-4e66-a187-52fe8eeccf01', title: 'The Enterprise Intelligence Layer', deck: 'Pitchable Dark' },
  { id: 'dffc4a08-b2bc-4790-9f2f-f6cbefb052a0', title: 'Enterprise Reality Defeats Magical Thinking', deck: 'Pitchable Dark' },
  { id: 'e4a0b577-ccef-47a8-bd27-a7af4f790c68', title: 'More Agents, More Chaos', deck: 'Pitchable Dark' },
  { id: '6347fa79-4884-4742-810b-9529b29d73a6', title: 'The Orchestration Layer', deck: 'Pitchable Dark' },
  { id: '5bf53ee0-6518-4d15-bd41-ff516fd0f5d6', title: 'One Architecture, Zero Silos', deck: 'Pitchable Dark' },
  { id: '4a5cb839-c7e4-48c3-9f74-9f391caa81d8', title: 'SoftBank: 250K Hours Reclaimed', deck: 'Pitchable Dark' },
  { id: '29854c29-0e05-4488-9844-4d0a23de3b7d', title: 'Graphs Beat Flat Storage Everywhere', deck: 'Pitchable Dark' },
  { id: '9b43471f-640b-4072-adfc-fa3c249acd82', title: 'Four-Phase Deployment Roadmap', deck: 'Pitchable Dark' },
  { id: '65c24863-5a66-431d-8a04-4f1b39edf462', title: 'Series B: Triple Enterprise Scale', deck: 'Pitchable Dark' },
  { id: '0fa6a223-4ab9-4cce-8887-f197e8ce978c', title: 'Build the Intelligence Layer', deck: 'Pitchable Dark' },
  // Apple Keynote (black bg, white/blue accents)
  { id: '3b97335a-db2c-45bd-9e52-2ce94a641a8f', title: 'Winning the Nordic AI Boom', deck: 'Apple Keynote' },
  { id: 'df596fdc-ce53-434f-ae3c-5b8f907f423e', title: 'Nordic AI Ignites Cloud Demand', deck: 'Apple Keynote' },
  { id: '3455a164-e929-40ff-8a4d-c6ab5485e673', title: 'Pipeline Surge: $46M Booked', deck: 'Apple Keynote' },
  { id: 'e974273e-4ca7-448e-8dd1-debd44bfb515', title: '$88M Lost — Execution Failures', deck: 'Apple Keynote' },
  { id: '72304a28-f025-4fe8-8329-6f43113db97c', title: 'Three competitive gaps cost $25M+', deck: 'Apple Keynote' },
  { id: '77e2ec75-2908-4f69-8dbd-dc02d3d15728', title: 'Recapture AI Workloads', deck: 'Apple Keynote' },
  { id: '9c937dbb-a9aa-4c51-baa5-46a7151fdbdc', title: 'Voice AI & World Models: $200M+ Pipeline', deck: 'Apple Keynote' },
  { id: 'ad6a970f-6e78-4ec1-91ee-3b75294fab35', title: 'Canonical resource abstractions', deck: 'Apple Keynote' },
  { id: '25bbb5d7-ed9d-4c8a-a52a-06ab67ae57a4', title: '90-Day $15M Recapture Plan', deck: 'Apple Keynote' },
  { id: 'a8abc15a-4adf-4b67-a2a2-95d4cd3656d3', title: 'Three decisions needed this week', deck: 'Apple Keynote' },
  // Sequoia Capital (white bg, forest green)
  { id: '94fb540e-13c7-4668-a233-8a4c3bba97e1', title: 'Enterprise Code Intelligence at Scale', deck: 'Sequoia Capital' },
  { id: 'ab655349-4d28-45fc-a8ef-c0d5ba346030', title: 'Fragmented code context consumes 68% of dev time', deck: 'Sequoia Capital' },
  { id: '4f3e014c-b55f-44b5-96ff-7b611bbf9f59', title: 'AI agents cost $8.2M annually in rework', deck: 'Sequoia Capital' },
  { id: '07a65ef9-c150-46e7-b778-b398ed9ac58c', title: 'Three-Graph Architecture', deck: 'Sequoia Capital' },
  { id: '6e57aa89-8513-4898-a89e-f11428bd8141', title: 'Four integrated capabilities', deck: 'Sequoia Capital' },
  { id: 'cde8d071-23bc-42ee-a1db-dcd1aed3c1b4', title: '16% higher relevancy, 250K hours saved', deck: 'Sequoia Capital' },
  { id: '979865bd-ea43-4208-8398-9e715f001954', title: '$12B market growing at 34% CAGR', deck: 'Sequoia Capital' },
  { id: '809bf02c-1ea7-4a54-8df2-5b7a6130a34b', title: 'Deploy in under 6 weeks', deck: 'Sequoia Capital' },
  { id: '936dbe66-30d3-4c51-b6f0-0fddfdecd046', title: 'Product-market fit and capital efficiency', deck: 'Sequoia Capital' },
  { id: 'a45b8f13-77d0-44f7-a0f8-c26654330bc4', title: '$15M ARR by Q4 2026', deck: 'Sequoia Capital' },
  { id: '4920cf54-aa42-4492-8071-8888bda700d6', title: 'Raising $18M Series A', deck: 'Sequoia Capital' },
  // Airbnb Storytelling (white bg, warm coral)
  { id: '4aed3aa9-eb43-4ac6-9d76-9d3ee2778470', title: 'Future of Remote Work Culture', deck: 'Airbnb Storytelling' },
  { id: '8a1fde86-33b3-406a-a927-d9d86c06cfcc', title: 'Distributed workforces grew 280%', deck: 'Airbnb Storytelling' },
  { id: '15402c43-afea-4cc0-85e5-aa3ecb3e1b78', title: '$8.8M annual productivity loss', deck: 'Airbnb Storytelling' },
  { id: '359f09be-80ef-48ef-9a35-fb864cc503fd', title: 'Growth without community is fragmentation', deck: 'Airbnb Storytelling' },
  { id: 'fa1e4daa-da80-472b-81cb-046d617dc4cd', title: 'The Moment Everything Clicked', deck: 'Airbnb Storytelling' },
  { id: '3596a5fd-38e5-4535-af93-3acf69b832f3', title: 'Agnostic orchestration layer', deck: 'Airbnb Storytelling' },
  { id: '6460308f-228b-41de-8ea8-940fd832b535', title: 'SoftBank 1,000 sellers: 90% higher efficiency', deck: 'Airbnb Storytelling' },
  { id: '026930ff-83dd-4991-ad56-e9a2228791c4', title: 'Build vs. Buy trade-offs', deck: 'Airbnb Storytelling' },
  { id: '37b4e87a-c33f-456f-98db-ff9f57efeea2', title: 'Four-phase rollout', deck: 'Airbnb Storytelling' },
  { id: '41cbbbfe-ce73-49b6-be2a-6222ee46e3a4', title: 'Close the $8.8M Gap in 12 Months', deck: 'Airbnb Storytelling' },
  { id: '481e4057-cdc1-4edd-904b-cc28fe5afe39', title: 'Three decisions this quarter', deck: 'Airbnb Storytelling' },
  // Stripe Fintech (dark purple-black, purple accents)
  { id: '26d3e5aa-3b96-4d45-81dd-96543bd8fb47', title: 'Global Fintech Expansion Strategy', deck: 'Stripe Fintech' },
  { id: '41f856f2-e524-4b9b-a628-836f5a1016fd', title: 'Digital Payments Hit $14.8T', deck: 'Stripe Fintech' },
  { id: '3e0793f2-1702-473c-9152-a82193fcc8e6', title: 'Four Threats to Payment Architecture', deck: 'Stripe Fintech' },
  { id: '8a50e2d4-dd1f-48ea-9d79-ba4c5352ccfc', title: 'The $420M Cost of Inaction', deck: 'Stripe Fintech' },
  { id: '774ba974-df99-45d3-9159-c24176cebc9e', title: 'Three Pillars to $640M Revenue', deck: 'Stripe Fintech' },
  { id: '94349964-746a-4536-aa84-85eba3e28321', title: 'Smart Routing Pilot Results', deck: 'Stripe Fintech' },
  { id: 'b95e3291-5e5c-4ab4-8aca-289578fb202f', title: 'APAC & LATAM: Fastest-Growing Corridors', deck: 'Stripe Fintech' },
  { id: '63cfeb06-9361-4a5d-9a36-d6ecc83196e3', title: 'Embedded Finance APIs: 3.2x Lifetime Value', deck: 'Stripe Fintech' },
  { id: '2f6dab23-0df8-417d-a360-048c20b7d4ff', title: 'Build, Launch, Open, Scale', deck: 'Stripe Fintech' },
  { id: '0c818913-ad3b-4ddf-add2-8d0da2ec6170', title: '$185M Investment, 3.5x ROI', deck: 'Stripe Fintech' },
  { id: '034b8051-ec70-471e-8b53-a35ea0c176c0', title: 'Critical Path to Q3 2026 Revenue', deck: 'Stripe Fintech' },
  { id: '02907509-3099-45bf-afa7-7d6b9bfab016', title: 'Green-Light Phase 1 Investment', deck: 'Stripe Fintech' },
  // YC Startup (white bg, orange accents)
  { id: 'fc99770c-a1dc-4754-b9ac-5c14326c33d7', title: 'AI-Powered Customer Analytics', deck: 'YC Startup' },
  { id: '3d3914e1-4c02-4b52-8322-5c518884b088', title: 'Enterprise AI spending accelerates', deck: 'YC Startup' },
  { id: '81f9c9db-9554-49ac-9637-a791d011e3be', title: 'Three gaps cost $8.2M annually', deck: 'YC Startup' },
  { id: '3fd65c8d-31be-481d-b382-67e90838f6bf', title: 'Turning Complexity into Clarity', deck: 'YC Startup' },
  { id: '271fcf8d-20e2-4d59-a267-475a78af0704', title: '15-20% CLV uplift in two quarters', deck: 'YC Startup' },
  { id: 'd62a4767-76dc-43d5-ac42-db52a9d7708c', title: '23% revenue uplift, 40% faster insights', deck: 'YC Startup' },
  { id: 'cae0deff-bc6c-4c69-a4c9-a02a160d0b06', title: 'Predictive analytics closes every gap', deck: 'YC Startup' },
  { id: '865ac6cb-473f-457b-9688-3c665b410208', title: 'Platform capabilities with outcomes', deck: 'YC Startup' },
  { id: '42faf7f4-1990-4cda-b92d-6268c7bef45f', title: '90-day implementation', deck: 'YC Startup' },
  { id: '4b0f174b-1f6a-4d99-97c3-b15c46aa3160', title: '4.1x ROI in 12 Months', deck: 'YC Startup' },
  { id: 'f295ee98-a112-472c-ba26-aa83d61687ff', title: 'Three steps this quarter', deck: 'YC Startup' },
  // Corporate Blue (white bg, blue/gold)
  { id: '251aa36a-b414-43ed-a487-5ca685724bf8', title: 'Enterprise Cloud Migration Strategy', deck: 'Corporate Blue' },
  { id: 'bb1d266e-25e4-46be-86cf-b9dd93537529', title: '$46-55M annual cloud spend per account', deck: 'Corporate Blue' },
  { id: '8c9a25ec-f443-4813-bf8f-285501eb7521', title: 'Speed, pricing, and reliability gaps', deck: 'Corporate Blue' },
  { id: '05f31cfc-5e12-47ce-ad05-2e71af42cbb8', title: 'Recapture $30M+ in at-risk revenue', deck: 'Corporate Blue' },
  { id: '9c77c3d6-b8c5-4461-93af-7474f05f8713', title: 'Marketplace cuts friction by 60%', deck: 'Corporate Blue' },
  { id: 'c8cdb129-00f3-483c-9393-5fae4da4e942', title: 'Graph-based storage migration', deck: 'Corporate Blue' },
  { id: '5ace2d65-5f34-4bf6-a3ed-cfd776db1dcf', title: 'Three actions to win Q2 pipeline', deck: 'Corporate Blue' },
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
              8 professional themes from McKinsey to YC — each with AI imagery, action titles, and consulting frameworks.
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
              key={SHOWCASE_SLIDES[activeSlide].id}
              src={`/slides/${SHOWCASE_SLIDES[activeSlide].id}/preview`}
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
                key={slide.id}
                onClick={() => setActiveSlide(i)}
                className={`flex-shrink-0 overflow-hidden rounded border transition-all ${
                  i === activeSlide
                    ? 'border-orange-500 ring-1 ring-orange-500/30'
                    : 'border-white/10 opacity-40 hover:opacity-70'
                }`}
                style={{ width: 80, aspectRatio: '16/9' }}
              >
                <img
                  src={`/slides/${slide.id}/preview`}
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
