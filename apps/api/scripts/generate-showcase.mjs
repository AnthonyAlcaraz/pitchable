#!/usr/bin/env node
/**
 * Generate showcase slide JPEGs for all 16 themes and upload to S3.
 *
 * For each theme: generates 12 slides (diverse types), renders via Marp CLI,
 * uploads JPEGs to S3, and writes a JSON manifest.
 *
 * Content sets: A (Tech/SaaS), B (Strategy/Consulting), C (Creative/Consumer), D (Innovation/Research)
 * Each theme is assigned a content set for industry-appropriate variety.
 *
 * Usage:
 *   node scripts/generate-showcase.mjs
 *
 * Requires: .env with S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_REGION
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

import { buildHtmlSlideContent } from '../dist/src/exports/html-slide-templates.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

// ── S3 Configuration ──────────────────────────────────────────
// Support both S3_* (Railway/production) and MINIO_* (local) env vars

const s3Endpoint = process.env.S3_ENDPOINT
  || (process.env.MINIO_ENDPOINT
    ? `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT || '9000'}`
    : null);
const s3AccessKey = process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER;
const s3SecretKey = process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;

if (!s3Endpoint || !s3AccessKey || !s3SecretKey) {
  console.error('ERROR: Missing S3 environment variables (S3_ENDPOINT/MINIO_ENDPOINT, S3_ACCESS_KEY/MINIO_ROOT_USER, S3_SECRET_KEY/MINIO_ROOT_PASSWORD)');
  console.error('Load from .env or set them before running.');
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: s3Endpoint,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: s3AccessKey,
    secretAccessKey: s3SecretKey,
  },
  forcePathStyle: true, // MinIO / R2 compatibility
});
const S3_BUCKET = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'pitchable-documents';

// ── Theme Definitions (all 16) ─────────────────────────────────

const THEMES = [
  {
    slug: 'pitchable-dark',
    displayName: 'Pitchable Dark',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    palette: {
      background: '#0f172a', primary: '#3b82f6', secondary: '#64748b',
      accent: '#22d3ee', text: '#e2e8f0', surface: '#1e293b',
      border: '#334155', success: '#22c55e', warning: '#f59e0b', error: '#ef4444',
    },
  },
  {
    slug: 'dark-professional',
    displayName: 'Dark Professional',
    headingFont: 'Montserrat',
    bodyFont: 'Open Sans',
    palette: {
      background: '#0f172a', primary: '#f8fafc', secondary: '#94a3b8',
      accent: '#fbbf24', text: '#e2e8f0', surface: '#1e293b',
      border: '#334155', success: '#4ade80', warning: '#fbbf24', error: '#f87171',
    },
  },
  {
    slug: 'creative-warm',
    displayName: 'Creative Warm',
    headingFont: 'DM Sans',
    bodyFont: 'Lato',
    palette: {
      background: '#1c1917', primary: '#f97316', secondary: '#facc15',
      accent: '#fbbf24', text: '#fafaf9', surface: '#292524',
      border: '#44403c', success: '#4ade80', warning: '#facc15', error: '#f87171',
    },
  },
  {
    slug: 'technical-teal',
    displayName: 'Technical Teal',
    headingFont: 'Nunito Sans',
    bodyFont: 'Inter',
    palette: {
      background: '#0f172a', primary: '#14b8a6', secondary: '#06b6d4',
      accent: '#8b5cf6', text: '#e2e8f0', surface: '#1e293b',
      border: '#334155', success: '#34d399', warning: '#fbbf24', error: '#fb7185',
    },
  },
  {
    slug: 'light-minimal',
    displayName: 'Light Minimal',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    palette: {
      background: '#ffffff', primary: '#1e293b', secondary: '#64748b',
      accent: '#3b82f6', text: '#1e293b', surface: '#f8fafc',
      border: '#e2e8f0', success: '#22c55e', warning: '#f59e0b', error: '#ef4444',
    },
  },
  {
    slug: 'corporate-blue',
    displayName: 'Corporate Blue',
    headingFont: 'Poppins',
    bodyFont: 'Open Sans',
    palette: {
      background: '#f8fafc', primary: '#1e40af', secondary: '#3b82f6',
      accent: '#f59e0b', text: '#1e293b', surface: '#ffffff',
      border: '#e2e8f0', success: '#16a34a', warning: '#f59e0b', error: '#dc2626',
    },
  },
  {
    slug: 'mckinsey-executive',
    displayName: 'McKinsey Executive',
    headingFont: 'Georgia',
    bodyFont: 'Arial',
    palette: {
      background: '#FFFFFF', primary: '#051C2C', secondary: '#6B7280',
      accent: '#2251FF', text: '#1F2937', surface: '#F9FAFB',
      border: '#E5E7EB', success: '#059669', warning: '#D97706', error: '#DC2626',
    },
  },
  {
    slug: 'apple-keynote',
    displayName: 'Apple Keynote',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    palette: {
      background: '#000000', primary: '#FFFFFF', secondary: '#A1A1AA',
      accent: '#007AFF', text: '#F4F4F5', surface: '#18181B',
      border: '#27272A', success: '#34D399', warning: '#FBBF24', error: '#F87171',
    },
  },
  {
    slug: 'ted-talk',
    displayName: 'TED Talk',
    headingFont: 'Montserrat',
    bodyFont: 'Lato',
    palette: {
      background: '#1A1A1A', primary: '#FFFFFF', secondary: '#9CA3AF',
      accent: '#EB0028', text: '#E5E7EB', surface: '#262626',
      border: '#404040', success: '#22C55E', warning: '#EAB308', error: '#EF4444',
    },
  },
  {
    slug: 'yc-startup',
    displayName: 'YC Startup',
    headingFont: 'Montserrat',
    bodyFont: 'Open Sans',
    palette: {
      background: '#FFFFFF', primary: '#18181B', secondary: '#71717A',
      accent: '#F97316', text: '#18181B', surface: '#FAFAFA',
      border: '#E4E4E7', success: '#22C55E', warning: '#EAB308', error: '#EF4444',
    },
  },
  {
    slug: 'sequoia-capital',
    displayName: 'Sequoia Capital',
    headingFont: 'Source Serif Pro',
    bodyFont: 'Inter',
    palette: {
      background: '#FFFFFF', primary: '#14532D', secondary: '#6B7280',
      accent: '#16A34A', text: '#1F2937', surface: '#F9FAFB',
      border: '#E5E7EB', success: '#059669', warning: '#D97706', error: '#DC2626',
    },
  },
  {
    slug: 'airbnb-story',
    displayName: 'Airbnb Story',
    headingFont: 'Poppins',
    bodyFont: 'Lato',
    palette: {
      background: '#FFFFFF', primary: '#1F2937', secondary: '#9CA3AF',
      accent: '#FF5A5F', text: '#1F2937', surface: '#FFF7F7',
      border: '#FFE4E6', success: '#10B981', warning: '#F59E0B', error: '#EF4444',
    },
  },
  {
    slug: 'stripe-fintech',
    displayName: 'Stripe Fintech',
    headingFont: 'Montserrat',
    bodyFont: 'Source Sans Pro',
    palette: {
      background: '#0A0A23', primary: '#E2E8F0', secondary: '#94A3B8',
      accent: '#635BFF', text: '#E2E8F0', surface: '#1A1A3E',
      border: '#2D2D5F', success: '#22C55E', warning: '#F59E0B', error: '#F87171',
    },
  },
  {
    slug: 'bcg-strategy',
    displayName: 'BCG Strategy',
    headingFont: 'Georgia',
    bodyFont: 'Arial',
    palette: {
      background: '#F9FAFB', primary: '#1E3A2F', secondary: '#6B7280',
      accent: '#059669', text: '#1F2937', surface: '#FFFFFF',
      border: '#E5E7EB', success: '#059669', warning: '#D97706', error: '#DC2626',
    },
  },
  {
    slug: 'z4-dark-premium',
    displayName: 'Z4 Dark Premium',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    palette: {
      background: '#0f172a', primary: '#60a5fa', secondary: '#818cf8',
      accent: '#fbbf24', text: '#f1f5f9', surface: '#1e293b',
      border: '#334155', success: '#4ade80', warning: '#fbbf24', error: '#f87171',
    },
  },
  {
    slug: 'academic-research',
    displayName: 'Academic Research',
    headingFont: 'Libre Baskerville',
    bodyFont: 'Source Sans Pro',
    palette: {
      background: '#FFFDF7', primary: '#1E3A5F', secondary: '#64748B',
      accent: '#2563EB', text: '#1F2937', surface: '#FFF8E7',
      border: '#E5E1D5', success: '#059669', warning: '#D97706', error: '#B91C1C',
    },
  },
];

// ── Content Set Assignment per Theme ─────────────────────────────

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

// ── Stock Images (8) ────────────────────────────────────────────

const UNSPLASH_URLS = [
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',   // 0: globe/tech
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',   // 1: dashboard/analytics
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',   // 2: circuit board
  'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',      // 3: team office
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',   // 4: workspace
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',      // 5: abstract blue
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',   // 6: modern office
  'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=800&q=80',   // 7: data visualization
];

// ── Content Set Definitions ──────────────────────────────────────

/**
 * Content Set A - Tech/SaaS: Developer tools / platform engineering
 */
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
    body: '| Cohort | Month 1 | Month 3 | Month 6 | Month 12 | Month 18 |\n|---|---|---|---|---|---|\n| Q1 2025 | 100% | 89% | 78% | 64% | 58% |\n| Q2 2025 | 100% | 91% | 82% | 68% | — |\n| Q3 2025 | 100% | 93% | 85% | — | — |\n| Q4 2025 | 100% | 94% | — | — | — |',
  },
  PROGRESS_TRACKER: {
    title: 'Platform Migration Status',
    body: 'CI/CD Pipeline Migration: 92%\nInfrastructure as Code: 78%\nObservability Setup: 85%\nSecurity Compliance: 95%\nTeam Onboarding: 60%',
  },
};

