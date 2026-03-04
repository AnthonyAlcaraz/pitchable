#!/usr/bin/env node
/**
 * Seed gallery presentations into the database.
 *
 * Creates 16 presentations (one per theme) with all 67 slide types each.
 * Each presentation is marked isPublic=true so it appears in the gallery.
 *
 * Content sets: A (Tech/SaaS), B (Strategy/Consulting), C (Creative/Consumer), D (Innovation/Research)
 *
 * Usage:
 *   cd apps/api && node scripts/seed-gallery.mjs
 *
 * Prerequisites:
 *   - DATABASE_URL set in .env
 *   - API server running on port 3000 (for preview generation)
 *   - npx prisma generate has been run
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  EXTRA_CONTENT_A,
  EXTRA_CONTENT_B,
  EXTRA_CONTENT_C,
  EXTRA_CONTENT_D,
} from './extra-showcase-content.mjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── Gallery Owner ─────────────────────────────────────────────
const GALLERY_EMAIL = 'gallery@pitchable.ai';
const GALLERY_NAME = 'Pitchable Gallery';

// ── Theme → Content Set Mapping ───────────────────────────────
const THEME_CONTENT_SET = {
  'pitchable-dark': 'A',
  'technical-teal': 'A',
  'stripe-fintech': 'A',
  'z4-dark-premium': 'A',
  'mckinsey-executive': 'B',
  'bcg-strategy': 'B',
  'sequoia-capital': 'B',
  'corporate-blue': 'B',
  'creative-warm': 'C',
  'airbnb-story': 'C',
  'ted-talk': 'C',
  'apple-keynote': 'C',
  'dark-professional': 'D',
  'light-minimal': 'D',
  'yc-startup': 'D',
  'academic-research': 'D',
};

// ── Presentation Titles per Content Set ───────────────────────
const PRESENTATION_TITLES = {
  A: 'DevOps Platform — Investor Pitch',
  B: 'Strategic Transformation — Executive Brief',
  C: 'Creator Economy — Growth Story',
  D: 'AI Research Platform — Technical Overview',
};

const PRESENTATION_TYPES = {
  A: 'TECHNICAL',
  B: 'EXECUTIVE',
  C: 'STANDARD',
  D: 'ACADEMIC',
};

// ── Existing 29 slide type content (from generate-showcase.mjs) ──

const CONTENT_A = {
  PROBLEM: {
    title: 'The Developer Productivity Crisis',
    body: '1. Engineering teams waste 37% of time on manual deployments and configuration management\n2. Production incidents cost an average of $14,000 per minute with mean resolution time of 47 minutes\n3. Cloud infrastructure spend grows 40% annually while utilization remains below 35%\n4. Developer onboarding takes 3-4 months due to fragmented toolchains and tribal knowledge',
  },
  METRICS_HIGHLIGHT: {
    title: '99.97% Platform Uptime',
    body: '99.97%: Platform Uptime\n$4.2M: Annual Cost Savings\n340%: Developer Productivity Gain\n< 50ms: Average API Response Time',
  },
  COMPARISON: {
    title: 'Legacy DevOps vs Platform Engineering',
    body: 'Legacy DevOps vs Platform Engineering\n\nLegacy DevOps:\n- Manual CI/CD pipelines requiring 40+ hours weekly maintenance\n- Error rates averaging 12% per deployment cycle\n- Limited visibility into infrastructure costs and performance\n\nPlatform Engineering:\n- Automated golden paths completing deployments in minutes\n- 99.7% deployment success rate with AI validation\n- Real-time cost dashboards and performance alerts',
  },
  TIMELINE: {
    title: 'Product Roadmap 2025',
    body: 'Q1 2025: Foundation Phase - Core platform launch with CI/CD orchestration and beta testing\nQ2 2025: Scale Phase - Enterprise SSO, API marketplace, and SOC 2 Type II certification\nQ3 2025: Expansion Phase - International regions, partner integrations, and Series A\nQ4 2025: Acceleration Phase - AI copilot for deployments and advanced cost analytics',
  },
  FEATURE_GRID: {
    title: 'Developer Platform Capabilities',
    body: 'Intelligent Automation: Reduce manual deployment tasks by 80% with AI-powered workflow engines\nReal-Time Analytics: Monitor KPIs with sub-second dashboards and predictive performance alerts\nEnterprise Security: SOC2 Type II certified with end-to-end encryption and audit logging\nSeamless Integration: Connect 200+ tools via native connectors and open APIs',
  },
  PROCESS: {
    title: 'Platform Adoption Framework',
    body: '1. Discovery: Assess current DevOps workflows and identify deployment bottlenecks\n2. Design: Architect golden paths with stakeholder alignment and migration plan\n3. Build: Develop platform abstractions with continuous feedback from early adopters\n4. Deploy: Staged rollout across teams with monitoring and performance baselines\n5. Optimize: Measure developer velocity metrics and iterate on platform capabilities',
  },
  MARKET_SIZING: {
    title: 'Developer Tools Market',
    body: 'Total Addressable Market (TAM): $48B global developer tools market growing 23% CAGR\nServiceable Addressable Market (SAM): $12B enterprise DevOps and platform engineering\nServiceable Obtainable Market (SOM): $800M mid-market companies with 50-500 developers\nCurrent penetration: 2.1% of SOM with clear path to 15% by 2027\nCompetitive advantage: Only platform combining CI/CD, observability, and cost management',
  },
  QUOTE: {
    title: 'Industry Perspective',
    body: 'The companies that will win the next decade are not the ones with the most data - they are the ones that can ship code fastest. Developer velocity is the ultimate competitive moat in software.\n\n- Alex Thornton, CEO of Nexus Technologies',
  },
  ARCHITECTURE: {
    title: 'Cloud-Native Platform Architecture',
    body: 'Presentation Layer: React dashboard, CLI tools, API gateway with rate limiting and OAuth\nApplication Layer: Microservices mesh, event-driven processors, ML inference engine\nData Layer: PostgreSQL, Redis cache, vector database, real-time event streaming\nInfrastructure Layer: Kubernetes orchestration, multi-region CDN, auto-scaling compute',
  },
  TEAM: {
    title: 'Leadership Team',
    body: 'Alex Thornton - CEO & Co-Founder\nMaya Rodriguez - CTO & Co-Founder\nDr. James Liu - VP of AI Research\nRachel Okonkwo - VP of Engineering\nStefan Petrov - Head of Product\nKira Nakamura - Head of Growth',
  },
  CTA: {
    title: 'Start Building Today',
    body: '-> Schedule a personalized platform demo with our solutions engineering team\n-> Start your 14-day free trial with full enterprise features enabled\n-> Download our developer productivity ROI calculator',
  },
  SOLUTION: {
    title: 'Intelligent Developer Platform',
    body: '1. Automated Pipeline Orchestration: Eliminate manual deployment steps with intelligent CI/CD that adapts to your codebase complexity\n2. Predictive Performance Monitoring: Detect anomalies before they impact users using ML-powered observability across all services\n3. Unified Cost Intelligence: Track cloud spend across providers with actionable optimization recommendations saving 30%+ monthly\n4. Collaborative Development Environment: Real-time pair programming with AI-assisted code review and automated testing pipelines',
  },
  HOOK: {
    title: 'The $4.7 Trillion Cloud Waste Problem',
    body: 'What if your engineering team could reclaim 37% of lost productivity overnight?',
  },
  MATRIX_2X2: {
    title: 'DevOps Investment Priority Matrix',
    body: 'X-Axis: Implementation Speed\nY-Axis: Developer Velocity Impact\nQuick Wins: High velocity, fast implementation — CI/CD automation, golden paths, self-service portals\nStrategic Bets: High velocity, slow implementation — platform engineering, AI copilots, observability mesh\nLow Hanging Fruit: Low velocity, fast — documentation updates, minor CLI improvements\nAvoid: Low velocity, slow — legacy migration, manual runbooks',
  },
  WATERFALL: {
    title: 'ARR Bridge Q3 to Q4',
    body: 'Starting ARR: $8.4M\nNew Logos: +$2.8M\nExpansion: +$1.9M\nContraction: -$0.6M\nChurn: -$1.2M\nEnding ARR: $11.3M',
  },
  FUNNEL: {
    title: 'Developer Acquisition Funnel',
    body: 'GitHub Stars: 24,000 (100%)\nDocs Visitors: 8,400 (35%)\nFree Tier Sign-ups: 2,100 (8.75%)\nPaid Conversions: 420 (1.75%)\nEnterprise Deals: 21 (0.088%)',
  },
  COMPETITIVE_MATRIX: {
    title: 'Platform Comparison',
    body: '| Feature | Us | Vercel | Heroku | Render |\n|---|---|---|---|---|\n| Auto-Scaling | \u2713 | \u2713 | \u2717 | \u2713 |\n| Cost Analytics | \u2713 | \u2717 | \u2717 | \u2717 |\n| AI Copilot | \u2713 | \u2717 | \u2717 | \u2717 |\n| Multi-Cloud | \u2713 | \u2717 | \u2717 | \u2713 |\n| SOC 2 Type II | \u2713 | \u2713 | \u2713 | \u2717 |',
  },
  ROADMAP: {
    title: 'Platform Roadmap 2026',
    body: 'Now: Kubernetes orchestration v2, AI deployment copilot, Cost optimization engine, Enterprise SSO\nNext: Multi-cloud abstraction, Partner marketplace, Custom golden paths, Compliance automation\nLater: Autonomous incident response, Predictive scaling, White-label platform, Edge compute',
  },
  PRICING_TABLE: {
    title: 'Developer-Friendly Pricing',
    body: 'Starter: $0/mo\n- 3 environments\n- 10 deployments/day\n- Community support\nTeam: $49/seat/mo (Recommended)\n- Unlimited environments\n- Unlimited deployments\n- AI copilot\n- SOC 2 compliance\nEnterprise: Custom\n- Everything in Team\n- Multi-cloud\n- Dedicated support\n- Custom SLAs',
  },
  UNIT_ECONOMICS: {
    title: 'Unit Economics at Scale',
    body: 'LTV:CAC = 5.1x\nCAC: $2,400 | LTV: $12,240 | Payback: 6 months | Gross Margin: 78% | Net Revenue Retention: 132%',
  },
  SWOT: {
    title: 'Platform Strategic Assessment',
    body: 'Strengths: AI-powered deployment copilot, 78% gross margins, 132% NRR, SOC 2 certified\nWeaknesses: Early enterprise traction, Single-cloud focus, Small sales team\nOpportunities: Multi-cloud expansion, $48B TAM growth, Platform engineering wave, AI ops market\nThreats: Hyperscaler native tools, Open-source alternatives, Economic slowdown, Talent competition',
  },
  THREE_PILLARS: {
    title: 'The Platform Engineering Advantage',
    body: 'Velocity: Ship 10x faster with golden paths that eliminate configuration drift and manual deployment steps\nReliability: Achieve 99.97% uptime with AI-powered incident detection and automated rollback capabilities\nEfficiency: Reduce cloud spend by 40% with intelligent resource optimization and cost anomaly alerts\n\n### Three pillars that transform developer experience',
  },
  BEFORE_AFTER: {
    title: 'The DevOps Transformation',
    body: 'Before: 40+ hours weekly pipeline maintenance, 12% deployment failure rate, 47-minute MTTR, fragmented toolchain\nAfter: Zero-touch deployments, 99.7% success rate, 3-minute MTTR, unified platform experience',
  },
  SOCIAL_PROOF: {
    title: 'Trusted by Engineering Teams',
    body: '4.8/5 average rating from 1,200+ engineering teams\nFeatured in InfoWorld, The New Stack, DevOps Weekly\nUsed by platform teams at Stripe, Shopify, Datadog, Linear, Vercel',
  },
  OBJECTION_HANDLER: {
    title: 'Addressing Platform Skeptics',
    body: '"Platform engineering is just DevOps renamed"\nPlatform engineering shifts from per-team CI/CD pipelines to self-service golden paths. Teams using our platform deploy **10x faster** with **80% fewer incidents**. The difference: developers never touch infrastructure directly.',
  },
  FAQ: {
    title: 'Frequently Asked Questions',
    body: 'Q: How long does migration take?\nA: Typical migration completes in 2-4 weeks with zero downtime using our automated migration toolkit\nQ: Does it work with our existing CI/CD?\nA: Yes — native integrations with GitHub Actions, GitLab CI, Jenkins, and CircleCI\nQ: What about compliance requirements?\nA: SOC 2 Type II certified with HIPAA and GDPR compliance modules available',
  },
  VERDICT: {
    title: 'Technical Advisory Recommendation',
    body: 'Approve: Proceed with Platform Adoption\nThe evaluation confirms **10x deployment velocity** improvement with **6-month** payback period. Infrastructure costs reduced by **40%** with projected annual savings of **$4.2M**. Engineering team capacity freed for product development.',
  },
  COHORT_TABLE: {
    title: 'Customer Retention by Cohort',
    body: '| Cohort | Month 1 | Month 3 | Month 6 | Month 12 | Month 18 |\n|---|---|---|---|---|---|\n| Q1 2025 | 100% | 89% | 78% | 64% | 58% |\n| Q2 2025 | 100% | 91% | 82% | 68% | \u2014 |\n| Q3 2025 | 100% | 93% | 85% | \u2014 | \u2014 |\n| Q4 2025 | 100% | 94% | \u2014 | \u2014 | \u2014 |',
  },
  PROGRESS_TRACKER: {
    title: 'Platform Migration Status',
    body: 'CI/CD Pipeline Migration: 92%\nInfrastructure as Code: 78%\nObservability Setup: 85%\nSecurity Compliance: 95%\nTeam Onboarding: 60%',
  },
};

const CONTENT_B = {
  PROBLEM: {
    title: 'Margin Erosion in Core Business Units',
    body: '1. Operating margins declined 340 basis points over 24 months across three core business units\n2. Customer acquisition costs increased 67% while lifetime value remained flat at $18,400\n3. Legacy ERP systems require $23M annual maintenance with 14-hour mean time to resolution\n4. Competitor digital offerings captured 22% of addressable market in just 18 months',
  },
  METRICS_HIGHLIGHT: {
    title: '$2.1B Revenue Opportunity Identified',
    body: '$2.1B: Revenue Opportunity Identified\n340bps: Margin Improvement Potential\n$890M: Addressable Cost Reduction\n18mo: Time to Full Value Realization',
  },
  COMPARISON: {
    title: 'Current Operating Model vs Target State',
    body: 'Current Operating Model vs Target State\n\nCurrent Operating Model:\n- Siloed business units with 40+ redundant processes across functions\n- Decision cycles averaging 6-8 weeks for cross-functional initiatives\n- Manual reporting consuming 15,000 analyst hours annually\n\nTarget State:\n- Integrated platform with shared services reducing overhead by 35%\n- Data-driven decisions in 48 hours with automated insight generation\n- Real-time executive dashboards replacing 80% of manual reporting',
  },
  TIMELINE: {
    title: 'Transformation Roadmap',
    body: 'Phase 1 (Months 1-4): Diagnostic and quick wins delivering $120M in immediate savings\nPhase 2 (Months 5-9): Operating model redesign with pilot programs across two regions\nPhase 3 (Months 10-14): Full-scale implementation with change management and training\nPhase 4 (Months 15-18): Performance stabilization, continuous improvement, and scale',
  },
  FEATURE_GRID: {
    title: 'Strategic Value Levers',
    body: 'Revenue Acceleration: Identify $800M in cross-sell opportunities through customer analytics\nOperational Excellence: Reduce process cycle times by 60% via intelligent automation\nDigital Transformation: Modernize core systems with cloud-native architecture\nTalent Optimization: Upskill 4,000 employees with AI-augmented decision support tools',
  },
  PROCESS: {
    title: 'Due Diligence Framework',
    body: '1. Market Assessment: Evaluate competitive landscape, regulatory environment, and growth vectors\n2. Financial Analysis: Model revenue synergies, cost structures, and integration economics\n3. Operational Review: Audit processes, technology stack, and organizational capabilities\n4. Risk Evaluation: Quantify execution risks, regulatory exposure, and cultural alignment\n5. Integration Planning: Design Day 1 readiness plan with 100-day milestones and KPIs',
  },
  MARKET_SIZING: {
    title: 'Addressable Market Opportunity',
    body: 'Total Addressable Market (TAM): $320B global management consulting and advisory services\nServiceable Addressable Market (SAM): $85B digital transformation and operational improvement\nServiceable Obtainable Market (SOM): $4.2B Fortune 500 companies seeking integrated advisory\nCurrent penetration: 3.8% of SOM with expanding engagement across 12 industry verticals\nCompetitive advantage: Proprietary AI diagnostic tools reducing time-to-insight by 70%',
  },
  QUOTE: {
    title: 'Executive Perspective',
    body: 'Transformation is not a technology project - it is a fundamental rewiring of how an organization creates value. The winners will be those who move decisively while competitors are still debating the business case.\n\n- Margaret Hartwell, CEO of Meridian Industries',
  },
  ARCHITECTURE: {
    title: 'Target Operating Model',
    body: 'Client Interface: Digital engagement platform, self-service analytics, executive dashboards\nCapability Layer: Shared service centers, centers of excellence, agile delivery pods\nData Foundation: Enterprise data lake, ML model registry, governance and lineage\nInfrastructure: Hybrid cloud deployment, zero-trust security, disaster recovery',
  },
  TEAM: {
    title: 'Advisory Board',
    body: 'Margaret Hartwell - Board Chair, Former CEO Meridian Industries\nDr. Robert Asante - Senior Partner, Digital Transformation\nLinda Vasquez - Managing Director, Operations Practice\nThomas Brennan - Partner, Financial Services\nDr. Aisha Patel - Chief Data Scientist\nMichael Johansson - Partner, Change Management',
  },
  CTA: {
    title: 'Accelerate Your Transformation',
    body: '-> Request a confidential diagnostic assessment with our senior partners\n-> Access our proprietary benchmarking database across 40 industries\n-> Schedule an executive briefing on digital transformation best practices',
  },
  SOLUTION: {
    title: 'Value Creation Engine',
    body: '1. AI-Powered Diagnostics: Identify value creation opportunities in weeks instead of months using proprietary analytical frameworks\n2. Digital Operating Model: Design and implement next-generation shared services that reduce overhead by 35% within 18 months\n3. Revenue Growth Analytics: Unlock cross-sell and upsell opportunities through advanced customer segmentation and propensity modeling\n4. Change Acceleration: Drive adoption at scale with behavioral science-based change management and digital learning platforms',
  },
  HOOK: {
    title: 'The $890M Cost Reduction Opportunity',
    body: 'What if your organization could identify margin erosion before it hits the P&L?',
  },
  MATRIX_2X2: {
    title: 'Strategic Initiative Prioritization',
    body: 'X-Axis: Execution Complexity\nY-Axis: Value Creation Potential\nQuick Wins: High value, low complexity \u2014 procurement optimization, shared services, process automation\nStrategic Bets: High value, high complexity \u2014 digital transformation, M&A integration, operating model redesign\nLow Hanging Fruit: Low value, low complexity \u2014 policy updates, reporting consolidation\nAvoid: Low value, high complexity \u2014 legacy system patches, organizational restructuring without clear ROI',
  },
  WATERFALL: {
    title: 'EBITDA Bridge FY25 to FY26',
    body: 'Starting EBITDA: $340M\nRevenue Growth: +$120M\nCost Synergies: +$85M\nInvestment Spend: -$45M\nInflation Impact: -$28M\nEnding EBITDA: $472M',
  },
  FUNNEL: {
    title: 'Deal Pipeline Progression',
    body: 'Prospect Universe: 2,400 companies (100%)\nQualified Targets: 480 (20%)\nDue Diligence: 96 (4%)\nLetter of Intent: 24 (1%)\nClosed Deals: 6 (0.25%)',
  },
  COMPETITIVE_MATRIX: {
    title: 'Advisory Capability Comparison',
    body: '| Capability | Us | McKinsey | BCG | Bain |\n|---|---|---|---|---|\n| AI Diagnostics | \u2713 | \u2717 | \u2713 | \u2717 |\n| Real-time Dashboards | \u2713 | \u2717 | \u2717 | \u2717 |\n| Industry Benchmarks | \u2713 | \u2713 | \u2713 | \u2713 |\n| Change Management | \u2713 | \u2713 | \u2717 | \u2713 |\n| Implementation Support | \u2713 | \u2717 | \u2713 | \u2717 |',
  },
  ROADMAP: {
    title: 'Transformation Roadmap',
    body: 'Now: Diagnostic assessment, Quick wins identification, Governance setup, Baseline KPIs\nNext: Operating model redesign, Pilot programs, Change management rollout, Talent development\nLater: Full-scale implementation, Continuous improvement, Performance stabilization, Value tracking',
  },
  PRICING_TABLE: {
    title: 'Engagement Models',
    body: 'Diagnostic: $250K\n- 4-week assessment\n- Executive readout\n- Quick wins roadmap\nTransformation: $1.2M+ (Recommended)\n- 12-18 month engagement\n- Dedicated team\n- Implementation support\n- Value guarantee\nAdvisory Retainer: Custom\n- Ongoing strategic counsel\n- Board-level access\n- Quarterly reviews\n- Priority response',
  },
  UNIT_ECONOMICS: {
    title: 'Client Value Economics',
    body: 'ROI:Fee = 8.4x\nAvg Engagement: $1.8M | Client Value Created: $15.1M | Payback: 4.2 months | Margin Improvement: 340bps | Client Retention: 87%',
  },
  SWOT: {
    title: 'Practice Strategic Assessment',
    body: 'Strengths: Proprietary AI diagnostics, Senior partner network, 40-industry benchmark database, Implementation track record\nWeaknesses: Limited digital talent pipeline, Geographic concentration, Premium pricing perception\nOpportunities: AI-augmented advisory, Mid-market expansion, ESG transformation, Cross-border M&A wave\nThreats: In-house strategy teams, Boutique specialists, Fee compression, AI commoditizing analysis',
  },
  THREE_PILLARS: {
    title: 'The Value Creation Framework',
    body: 'Diagnose: AI-powered assessment identifies $890M in addressable cost reduction within 4 weeks of engagement\nDesign: Proprietary operating model templates reduce design phase from 6 months to 6 weeks\nDeliver: Implementation guarantee with value tracking ensures 8.4x ROI on advisory fees\n\n### Three pillars that deliver measurable transformation',
  },
  BEFORE_AFTER: {
    title: 'The Transformation Impact',
    body: 'Before: 6-8 week decision cycles, 40+ redundant processes, 15,000 manual analyst hours, siloed business units\nAfter: 48-hour decisions, unified shared services, 80% automated reporting, integrated operating model',
  },
  SOCIAL_PROOF: {
    title: 'Trusted by Fortune 500 Leadership',
    body: '94% client satisfaction score across 200+ engagements\nNamed Top 10 Transformation Consultancy by Gartner, Forrester, and ALM Vanguard\nTrusted by C-suites at Boeing, JPMorgan, Unilever, Siemens, Novartis',
  },
  OBJECTION_HANDLER: {
    title: 'Addressing Executive Concerns',
    body: '"Consulting engagements rarely deliver promised ROI"\nOur value guarantee ties **30% of fees** to measurable outcomes. Across 200+ engagements, we have delivered an average **8.4x ROI** with **94%** of clients achieving targets within the committed timeline.',
  },
  FAQ: {
    title: 'Engagement Questions',
    body: 'Q: How quickly can you mobilize a team?\nA: Senior partners on-site within 2 weeks with full team deployed by week 4\nQ: Do you guarantee outcomes?\nA: Yes \u2014 30% of fees are tied to achieving agreed KPIs within the transformation timeline\nQ: How do you handle change resistance?\nA: Our behavioral science-based change program achieves 89% adoption rates across organizational levels',
  },
  VERDICT: {
    title: 'Board Recommendation',
    body: 'Approve: Proceed with Strategic Transformation\nDiagnostic confirms **$2.1B** revenue opportunity with **340bps** margin improvement. Risk-adjusted NPV exceeds investment threshold by **3.2x**. Recommend immediate Phase 1 authorization with $45M budget allocation.',
  },
  COHORT_TABLE: {
    title: 'Client Value Realization by Engagement Cohort',
    body: '| Cohort | Q1 | Q2 | Q3 | Q4 | Year 2 |\n|---|---|---|---|---|---|\n| FY23 Clients | 12% | 34% | 67% | 89% | 112% |\n| FY24 Clients | 15% | 41% | 72% | 94% | \u2014 |\n| FY25 Clients | 18% | 45% | 78% | \u2014 | \u2014 |\n| FY26 Clients | 22% | 48% | \u2014 | \u2014 | \u2014 |',
  },
  PROGRESS_TRACKER: {
    title: 'Transformation Progress Dashboard',
    body: 'Operating Model Redesign: 88%\nProcess Automation: 65%\nTalent Upskilling: 45%\nTechnology Migration: 72%\nChange Adoption: 58%',
  },
};

const CONTENT_C = {
  PROBLEM: {
    title: 'The Creator Monetization Gap',
    body: '1. Only 4% of full-time creators earn above the median household income despite 50M+ active creators\n2. Platform algorithm changes caused 62% of creators to lose over 30% of their audience reach in 2024\n3. Brand deal negotiation takes 23 hours per partnership with no standardized pricing transparency\n4. Creator burnout rates hit 71% as content demands outpace sustainable production workflows',
  },
  METRICS_HIGHLIGHT: {
    title: '12.4M Monthly Active Creators',
    body: '12.4M: Monthly Active Creators\n$780M: Creator Earnings Facilitated\n4.7x: Average Revenue Increase per Creator\n92%: Creator Retention Rate',
  },
  COMPARISON: {
    title: 'Traditional Media vs Creator-Led Distribution',
    body: 'Traditional Media vs Creator-Led Distribution\n\nTraditional Media:\n- 18-month production cycles with $500K minimum campaign budgets\n- Audience targeting limited to broad demographic segments\n- Engagement rates averaging 0.3% with declining consumer trust\n\nCreator-Led Distribution:\n- 48-hour content creation with authentic audience connection\n- Hyper-targeted communities built on shared interests and values\n- Engagement rates of 8.2% with 73% higher purchase intent',
  },
  TIMELINE: {
    title: 'Platform Evolution',
    body: '2023: Launch Phase - Creator marketplace with 50K initial creators and direct booking\n2024: Growth Phase - AI content tools, brand matchmaking, and revenue analytics dashboard\n2025: Scale Phase - International expansion to 30 markets with localized creator programs\n2026: Ecosystem Phase - Creator-owned storefronts, subscription bundles, and IP licensing',
  },
  FEATURE_GRID: {
    title: 'Creator Toolkit',
    body: 'Smart Content Studio: AI-assisted editing, thumbnail generation, and multi-platform publishing\nAudience Intelligence: Deep analytics on follower behavior, growth trends, and content performance\nBrand Matchmaker: Automated partnership recommendations based on audience overlap and brand fit\nRevenue Optimizer: Dynamic pricing engine for sponsorships, merchandise, and digital products',
  },
  PROCESS: {
    title: 'Creator Success Journey',
    body: '1. Onboard: Profile creation with portfolio showcase and audience verification\n2. Discover: AI-powered brand matching and collaboration opportunity surfacing\n3. Create: Access production tools, templates, and AI-assisted content workflows\n4. Monetize: Multi-stream revenue setup with automated invoicing and tax reporting\n5. Grow: Community building tools with analytics-driven content strategy recommendations',
  },
  MARKET_SIZING: {
    title: 'Creator Economy Market',
    body: 'Total Addressable Market (TAM): $104B global creator economy spanning content, commerce, and community\nServiceable Addressable Market (SAM): $28B creator monetization tools and marketplace platforms\nServiceable Obtainable Market (SOM): $2.1B mid-tier creators with 10K-1M followers seeking revenue growth\nCurrent penetration: 5.9% of SOM across 12 content verticals and 8 languages\nCompetitive advantage: Only platform combining content tools, brand deals, and direct monetization',
  },
  QUOTE: {
    title: 'Design Philosophy',
    body: 'Great design does not start with pixels - it starts with understanding the moment a person decides to create something and share it with the world. Our job is to remove every obstacle between that impulse and its expression.\n\n- Naomi Sato, Chief Design Officer at Luminary Creative',
  },
  ARCHITECTURE: {
    title: 'Creator Platform Ecosystem',
    body: 'Experience Layer: Progressive web app, native mobile apps, embeddable creator storefronts\nCreator Engine: Content pipeline, recommendation algorithms, social graph, payment processing\nIntelligence Layer: Audience analytics, brand safety scoring, trend prediction, pricing models\nFoundation: Multi-CDN delivery, edge computing, creator data sovereignty, GDPR compliance',
  },
  TEAM: {
    title: 'Creative Leadership',
    body: "Naomi Sato - CEO & Co-Founder\nCarlos Mendez - Chief Product Officer\nJade Williams - VP of Creator Experience\nLiam O'Brien - VP of Engineering\nAmira Hassan - Head of Brand Partnerships\nTyler Jackson - Head of Community",
  },
  CTA: {
    title: 'Join the Creator Revolution',
    body: '-> Apply for early access to our creator-first monetization platform\n-> Book a personalized demo to see your audience growth potential\n-> Download our free Creator Economy Trends 2025 report',
  },
  SOLUTION: {
    title: 'Creator Empowerment Platform',
    body: '1. Intelligent Content Pipeline: Produce platform-optimized content 3x faster with AI editing, auto-captioning, and smart scheduling\n2. Audience Growth Engine: Grow your community with data-driven content recommendations and cross-platform amplification tools\n3. Unified Monetization Hub: Manage sponsorships, subscriptions, merchandise, and digital products from a single revenue dashboard\n4. Creator Wellbeing System: Sustainable content calendars with burnout detection, batch creation tools, and automated engagement',
  },
  HOOK: {
    title: 'Only 4% of Creators Earn a Living Wage',
    body: 'What if every creator had the tools to turn their passion into a sustainable business?',
  },
  MATRIX_2X2: {
    title: 'Content Strategy Priority Matrix',
    body: 'X-Axis: Production Effort\nY-Axis: Audience Growth Impact\nQuick Wins: High growth, low effort \u2014 trending audio remixes, carousel posts, community polls\nStrategic Bets: High growth, high effort \u2014 documentary series, course launches, brand collaborations\nLow Hanging Fruit: Low growth, low effort \u2014 story reposts, comment engagement, quick takes\nAvoid: Low growth, high effort \u2014 overproduced content, vanity metrics campaigns',
  },
  WATERFALL: {
    title: 'Creator Revenue Bridge Q3 to Q4',
    body: 'Starting MRR: $3.2M\nNew Creators: +$1.4M\nBrand Deals: +$2.1M\nSubscription Growth: +$0.8M\nPlatform Churn: -$0.9M\nEnding MRR: $6.6M',
  },
  FUNNEL: {
    title: 'Creator Onboarding Funnel',
    body: 'Landing Page Visitors: 500,000 (100%)\nSign-ups: 75,000 (15%)\nProfile Complete: 30,000 (6%)\nFirst Revenue: 6,000 (1.2%)\nPower Creators: 600 (0.12%)',
  },
  COMPETITIVE_MATRIX: {
    title: 'Creator Platform Comparison',
    body: '| Feature | Us | Patreon | Gumroad | Stan Store |\n|---|---|---|---|---|\n| AI Content Tools | \u2713 | \u2717 | \u2717 | \u2717 |\n| Brand Matching | \u2713 | \u2717 | \u2717 | \u2717 |\n| Multi-Platform | \u2713 | \u2717 | \u2713 | \u2713 |\n| Analytics Suite | \u2713 | \u2713 | \u2717 | \u2717 |\n| Digital Products | \u2713 | \u2713 | \u2713 | \u2713 |',
  },
  ROADMAP: {
    title: 'Platform Evolution 2026',
    body: 'Now: AI content studio, Brand matchmaking v2, Revenue analytics, Multi-platform publishing\nNext: Creator storefronts, Subscription bundles, International expansion, Mobile app\nLater: IP licensing marketplace, Creator-to-creator collaborations, White-label tools, Live commerce',
  },
  PRICING_TABLE: {
    title: 'Creator-First Pricing',
    body: 'Free: $0/mo\n- Basic analytics\n- 3 brand applications/month\n- Community access\nCreator Pro: $19/mo (Recommended)\n- AI content tools\n- Unlimited brand deals\n- Revenue optimizer\n- Priority matching\nBusiness: $79/mo\n- Everything in Pro\n- Team collaboration\n- White-label storefront\n- API access',
  },
  UNIT_ECONOMICS: {
    title: 'Creator Platform Unit Economics',
    body: 'LTV:CAC = 6.8x\nCAC: $18 | LTV: $122 | Payback: 2.1 months | Take Rate: 8% | Net Revenue Retention: 142%',
  },
  SWOT: {
    title: 'Creator Platform Strategic Position',
    body: 'Strengths: AI content tools, 4.7x creator revenue lift, 92% retention rate, Brand matchmaking algorithm\nWeaknesses: No mobile app yet, Limited international presence, Creator support capacity\nOpportunities: $104B creator economy TAM, Brand deal automation, Education vertical, Live commerce wave\nThreats: Platform algorithm changes, Big tech creator programs, Subscription fatigue, Creator burnout trends',
  },
  THREE_PILLARS: {
    title: 'The Creator Advantage',
    body: 'Create: AI-powered content studio that cuts production time by 3x while maintaining authentic voice and style\nMonetize: Unified revenue hub combining sponsorships, subscriptions, and digital products in one dashboard\nGrow: Data-driven audience intelligence that identifies growth opportunities and optimal posting strategies\n\n### Three pillars that transform creators into businesses',
  },
  BEFORE_AFTER: {
    title: 'The Creator Transformation',
    body: 'Before: 23 hours per brand deal, 4% earning a living, 62% audience reach decline, 71% burnout rate\nAfter: 2-hour deal flow, 4.7x revenue increase, algorithm-proof distribution, sustainable content calendar',
  },
  SOCIAL_PROOF: {
    title: 'Loved by Creators Worldwide',
    body: '4.9/5 average rating from 12.4M monthly active creators\nProduct Hunt #1 Product of the Year, Creator Economy Award 2025\nTrusted by top creators across YouTube, TikTok, Instagram, and Twitch',
  },
  OBJECTION_HANDLER: {
    title: 'Addressing Creator Concerns',
    body: '"Another creator tool that takes a cut of my earnings"\nOur 8% take rate is the lowest in the industry, and creators using our platform earn **4.7x more** on average. We only succeed when creators succeed \u2014 our revenue is directly tied to yours.',
  },
  FAQ: {
    title: 'Creator Questions Answered',
    body: 'Q: Will the AI tools change my authentic voice?\nA: Our AI learns your unique style and tone \u2014 it amplifies your voice, never replaces it\nQ: How does brand matching work?\nA: Our algorithm analyzes audience overlap, brand fit, and engagement patterns to surface ideal partnerships\nQ: Can I use this with my existing platforms?\nA: Yes \u2014 native integrations with YouTube, TikTok, Instagram, Twitch, and Substack',
  },
  VERDICT: {
    title: 'Creator Advisory Recommendation',
    body: 'Approve: Scale Creator Platform Investment\nCreator acquisition metrics show **142% NRR** with **6.8x LTV:CAC**. Platform demonstrates clear product-market fit with **92%** retention and **4.7x** creator revenue lift. Recommend Series B raise to accelerate international expansion.',
  },
  COHORT_TABLE: {
    title: 'Creator Revenue Growth by Cohort',
    body: '| Cohort | Month 1 | Month 3 | Month 6 | Month 12 | Month 18 |\n|---|---|---|---|---|---|\n| Jan 2025 | $120 | $340 | $780 | $1,420 | $2,100 |\n| Apr 2025 | $140 | $390 | $890 | $1,680 | \u2014 |\n| Jul 2025 | $160 | $420 | $950 | \u2014 | \u2014 |\n| Oct 2025 | $180 | $460 | \u2014 | \u2014 | \u2014 |',
  },
  PROGRESS_TRACKER: {
    title: 'Platform Launch Milestones',
    body: 'AI Content Studio: 95%\nBrand Matchmaker v2: 80%\nCreator Storefront: 55%\nMobile App: 35%\nInternational Expansion: 42%',
  },
};

const CONTENT_D = {
  PROBLEM: {
    title: 'The Innovation Execution Gap',
    body: '1. 78% of R&D projects fail to deliver commercial value despite $2.4T global annual research spending\n2. Average time from discovery to market application has grown to 17 years across pharmaceutical and materials science\n3. Research teams spend 42% of time on literature review and data preparation instead of actual experimentation\n4. Cross-disciplinary collaboration occurs in only 11% of projects despite evidence it improves outcomes by 3.5x',
  },
  METRICS_HIGHLIGHT: {
    title: '327% ROI in First 18 Months',
    body: '327%: Return on Innovation Investment\n6.2x: Faster Discovery-to-Patent Cycle\n$340M: Research Cost Reduction\n89%: Experiment Reproducibility Rate',
  },
  COMPARISON: {
    title: 'Traditional R&D vs AI-Augmented Innovation',
    body: 'Traditional R&D vs AI-Augmented Innovation\n\nTraditional R&D:\n- Manual literature review consuming 40+ researcher hours per project\n- Hypothesis generation limited by individual domain expertise\n- Experiment design based on intuition with 23% reproducibility rate\n\nAI-Augmented Innovation:\n- Automated knowledge synthesis across 200M+ papers in seconds\n- Cross-domain hypothesis generation revealing non-obvious connections\n- ML-optimized experiment design achieving 89% reproducibility rate',
  },
  TIMELINE: {
    title: 'Innovation Milestones',
    body: 'Year 1: Platform Launch - Knowledge graph with 200M papers and patent corpus integration\nYear 2: Intelligence Phase - Predictive models for research direction and funding optimization\nYear 3: Collaboration Phase - Cross-institutional research networks and shared experiment libraries\nYear 4: Autonomy Phase - AI research agents conducting literature synthesis and hypothesis ranking',
  },
  FEATURE_GRID: {
    title: 'Research Acceleration Capabilities',
    body: 'Knowledge Synthesis: Analyze 200M+ papers with entity extraction and cross-domain linking\nHypothesis Engine: Generate novel research directions using graph neural networks and reasoning\nExperiment Designer: ML-optimized protocols with automated parameter sweeps and controls\nCollaboration Hub: Secure multi-institutional workspaces with IP protection and data governance',
  },
  PROCESS: {
    title: 'Innovation Pipeline',
    body: '1. Explore: AI-powered landscape analysis across patents, papers, and clinical data\n2. Hypothesize: Generate and rank novel research directions with confidence scoring\n3. Design: Create ML-optimized experiment protocols with statistical power analysis\n4. Execute: Run experiments with automated data capture and real-time anomaly detection\n5. Validate: Reproducibility verification with automated reporting and knowledge capture',
  },
  MARKET_SIZING: {
    title: 'Enterprise AI Research Market',
    body: 'Total Addressable Market (TAM): $67B global enterprise AI and research automation market\nServiceable Addressable Market (SAM): $18B pharma, biotech, and materials science R&D tools\nServiceable Obtainable Market (SOM): $1.4B top-200 research institutions and enterprise R&D labs\nCurrent penetration: 1.8% of SOM with pilots at 14 Fortune 500 research divisions\nCompetitive advantage: Only platform combining knowledge graphs, experiment design, and collaboration',
  },
  QUOTE: {
    title: 'Research Vision',
    body: 'The next breakthrough in science will not come from a single brilliant mind working in isolation. It will emerge from AI systems that can connect disparate findings across disciplines faster than any human team. We are building that bridge.\n\n- Dr. Viktor Andreev, Director of Computational Research at Helios Labs',
  },
  ARCHITECTURE: {
    title: 'Knowledge Graph Architecture',
    body: 'Query Interface: Natural language search, visual graph explorer, API endpoints for programmatic access\nReasoning Layer: Graph neural networks, causal inference engine, hypothesis generation models\nKnowledge Store: Neo4j graph database, vector embeddings, temporal citation network, ontology layer\nIngestion Pipeline: Paper parsers, patent extractors, clinical trial importers, real-time feed processors',
  },
  TEAM: {
    title: 'Research Leadership',
    body: 'Dr. Viktor Andreev - CEO & Chief Scientist\nDr. Sarah Kimura - CTO & Co-Founder\nProf. Michael Osei - VP of Research, Former MIT Faculty\nDr. Elena Marchetti - VP of AI and Machine Learning\nRajesh Gupta - Head of Product Engineering\nDr. Anna Lindqvist - Head of Knowledge Systems',
  },
  CTA: {
    title: 'Unlock Your Research Potential',
    body: '-> Request a pilot with your existing research data and knowledge base\n-> Schedule a demo of our AI-powered hypothesis generation engine\n-> Download our whitepaper on AI-augmented research methodology',
  },
  SOLUTION: {
    title: 'AI-Augmented Research Platform',
    body: '1. Intelligent Literature Mining: Extract structured knowledge from 200M+ papers with entity recognition and relationship mapping across disciplines\n2. Hypothesis Generation Engine: Discover non-obvious connections between research domains using graph neural networks and causal reasoning models\n3. Automated Experiment Design: Create statistically rigorous protocols with ML-optimized parameters that achieve 89% reproducibility rates\n4. Collaborative Knowledge Network: Connect researchers across institutions with secure workspaces, shared ontologies, and IP-protected data exchange',
  },
  HOOK: {
    title: '78% of R&D Projects Fail to Deliver Value',
    body: 'What if AI could cut your discovery-to-market cycle from 17 years to 17 months?',
  },
  MATRIX_2X2: {
    title: 'Research Investment Priority Matrix',
    body: 'X-Axis: Technical Feasibility\nY-Axis: Commercial Potential\nQuick Wins: High potential, high feasibility \u2014 ML model optimization, data pipeline automation, literature synthesis\nStrategic Bets: High potential, low feasibility \u2014 novel drug candidates, quantum materials, AGI safety\nLow Hanging Fruit: Low potential, high feasibility \u2014 documentation generation, protocol templates\nAvoid: Low potential, low feasibility \u2014 incremental improvements to deprecated approaches',
  },
  WATERFALL: {
    title: 'Patent Portfolio Bridge FY25 to FY26',
    body: 'Starting Patents: 847\nNew Filings: +234\nGranted: +189\nAbandoned: -56\nExpired: -23\nEnding Portfolio: 1,191',
  },
  FUNNEL: {
    title: 'Research Commercialization Pipeline',
    body: 'Published Papers: 12,000 (100%)\nNovel Discoveries: 1,800 (15%)\nPatent Filings: 360 (3%)\nLicensing Deals: 72 (0.6%)\nCommercial Products: 12 (0.1%)',
  },
  COMPETITIVE_MATRIX: {
    title: 'Research Platform Comparison',
    body: '| Capability | Us | Semantic Scholar | Elicit | Consensus |\n|---|---|---|---|---|\n| Knowledge Graph | \u2713 | \u2713 | \u2717 | \u2717 |\n| Experiment Design | \u2713 | \u2717 | \u2717 | \u2717 |\n| Cross-Domain Links | \u2713 | \u2717 | \u2713 | \u2717 |\n| Reproducibility | \u2713 | \u2717 | \u2717 | \u2717 |\n| API Access | \u2713 | \u2713 | \u2713 | \u2713 |',
  },
  ROADMAP: {
    title: 'Research Platform Roadmap',
    body: 'Now: 200M paper knowledge graph, Patent corpus integration, Hypothesis generation v1, Lab notebook sync\nNext: Cross-institutional networks, Experiment marketplace, Predictive funding models, Regulatory intelligence\nLater: AI research agents, Automated experiment execution, IP portfolio optimization, Clinical trial matching',
  },
  PRICING_TABLE: {
    title: 'Research-Grade Pricing',
    body: 'Academic: $0/seat/mo\n- 1,000 queries/month\n- Basic knowledge graph\n- Paper search\nResearch Team: $199/seat/mo (Recommended)\n- Unlimited queries\n- Full knowledge graph\n- Hypothesis engine\n- Experiment designer\nEnterprise R&D: Custom\n- Everything in Team\n- Private knowledge base\n- On-premise deployment\n- Dedicated support',
  },
  UNIT_ECONOMICS: {
    title: 'R&D Platform Economics',
    body: 'LTV:CAC = 7.2x\nCAC: $8,400 | LTV: $60,480 | Payback: 8 months | Gross Margin: 84% | Net Revenue Retention: 128%',
  },
  SWOT: {
    title: 'Research Platform Strategic Assessment',
    body: 'Strengths: 200M paper knowledge graph, 89% reproducibility rate, Cross-domain discovery, Enterprise R&D partnerships\nWeaknesses: Long sales cycles, Domain expertise requirements, Data sovereignty concerns\nOpportunities: $67B enterprise AI market, Pharma R&D automation, Materials science boom, Climate tech research\nThreats: Open-source alternatives, Big tech research tools, Data access restrictions, IP litigation risk',
  },
  THREE_PILLARS: {
    title: 'The Research Acceleration Framework',
    body: 'Discover: AI-powered knowledge synthesis across 200M+ papers reveals non-obvious connections in seconds\nDesign: ML-optimized experiment protocols achieve 89% reproducibility vs 23% industry average\nDeliver: Automated reporting and IP capture ensure every discovery reaches commercial potential\n\n### Three pillars that accelerate the pace of science',
  },
  BEFORE_AFTER: {
    title: 'The Research Transformation',
    body: 'Before: 40+ hours literature review, 23% reproducibility, 17-year discovery-to-market, siloed disciplines\nAfter: Seconds for knowledge synthesis, 89% reproducibility, 6.2x faster patents, cross-domain collaboration',
  },
  SOCIAL_PROOF: {
    title: 'Trusted by Leading Research Institutions',
    body: '4.7/5 average rating from 800+ research teams across 14 Fortune 500 R&D divisions\nPublished in Nature Methods, Science, and PNAS for research methodology innovation\nUsed by teams at MIT, Stanford, Max Planck Institute, Roche, and Pfizer',
  },
  OBJECTION_HANDLER: {
    title: 'Addressing Researcher Concerns',
    body: '"AI-generated hypotheses lack the intuition of experienced researchers"\nOur platform augments researcher intuition \u2014 it does not replace it. In controlled trials, research teams using our hypothesis engine published **3.5x more** novel findings while maintaining **89%** reproducibility, compared to 23% baseline.',
  },
  FAQ: {
    title: 'Research Platform Questions',
    body: 'Q: How does the knowledge graph handle proprietary research?\nA: Private knowledge bases are fully isolated with on-premise deployment options and SOC 2 compliance\nQ: Can it integrate with our existing lab systems?\nA: Native integrations with electronic lab notebooks, LIMS, and instrument data pipelines\nQ: What about data sovereignty and IP protection?\nA: All data processing can run in your own infrastructure with end-to-end encryption and audit logging',
  },
  VERDICT: {
    title: 'R&D Investment Committee Recommendation',
    body: 'Approve: Scale AI Research Platform Deployment\nPilot results demonstrate **6.2x faster** discovery-to-patent cycle with **327% ROI** in 18 months. Reproducibility rates improved from **23% to 89%** across 14 research divisions. Recommend enterprise-wide rollout with $12M budget.',
  },
  COHORT_TABLE: {
    title: 'Research Output by Institution Cohort',
    body: '| Cohort | Q1 | Q2 | Q3 | Q4 | Year 2 |\n|---|---|---|---|---|---|\n| Wave 1 (2024) | 12 papers | 34 papers | 67 papers | 89 papers | 156 papers |\n| Wave 2 (2025 H1) | 18 papers | 45 papers | 78 papers | \u2014 | \u2014 |\n| Wave 3 (2025 H2) | 24 papers | 52 papers | \u2014 | \u2014 | \u2014 |\n| Wave 4 (2026) | 28 papers | \u2014 | \u2014 | \u2014 | \u2014 |',
  },
  PROGRESS_TRACKER: {
    title: 'Research Platform Deployment Status',
    body: 'Knowledge Graph Integration: 92%\nHypothesis Engine Calibration: 78%\nLab System Connectors: 65%\nSecurity Audit: 98%\nResearcher Training: 52%',
  },
};

// ── Merge existing + extra content ────────────────────────────

const EXTRA_SETS = {
  A: EXTRA_CONTENT_A,
  B: EXTRA_CONTENT_B,
  C: EXTRA_CONTENT_C,
  D: EXTRA_CONTENT_D,
};

const BASE_SETS = { A: CONTENT_A, B: CONTENT_B, C: CONTENT_C, D: CONTENT_D };

function getFullContent(setKey) {
  return { ...BASE_SETS[setKey], ...EXTRA_SETS[setKey] };
}

// ── All 67 Slide Types (from Prisma enum) ─────────────────────

const ALL_SLIDE_TYPES = [
  'TITLE', 'PROBLEM', 'SOLUTION', 'ARCHITECTURE', 'PROCESS', 'COMPARISON',
  'DATA_METRICS', 'CTA', 'CONTENT', 'QUOTE', 'VISUAL_HUMOR', 'OUTLINE',
  'TEAM', 'TIMELINE', 'SECTION_DIVIDER', 'METRICS_HIGHLIGHT', 'FEATURE_GRID',
  'PRODUCT_SHOWCASE', 'LOGO_WALL', 'MARKET_SIZING', 'SPLIT_STATEMENT',
  'MATRIX_2X2', 'WATERFALL', 'FUNNEL', 'COMPETITIVE_MATRIX', 'ROADMAP',
  'PRICING_TABLE', 'UNIT_ECONOMICS', 'SWOT', 'THREE_PILLARS', 'HOOK',
  'BEFORE_AFTER', 'SOCIAL_PROOF', 'OBJECTION_HANDLER', 'FAQ', 'VERDICT',
  'COHORT_TABLE', 'PROGRESS_TRACKER', 'FLYWHEEL', 'REVENUE_MODEL',
  'CUSTOMER_JOURNEY', 'TECH_STACK', 'GROWTH_LOOPS', 'CASE_STUDY',
  'HIRING_PLAN', 'USE_OF_FUNDS', 'RISK_MITIGATION', 'DEMO_SCREENSHOT',
  'MILESTONE_TIMELINE', 'PARTNERSHIP_LOGOS', 'FINANCIAL_PROJECTION',
  'GO_TO_MARKET', 'PERSONA', 'TESTIMONIAL_WALL', 'THANK_YOU',
  'SCENARIO_ANALYSIS', 'VALUE_CHAIN', 'GEOGRAPHIC_MAP', 'IMPACT_SCORECARD',
  'EXIT_STRATEGY', 'ORG_CHART', 'FEATURE_COMPARISON', 'DATA_TABLE',
  'ECOSYSTEM_MAP', 'KPI_DASHBOARD', 'REFERENCES', 'ABSTRACT',
];

// ── Main Seed Logic ───────────────────────────────────────────

async function main() {
  console.log('=== Gallery Seed Script ===\n');

  // 1. Find or create gallery owner user
  let user = await prisma.user.findUnique({ where: { email: GALLERY_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: GALLERY_EMAIL,
        name: GALLERY_NAME,
        passwordHash: null,
        authProvider: 'local',
        role: 'ADMIN',
        tier: 'PRO',
        creditBalance: 99999,
        emailVerified: true,
      },
    });
    console.log(`Created gallery user: ${user.id}`);
  } else {
    console.log(`Found existing gallery user: ${user.id}`);
  }

  // 2. Delete existing public gallery presentations by this user
  const deleted = await prisma.presentation.deleteMany({
    where: { userId: user.id, isPublic: true },
  });
  console.log(`Deleted ${deleted.count} existing gallery presentations\n`);

  // 3. Load all themes from DB
  const themes = await prisma.theme.findMany();
  const themeBySlug = {};
  for (const t of themes) {
    themeBySlug[t.name] = t;
  }

  // 4. Create presentations for each theme
  const results = [];
  const themeEntries = Object.entries(THEME_CONTENT_SET);

  for (const [themeSlug, contentSetKey] of themeEntries) {
    const theme = themeBySlug[themeSlug];
    if (!theme) {
      console.log(`  SKIP: Theme "${themeSlug}" not found in DB`);
      continue;
    }

    const content = getFullContent(contentSetKey);
    const title = PRESENTATION_TITLES[contentSetKey];
    const presType = PRESENTATION_TYPES[contentSetKey];

    // Create the presentation
    const presentation = await prisma.presentation.create({
      data: {
        title: `${title} (${theme.displayName})`,
        description: `Gallery showcase of all slide types using the ${theme.displayName} theme`,
        sourceContent: `Gallery seed for ${theme.displayName}`,
        presentationType: presType,
        status: 'COMPLETED',
        themeId: theme.id,
        userId: user.id,
        isPublic: true,
        featured: true,
        publishedAt: new Date(),
      },
    });

    // Create slides for all 67 types
    const slideData = [];
    for (let i = 0; i < ALL_SLIDE_TYPES.length; i++) {
      const slideType = ALL_SLIDE_TYPES[i];
      const c = content[slideType];
      if (!c) {
        console.log(`    WARNING: No content for ${slideType} in set ${contentSetKey}`);
        continue;
      }
      slideData.push({
        presentationId: presentation.id,
        slideNumber: i + 1,
        slideType,
        title: c.title,
        body: c.body,
        imageSource: 'AI_GENERATED',
      });
    }

    await prisma.slide.createMany({ data: slideData });

    console.log(`  Created: "${presentation.title}" — ${slideData.length} slides (${presentation.id})`);
    results.push({ id: presentation.id, title: presentation.title, slides: slideData.length });
  }

  // 5. Trigger preview generation for each presentation
  console.log('\n=== Triggering Preview Generation ===\n');
  const apiBase = process.env.API_URL || 'http://localhost:3000';

  for (const r of results) {
    try {
      const res = await fetch(`${apiBase}/presentations/${r.id}/generate-previews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      console.log(`  Previews triggered for "${r.title}": ${JSON.stringify(data)}`);
    } catch (err) {
      console.log(`  Preview generation failed for "${r.title}": ${err.message}`);
      console.log('  (Run the API server and re-trigger manually if needed)');
    }
  }

  // 6. Summary
  console.log('\n=== Summary ===');
  console.log(`Total presentations created: ${results.length}`);
  console.log(`Total slides created: ${results.reduce((sum, r) => sum + r.slides, 0)}`);
  console.log('All marked isPublic=true and featured=true');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