/**
 * Content Set B - Strategy/Consulting: Corporate transformation / value creation
 */
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
    body: 'X-Axis: Execution Complexity\nY-Axis: Value Creation Potential\nQuick Wins: High value, low complexity — procurement optimization, shared services, process automation\nStrategic Bets: High value, high complexity — digital transformation, M&A integration, operating model redesign\nLow Hanging Fruit: Low value, low complexity — policy updates, reporting consolidation\nAvoid: Low value, high complexity — legacy system patches, organizational restructuring without clear ROI',
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
    body: 'Q: How quickly can you mobilize a team?\nA: Senior partners on-site within 2 weeks with full team deployed by week 4\nQ: Do you guarantee outcomes?\nA: Yes — 30% of fees are tied to achieving agreed KPIs within the transformation timeline\nQ: How do you handle change resistance?\nA: Our behavioral science-based change program achieves 89% adoption rates across organizational levels',
  },
  VERDICT: {
    title: 'Board Recommendation',
    body: 'Approve: Proceed with Strategic Transformation\nDiagnostic confirms **$2.1B** revenue opportunity with **340bps** margin improvement. Risk-adjusted NPV exceeds investment threshold by **3.2x**. Recommend immediate Phase 1 authorization with $45M budget allocation.',
  },
  COHORT_TABLE: {
    title: 'Client Value Realization by Engagement Cohort',
    body: '| Cohort | Q1 | Q2 | Q3 | Q4 | Year 2 |\n|---|---|---|---|---|---|\n| FY23 Clients | 12% | 34% | 67% | 89% | 112% |\n| FY24 Clients | 15% | 41% | 72% | 94% | — |\n| FY25 Clients | 18% | 45% | 78% | — | — |\n| FY26 Clients | 22% | 48% | — | — | — |',
  },
  PROGRESS_TRACKER: {
    title: 'Transformation Progress Dashboard',
    body: 'Operating Model Redesign: 88%\nProcess Automation: 65%\nTalent Upskilling: 45%\nTechnology Migration: 72%\nChange Adoption: 58%',
  },
};

/**
 * Content Set C - Creative/Consumer: Creator economy / experience design
 */
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
    body: 'Naomi Sato - CEO & Co-Founder\nCarlos Mendez - Chief Product Officer\nJade Williams - VP of Creator Experience\nLiam O\'Brien - VP of Engineering\nAmira Hassan - Head of Brand Partnerships\nTyler Jackson - Head of Community',
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
    body: 'X-Axis: Production Effort\nY-Axis: Audience Growth Impact\nQuick Wins: High growth, low effort — trending audio remixes, carousel posts, community polls\nStrategic Bets: High growth, high effort — documentary series, course launches, brand collaborations\nLow Hanging Fruit: Low growth, low effort — story reposts, comment engagement, quick takes\nAvoid: Low growth, high effort — overproduced content, vanity metrics campaigns',
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
    body: '"Another creator tool that takes a cut of my earnings"\nOur 8% take rate is the lowest in the industry, and creators using our platform earn **4.7x more** on average. We only succeed when creators succeed — our revenue is directly tied to yours.',
  },
  FAQ: {
    title: 'Creator Questions Answered',
    body: 'Q: Will the AI tools change my authentic voice?\nA: Our AI learns your unique style and tone — it amplifies your voice, never replaces it\nQ: How does brand matching work?\nA: Our algorithm analyzes audience overlap, brand fit, and engagement patterns to surface ideal partnerships\nQ: Can I use this with my existing platforms?\nA: Yes — native integrations with YouTube, TikTok, Instagram, Twitch, and Substack',
  },
  VERDICT: {
    title: 'Creator Advisory Recommendation',
    body: 'Approve: Scale Creator Platform Investment\nCreator acquisition metrics show **142% NRR** with **6.8x LTV:CAC**. Platform demonstrates clear product-market fit with **92%** retention and **4.7x** creator revenue lift. Recommend Series B raise to accelerate international expansion.',
  },
  COHORT_TABLE: {
    title: 'Creator Revenue Growth by Cohort',
    body: '| Cohort | Month 1 | Month 3 | Month 6 | Month 12 | Month 18 |\n|---|---|---|---|---|---|\n| Jan 2025 | $120 | $340 | $780 | $1,420 | $2,100 |\n| Apr 2025 | $140 | $390 | $890 | $1,680 | — |\n| Jul 2025 | $160 | $420 | $950 | — | — |\n| Oct 2025 | $180 | $460 | — | — | — |',
  },
  PROGRESS_TRACKER: {
    title: 'Platform Launch Milestones',
    body: 'AI Content Studio: 95%\nBrand Matchmaker v2: 80%\nCreator Storefront: 55%\nMobile App: 35%\nInternational Expansion: 42%',
  },
};

/**
 * Content Set D - Innovation/Research: Enterprise innovation / R&D
 */
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
    body: 'X-Axis: Technical Feasibility\nY-Axis: Commercial Potential\nQuick Wins: High potential, high feasibility — ML model optimization, data pipeline automation, literature synthesis\nStrategic Bets: High potential, low feasibility — novel drug candidates, quantum materials, AGI safety\nLow Hanging Fruit: Low potential, high feasibility — documentation generation, protocol templates\nAvoid: Low potential, low feasibility — incremental improvements to deprecated approaches',
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
    body: '"AI-generated hypotheses lack the intuition of experienced researchers"\nOur platform augments researcher intuition — it does not replace it. In controlled trials, research teams using our hypothesis engine published **3.5x more** novel findings while maintaining **89%** reproducibility, compared to 23% baseline.',
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
    body: '| Cohort | Q1 | Q2 | Q3 | Q4 | Year 2 |\n|---|---|---|---|---|---|\n| Wave 1 (2024) | 12 papers | 34 papers | 67 papers | 89 papers | 156 papers |\n| Wave 2 (2025 H1) | 18 papers | 45 papers | 78 papers | — | — |\n| Wave 3 (2025 H2) | 24 papers | 52 papers | — | — | — |\n| Wave 4 (2026) | 28 papers | — | — | — | — |',
  },
  PROGRESS_TRACKER: {
    title: 'Research Platform Deployment Status',
    body: 'Knowledge Graph Integration: 92%\nHypothesis Engine Calibration: 78%\nLab System Connectors: 65%\nSecurity Audit: 98%\nResearcher Training: 52%',
  },
};

const CONTENT_SETS = { A: CONTENT_A, B: CONTENT_B, C: CONTENT_C, D: CONTENT_D };

// ── Slide Definitions ──────────────────────────────────────────

/**
 * Image assignment strategy per content set (rotate across 8 images):
 * Set A: FEATURE_GRID=img-0, ARCHITECTURE=img-2, CTA=img-5, SOLUTION=img-7
 * Set B: FEATURE_GRID=img-1, ARCHITECTURE=img-3, CTA=img-6, SOLUTION=img-4
 * Set C: FEATURE_GRID=img-6, ARCHITECTURE=img-0, CTA=img-3, SOLUTION=img-1
 * Set D: FEATURE_GRID=img-7, ARCHITECTURE=img-5, CTA=img-4, SOLUTION=img-2
 */
const IMAGE_ASSIGNMENTS = {
  A: { FEATURE_GRID: 0, ARCHITECTURE: 2, CTA: 5, SOLUTION: 7 },
  B: { FEATURE_GRID: 1, ARCHITECTURE: 3, CTA: 6, SOLUTION: 4 },
  C: { FEATURE_GRID: 6, ARCHITECTURE: 0, CTA: 3, SOLUTION: 1 },
  D: { FEATURE_GRID: 7, ARCHITECTURE: 5, CTA: 4, SOLUTION: 2 },
};

/**
 * Build the 12 showcase slides for a theme based on its content set.
 *
 * Slide order (12 slides):
 *  1. PROBLEM (no image)
 *  2. METRICS_HIGHLIGHT (no image)
 *  3. COMPARISON (no image) — body contains "vs" for two-card VS badge variant
 *  4. TIMELINE (no image) — 4 items for zigzag variant
 *  5. FEATURE_GRID (right-panel image) — 4 items for grid layout
 *  6. PROCESS (no image) — 5 steps for circle-chain variant
 *  7. MARKET_SIZING (no image)
 *  8. QUOTE (no image)
 *  9. ARCHITECTURE (right-panel image) — 4 layers
 * 10. TEAM (no image) — 6 people with "Name - Role" format
 * 11. CTA (background image)
 * 12. SOLUTION (right-panel image) — 4 capabilities for cascade variant
 */
function getSlides(imgDir, contentSetKey) {
  const img = (i) => path.resolve(imgDir, `img-${i}.jpg`).replace(/\\/g, '/');
  const content = CONTENT_SETS[contentSetKey];
  const images = IMAGE_ASSIGNMENTS[contentSetKey];

  return [
    {
      slideNumber: 1,
      slideType: 'PROBLEM',
      title: content.PROBLEM.title,
      body: content.PROBLEM.body,
      hasImage: false,
    },
    {
      slideNumber: 2,
      slideType: 'METRICS_HIGHLIGHT',
      title: content.METRICS_HIGHLIGHT.title,
      body: content.METRICS_HIGHLIGHT.body,
      hasImage: false,
    },
    {
      slideNumber: 3,
      slideType: 'COMPARISON',
      title: content.COMPARISON.title,
      body: content.COMPARISON.body,
      hasImage: false,
    },
    {
      slideNumber: 4,
      slideType: 'TIMELINE',
      title: content.TIMELINE.title,
      body: content.TIMELINE.body,
      hasImage: false,
    },
    {
      slideNumber: 5,
      slideType: 'FEATURE_GRID',
      title: content.FEATURE_GRID.title,
      body: content.FEATURE_GRID.body,
      hasImage: true,
      imageUrl: img(images.FEATURE_GRID),
    },
    {
      slideNumber: 6,
      slideType: 'PROCESS',
      title: content.PROCESS.title,
      body: content.PROCESS.body,
      hasImage: false,
    },
    {
      slideNumber: 7,
      slideType: 'MARKET_SIZING',
      title: content.MARKET_SIZING.title,
      body: content.MARKET_SIZING.body,
      hasImage: false,
    },
    {
      slideNumber: 8,
      slideType: 'QUOTE',
      title: content.QUOTE.title,
      body: content.QUOTE.body,
      hasImage: false,
    },
    {
      slideNumber: 9,
      slideType: 'ARCHITECTURE',
      title: content.ARCHITECTURE.title,
      body: content.ARCHITECTURE.body,
      hasImage: true,
      imageUrl: img(images.ARCHITECTURE),
    },
    {
      slideNumber: 10,
      slideType: 'TEAM',
      title: content.TEAM.title,
      body: content.TEAM.body,
      hasImage: false,
    },
    {
      slideNumber: 11,
      slideType: 'CTA',
      title: content.CTA.title,
      body: content.CTA.body,
      hasImage: true,
      bgImagePath: img(images.CTA),
    },
    {
      slideNumber: 12,
      slideType: 'SOLUTION',
      title: content.SOLUTION.title,
      body: content.SOLUTION.body,
      hasImage: true,
      imageUrl: img(images.SOLUTION),
    },

    // ── New slide types (13-29): data-visualization SVGs, no images ──
    {
      slideNumber: 13,
      slideType: 'HOOK',
      title: content.HOOK.title,
      body: content.HOOK.body,
      hasImage: false,
    },
    {
      slideNumber: 14,
      slideType: 'MATRIX_2X2',
      title: content.MATRIX_2X2.title,
      body: content.MATRIX_2X2.body,
      hasImage: false,
    },
    {
      slideNumber: 15,
      slideType: 'WATERFALL',
      title: content.WATERFALL.title,
      body: content.WATERFALL.body,
      hasImage: false,
    },
    {
      slideNumber: 16,
      slideType: 'FUNNEL',
      title: content.FUNNEL.title,
      body: content.FUNNEL.body,
      hasImage: false,
    },
    {
      slideNumber: 17,
      slideType: 'COMPETITIVE_MATRIX',
      title: content.COMPETITIVE_MATRIX.title,
      body: content.COMPETITIVE_MATRIX.body,
      hasImage: false,
    },
    {
      slideNumber: 18,
      slideType: 'ROADMAP',
      title: content.ROADMAP.title,
      body: content.ROADMAP.body,
      hasImage: false,
    },
    {
      slideNumber: 19,
      slideType: 'PRICING_TABLE',
      title: content.PRICING_TABLE.title,
      body: content.PRICING_TABLE.body,
      hasImage: false,
    },
    {
      slideNumber: 20,
      slideType: 'UNIT_ECONOMICS',
      title: content.UNIT_ECONOMICS.title,
      body: content.UNIT_ECONOMICS.body,
      hasImage: false,
    },
    {
      slideNumber: 21,
      slideType: 'SWOT',
      title: content.SWOT.title,
      body: content.SWOT.body,
      hasImage: false,
    },
    {
      slideNumber: 22,
      slideType: 'THREE_PILLARS',
      title: content.THREE_PILLARS.title,
      body: content.THREE_PILLARS.body,
      hasImage: false,
    },
    {
      slideNumber: 23,
      slideType: 'BEFORE_AFTER',
      title: content.BEFORE_AFTER.title,
      body: content.BEFORE_AFTER.body,
      hasImage: false,
    },
    {
      slideNumber: 24,
      slideType: 'SOCIAL_PROOF',
      title: content.SOCIAL_PROOF.title,
      body: content.SOCIAL_PROOF.body,
      hasImage: false,
    },
    {
      slideNumber: 25,
      slideType: 'OBJECTION_HANDLER',
      title: content.OBJECTION_HANDLER.title,
      body: content.OBJECTION_HANDLER.body,
      hasImage: false,
    },
    {
      slideNumber: 26,
      slideType: 'FAQ',
      title: content.FAQ.title,
      body: content.FAQ.body,
      hasImage: false,
    },
    {
      slideNumber: 27,
      slideType: 'VERDICT',
      title: content.VERDICT.title,
      body: content.VERDICT.body,
      hasImage: false,
    },
    {
      slideNumber: 28,
      slideType: 'COHORT_TABLE',
      title: content.COHORT_TABLE.title,
      body: content.COHORT_TABLE.body,
      hasImage: false,
    },
    {
      slideNumber: 29,
      slideType: 'PROGRESS_TRACKER',
      title: content.PROGRESS_TRACKER.title,
      body: content.PROGRESS_TRACKER.body,
      hasImage: false,
    },
  ];
}

// ── Helpers ─────────────────────────────────────────────────────

function isDarkBg(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
}

function hexToRgba(hex, alpha) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Build comprehensive Marp CSS preamble for a theme.
 * Must handle both Figma-grade HTML content and standard Marp markdown.
 */
function buildCssPreamble(theme) {
  const { palette, headingFont, bodyFont } = theme;
  const dark = isDarkBg(palette.background);

  // Google Fonts import for the fonts used (skip system fonts)
  const systemFonts = new Set(['Georgia', 'Arial', 'Times New Roman', 'Helvetica', 'Verdana', 'Courier New']);
  const fontsToImport = [...new Set([headingFont, bodyFont])].filter(f => !systemFonts.has(f));
  const fontImportUrl = fontsToImport
    .map((f) => f.replace(/ /g, '+'))
    .map((f) => `family=${f}:wght@400;600;700`)
    .join('&');

  return `<style>
  ${fontImportUrl ? `@import url('https://fonts.googleapis.com/css2?${fontImportUrl}&display=swap');` : '/* System fonts only — no Google Fonts import */'}

  /* ── Base Section ─────────────────────────────── */
  section {
    width: 1280px;
    height: 720px;
    background: ${palette.background};
    color: ${palette.text};
    font-family: '${bodyFont}', sans-serif;
    font-size: 18px;
    line-height: 1.5;
    padding: 0;
    margin: 0;
    overflow: hidden;
    position: relative;
  }

  /* ── Typography ───────────────────────────────── */
  h1, h2, h3 {
    font-family: '${headingFont}', sans-serif;
    color: ${dark ? palette.primary : palette.primary};
    margin: 0;
    padding: 0;
    line-height: 1.2;
  }
  h1 { font-size: 40px; font-weight: 700; }
  h1::after {
    content: '';
    display: block;
    width: 60px;
    height: 3px;
    background: ${palette.accent};
    margin-top: 8px;
    border-radius: 2px;
  }
  h2 { font-size: 28px; font-weight: 600; color: ${palette.secondary}; }
  h3 { font-size: 22px; font-weight: 600; }
  p { margin: 8px 0; color: ${palette.text}; }
  strong { color: ${palette.accent}; font-weight: 700; }
  em { color: ${palette.secondary}; }

  ul, ol {
    margin: 8px 0;
    padding-left: 24px;
  }
  li {
    margin-bottom: 6px;
    color: ${palette.text};
    font-size: 17px;
    line-height: 1.4;
  }
  li::marker {
    color: ${palette.accent};
  }

  /* ── Figma-grade HTML Template Styles ─────────── */
  /* These ensure the SVG+HTML templates render correctly inside Marp */

  /* Container resets for absolute positioning */
  section div[style*="position:absolute"],
  section div[style*="position: absolute"] {
    box-sizing: border-box;
  }

  /* SVG text rendering */
  svg text {
    font-family: '${bodyFont}', '${headingFont}', sans-serif;
  }

  /* foreignObject HTML rendering */
  foreignObject div, foreignObject p, foreignObject span {
    font-family: '${bodyFont}', sans-serif;
    line-height: 1.4;
    box-sizing: border-box;
  }

  /* Image overlay panels (30% right side) */
  section img:not([alt*="bg"]) {
    object-fit: cover;
    border-radius: 0;
  }

  /* Mood overlay for dark themes */
  .mood-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  /* Ensure HTML template content sits above backgrounds */
  section > div {
    position: relative;
    z-index: 1;
  }

  /* ── Glass card styling ──────────────────────── */
  .glass-card {
    background: ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.8)'};
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid ${dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)'};
    box-shadow: ${dark ? '0 4px 30px rgba(0,0,0,0.15)' : '0 2px 12px rgba(0,0,0,0.05)'};
    border-radius: 16px;
    padding: 20px 24px;
  }

  /* ── Accent color rotation on bold text ──────── */
  li:nth-child(4n+1) strong { color: ${palette.accent}; }
  li:nth-child(4n+2) strong { color: ${palette.primary}; }
  li:nth-child(4n+3) strong { color: ${palette.success}; }
  li:nth-child(4n+4) strong { color: ${palette.secondary}; }

  /* ── Background image slides ──────────────────── */
  section[data-bg-image="true"] {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 80px;
  }
  section[data-bg-image="true"] h1 {
    font-size: 44px;
    color: ${dark ? '#FFFFFF' : palette.primary};
    text-shadow: ${dark ? '0 2px 8px rgba(0,0,0,0.5)' : '0 1px 4px rgba(255,255,255,0.7)'};
    margin-bottom: 16px;
  }
  section[data-bg-image="true"] h1::after {
    background: ${palette.accent};
    width: 80px;
    height: 4px;
  }
  section[data-bg-image="true"] p,
  section[data-bg-image="true"] li {
    color: ${dark ? 'rgba(255,255,255,0.95)' : palette.text};
    font-size: 20px;
    text-shadow: ${dark ? '0 1px 4px rgba(0,0,0,0.4)' : 'none'};
  }
  section[data-bg-image="true"] strong {
    color: ${palette.accent};
  }

  /* ── Scrollbar and overflow ──────────────────── */
  ::-webkit-scrollbar { display: none; }
  * { scrollbar-width: none; }
</style>`;
}

/**
 * Fix mood overlay HTML that buildHtmlSlideContent injects inside <style scoped> blocks.
 * Moves any HTML elements (divs, SVGs) from inside <style scoped> to before it.
 */
function fixStyleBlocks(html) {
  // Pattern: <style scoped> followed by HTML elements before CSS rules
  return html.replace(/<style scoped>([\s\S]*?)<\/style>/g, (match, inner) => {
    // Check if the style block contains HTML elements
    const trimmed = inner.trim();
    if (!trimmed.startsWith('<div') && !trimmed.startsWith('<svg')) {
      return match; // Pure CSS, leave as-is
    }
    // Split: HTML part is everything before "section {", CSS part is from "section {" onwards
    const cssStart = trimmed.indexOf('section {');
    if (cssStart === -1) return match; // No CSS rules found, leave as-is
    const htmlPart = trimmed.substring(0, cssStart).trim();
    const cssPart = trimmed.substring(cssStart).trim();
    return htmlPart + '\n<style scoped>\n' + cssPart + '\n</style>';
  });
}

/**
 * Generate a single Marp markdown file for a theme containing all 12 slides.
 */
function generateMarpMarkdown(theme, slides) {
  const { palette } = theme;
  const lines = [];

  // Marp frontmatter
  lines.push('---');
  lines.push('marp: true');
  lines.push('theme: default');
  lines.push('paginate: false');
  lines.push('---');
  lines.push('');

  // CSS preamble (first slide carries all styles)
  lines.push(buildCssPreamble(theme));
  lines.push('');

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];

    if (i > 0) {
      lines.push('---');
      lines.push('');
    }

    // Per-slide background/color directives
    lines.push(`<!-- _backgroundColor: ${palette.background} -->`);
    lines.push(`<!-- _color: ${palette.text} -->`);
    lines.push('');

    if (slide.bgImagePath) {
      // CTA slide: background image via Marp directive + markdown content
      lines.push(`![bg opacity:0.25](${slide.bgImagePath})`);
      lines.push('');
      lines.push(`<!-- _class: "" -->`);
      lines.push(`<div data-bg-image="true" style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:60px 80px;">`);
      lines.push('');
      lines.push(`<h1 style="font-family:'${theme.headingFont}',sans-serif;font-size:44px;color:${isDarkBg(palette.background) ? '#FFFFFF' : palette.primary};margin-bottom:12px;">${slide.title}</h1>`);
      lines.push(`<div style="width:80px;height:4px;background:${palette.accent};border-radius:2px;margin-bottom:24px;"></div>`);
      lines.push('');
      const bodyLines = slide.body.split('\n').filter(Boolean);
      lines.push('<ul style="list-style:none;padding:0;margin:0;">');
      for (const line of bodyLines) {
        const cleanLine = line.replace(/^->?\s*/, '');
        lines.push(`<li style="font-family:'${theme.bodyFont}',sans-serif;font-size:20px;color:${isDarkBg(palette.background) ? 'rgba(255,255,255,0.95)' : palette.text};margin-bottom:12px;padding-left:20px;position:relative;"><span style="position:absolute;left:0;color:${palette.accent};">&#9656;</span>${cleanLine}</li>`);
      }
      lines.push('</ul>');
      lines.push('</div>');
    } else {
      // All other slides: Figma-grade HTML content via buildHtmlSlideContent
      const slideInput = {
        title: slide.title,
        body: slide.body,
        slideType: slide.slideType,
        ...(slide.imageUrl ? { imageUrl: slide.imageUrl } : {}),
      };

      let html = buildHtmlSlideContent(slideInput, palette, { accentColorDiversity: true });

      // Post-process: fix mood overlay HTML injected inside <style scoped> blocks
      html = fixStyleBlocks(html);

      // Inject the raw HTML directly into the Marp slide
      lines.push(html);
    }

    lines.push('');
  }

  return lines.join('\n');
}

// ── Image Download ─────────────────────────────────────────────

async function downloadImages(imgDir) {
  fs.mkdirSync(imgDir, { recursive: true });

  console.log(`Downloading ${UNSPLASH_URLS.length} stock images...`);
  const results = await Promise.allSettled(
    UNSPLASH_URLS.map(async (url, i) => {
      const dest = path.join(imgDir, `img-${i}.jpg`);
      if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
        console.log(`  [${i}] Cached: ${dest}`);
        return;
      }
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const fileStream = fs.createWriteStream(dest);
      await pipeline(Readable.fromWeb(res.body), fileStream);
      console.log(`  [${i}] Downloaded: ${dest} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
    }),
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`WARNING: ${failed.length} image download(s) failed:`);
    for (const f of failed) console.warn(`  ${f.reason?.message || f.reason}`);
  }
  return failed.length === 0;
}

// ── Marp Rendering ─────────────────────────────────────────────

function renderMarpSlides(mdPath, outputBase) {
  const cmd = [
    'npx', '@marp-team/marp-cli',
    JSON.stringify(mdPath),
    '--images', 'jpeg',
    '--jpeg-quality', '85',
    '--html',
    '--allow-local-files',
    '-o', JSON.stringify(outputBase + '.jpeg'),
  ].join(' ');

  console.log(`  Rendering: ${path.basename(mdPath)}`);
  execSync(cmd, {
    cwd: path.resolve(import.meta.dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 120_000,
  });
}

// ── S3 Upload ──────────────────────────────────────────────────

async function uploadToS3(localPath, s3Key) {
  const body = fs.readFileSync(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: body,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  console.log('=== Pitchable Showcase Generator ===\n');
  console.log('29 slides per theme x 16 themes = 464 total slides');
  console.log('4 content sets: A (Tech/SaaS), B (Strategy/Consulting), C (Creative/Consumer), D (Innovation/Research)\n');

  // S3 config validated at module level

  // Create temp directories
  const tmpBase = path.join(os.tmpdir(), 'pitchable-showcase');
  const imgDir = path.join(tmpBase, 'images');
  const marpDir = path.join(tmpBase, 'marp');
  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(marpDir, { recursive: true });

  // Download stock images
  await downloadImages(imgDir);

  const manifest = {
    generated: new Date().toISOString(),
    themes: [],
  };

  const succeeded = [];
  const failed = [];

  for (const theme of THEMES) {
    const contentSetKey = THEME_CONTENT_SET[theme.slug] || 'A';
    console.log(`\n--- Theme: ${theme.displayName} (${theme.slug}) [Content Set ${contentSetKey}] ---`);

    // Build slide definitions for this theme's content set
    const slides = getSlides(imgDir, contentSetKey);

    try {
      // 1. Generate Marp markdown
      const mdPath = path.join(marpDir, `${theme.slug}.md`);
      const mdContent = generateMarpMarkdown(theme, slides);
      fs.writeFileSync(mdPath, mdContent, 'utf-8');

      // 2. Render via Marp CLI
      const outputBase = path.join(marpDir, theme.slug);
      renderMarpSlides(mdPath, outputBase);

      // 3. Find generated JPEG files (Marp outputs .001.jpeg, .002.jpeg, etc.)
      const themeManifest = {
        slug: theme.slug,
        displayName: theme.displayName,
        contentSet: contentSetKey,
        slides: [],
      };

      for (let s = 0; s < slides.length; s++) {
        const jpegNum = String(s + 1).padStart(3, '0');
        const jpegPath = `${outputBase}.${jpegNum}.jpeg`;

        if (!fs.existsSync(jpegPath)) {
          console.warn(`  WARNING: Missing ${path.basename(jpegPath)}`);
          continue;
        }

        // Copy to public/showcase/ for Docker bundling
        const publicDir = path.resolve(import.meta.dirname, '..'  , 'public', 'showcase', theme.slug);
        fs.mkdirSync(publicDir, { recursive: true });
        const publicDest = path.join(publicDir, jpegNum + '.jpeg');
        fs.copyFileSync(jpegPath, publicDest);
        const s3Key = `showcase/${theme.slug}/${s + 1}.jpeg`;
        try {
          await uploadToS3(jpegPath, s3Key);
          console.log(`  Uploaded: s3://${S3_BUCKET}/${s3Key} (${(fs.statSync(jpegPath).size / 1024).toFixed(0)} KB)`);
        } catch (s3Err) {
          console.log(`  Local only: ${path.basename(jpegPath)} (${(fs.statSync(jpegPath).size / 1024).toFixed(0)} KB) — S3 upload skipped: ${s3Err.message || 'unavailable'}`);
        }

        themeManifest.slides.push({
          slideNumber: s + 1,
          slideType: slides[s].slideType,
          title: slides[s].title,
          hasImage: slides[s].hasImage,
          s3Key,
        });
      }

      manifest.themes.push(themeManifest);
      succeeded.push(theme.slug);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      if (err.stderr) console.error(`  STDERR: ${err.stderr.toString().slice(0, 500)}`);
      failed.push({ slug: theme.slug, error: err.message });
    }
  }

  // Write manifest
  const manifestPath = path.resolve(import.meta.dirname, 'showcase-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\nManifest written: ${manifestPath}`);

  // Cleanup temp markdown files (keep images cached)
  // fs.rmSync(marpDir, { recursive: true, force: true });

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Summary ===');
  console.log(`Succeeded: ${succeeded.length}/${THEMES.length} themes`);
  if (failed.length > 0) {
    console.log('Failed:');
    for (const f of failed) console.log(`  - ${f.slug}: ${f.error}`);
  }
  console.log(`Total slides uploaded: ${manifest.themes.reduce((n, t) => n + t.slides.length, 0)}`);
  console.log(`Duration: ${elapsed}s`);
  console.log(`Temp dir: ${tmpBase}`);

  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
