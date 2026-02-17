import type {
  AudienceType,
  DeckArchetype,
  PitchGoal,
  SlideType,
  StoryFramework,
  ToneStyle,
} from '../../../generated/prisma/enums.js';
import type { DensityLimits } from '../../constraints/density-validator.js';

// ── Interfaces ──────────────────────────────────────────────

export interface SlideTypeRequirement {
  slideType: SlideType;
  min: number;
  description: string;
}

export interface QualityGate {
  agent: 'style' | 'narrative' | 'fact_check';
  threshold?: number;
  extraRules: string[];
}

export interface DeckArchetypeConfig {
  id: DeckArchetype;
  name: string;
  description: string;
  bookSources: string[];
  defaultFrameworks: StoryFramework[];
  defaultThemes: string[];
  defaultTone: ToneStyle;
  defaultAudience: AudienceType;
  defaultGoal: PitchGoal;
  densityProfile: Partial<DensityLimits>;
  slideRange: { min: number; max: number };
  narrativeRules: string[];
  qualityGates: QualityGate[];
  slideTypeDistribution: SlideTypeRequirement[];
  antiPatterns: string[];
}

// ── Archetype Definitions ───────────────────────────────────

export const DECK_ARCHETYPES: DeckArchetypeConfig[] = [
  // ── 1. INVESTOR_PITCH ─────────────────────────────────────
  {
    id: 'INVESTOR_PITCH',
    name: 'Investor Pitch',
    description:
      'Kawasaki 10/20/30 structure for fundraising. Metric-heavy, strict density, 10 slides max.',
    bookSources: [
      'The Art of the Start (Guy Kawasaki)',
      'Pitch Anything (Oren Klaff)',
    ],
    defaultFrameworks: ['KAWASAKI_10_20_30', 'POPP'],
    defaultThemes: ['yc-startup', 'sequoia-capital', 'light-minimal'],
    defaultTone: 'BOLD',
    defaultAudience: 'INVESTORS',
    defaultGoal: 'RAISE_FUNDING',
    densityProfile: {
      maxBulletsPerSlide: 3,
      maxWordsPerSlide: 40,
      maxTableRows: 3,
      maxConceptsPerSlide: 1,
      maxNestedListDepth: 1,
    },
    slideRange: { min: 10, max: 10 },
    narrativeRules: [
      'EXACTLY 10 slides. No exceptions. 30-point font minimum mentality — if it does not fit in 3 bullets, cut it.',
      'Slide 1 must be a one-line pitch that a VC can repeat from memory.',
      'Market size slide MUST include TAM/SAM/SOM with specific dollar amounts and sources.',
      'Traction slide MUST lead with the single most impressive metric in ### heading format.',
      'The Ask slide MUST specify exact funding amount, use of funds breakdown, and timeline.',
      'Every slide title MUST contain a number or a concrete claim. No topic labels.',
      'Competitive analysis MUST be a 2D positioning matrix table, not a feature checklist.',
    ],
    qualityGates: [
      {
        agent: 'narrative',
        threshold: 0.75,
        extraRules: [
          'Verify TAM/SAM/SOM slide exists with specific dollar figures.',
          'Verify The Ask slide specifies exact funding amount and use of funds.',
          'Flag if any slide title is a topic label instead of a claim.',
        ],
      },
      {
        agent: 'fact_check',
        threshold: 0.8,
        extraRules: [
          'Every market size claim MUST cite a specific source and year.',
          'Revenue/traction numbers must be internally consistent across slides.',
        ],
      },
    ],
    slideTypeDistribution: [
      {
        slideType: 'DATA_METRICS',
        min: 3,
        description: 'Market size, traction, financials',
      },
      {
        slideType: 'COMPARISON',
        min: 1,
        description: 'Competitive positioning matrix',
      },
      {
        slideType: 'TEAM',
        min: 1,
        description: 'Founders and key leadership',
      },
      {
        slideType: 'METRICS_HIGHLIGHT',
        min: 1,
        description: 'Key traction numbers',
      },
    ],
    antiPatterns: [
      'NEVER use more than 10 slides.',
      'NEVER include an agenda or table of contents slide.',
      'NEVER use vague market claims without dollar amounts ("large market" -> "$12B TAM").',
      'NEVER list features without mapping them to investor-relevant outcomes.',
      'NEVER end without a specific ask amount and timeline.',
    ],
  },

  // ── 2. SALES_DECK ─────────────────────────────────────────
  {
    id: 'SALES_DECK',
    name: 'Sales Deck',
    description:
      'StoryBrand-inspired. Position customer as hero, your product as guide. Emotional + proof.',
    bookSources: [
      'Building a StoryBrand (Donald Miller)',
      'The Challenger Sale (Dixon & Adamson)',
    ],
    defaultFrameworks: ['PAS', 'BAB'],
    defaultThemes: ['pitchable-dark', 'corporate-blue', 'stripe-fintech'],
    defaultTone: 'CONVERSATIONAL',
    defaultAudience: 'CUSTOMERS',
    defaultGoal: 'SELL_PRODUCT',
    densityProfile: {
      maxBulletsPerSlide: 4,
      maxWordsPerSlide: 45,
      maxTableRows: 4,
      maxConceptsPerSlide: 1,
      maxNestedListDepth: 1,
    },
    slideRange: { min: 10, max: 14 },
    narrativeRules: [
      'The customer is the HERO. Your company is the GUIDE. Never position yourself as the protagonist.',
      "Open with the customer's world, not your company story. First 3 slides: their pain.",
      'Agitate phase (Problem -> emotional impact -> cost of inaction) must be 30-40% of slides.',
      'Every feature slide must answer: "So what does this mean for the customer?"',
      'Include at least one customer testimonial or case study with specific metrics.',
      'CTA must offer a low-friction next step (free trial, demo, pilot) not a commitment.',
      'Use "you" and "your" at least 3x more than "we" and "our" across all slides.',
    ],
    qualityGates: [
      {
        agent: 'style',
        extraRules: [
          'Flag any slide that uses "we" or "our" more than "you" or "your".',
          'Flag feature lists that lack customer outcome mapping.',
        ],
      },
      {
        agent: 'narrative',
        extraRules: [
          'Verify the Problem -> Agitate -> Solve arc is intact.',
          'Verify at least one proof/testimonial slide exists.',
          'Flag if the deck opens with company history instead of customer pain.',
        ],
      },
    ],
    slideTypeDistribution: [
      {
        slideType: 'PROBLEM',
        min: 2,
        description: 'Customer pain + cost of inaction',
      },
      {
        slideType: 'SOLUTION',
        min: 1,
        description: 'Product as the bridge',
      },
      {
        slideType: 'QUOTE',
        min: 1,
        description: 'Customer testimonial',
      },
      {
        slideType: 'FEATURE_GRID',
        min: 1,
        description: 'Product capabilities',
      },
    ],
    antiPatterns: [
      'NEVER open with your company founding story or "About Us".',
      'NEVER list features without mapping to customer outcomes.',
      'NEVER use "we are the leader in..." positioning — show, do not claim.',
      'NEVER end with "Questions?" — end with a specific, low-friction CTA.',
    ],
  },

  // ── 3. STRATEGY_BRIEF ─────────────────────────────────────
  {
    id: 'STRATEGY_BRIEF',
    name: 'Strategy Brief',
    description:
      'Minto Pyramid answer-first structure. MECE-validated, executive-grade.',
    bookSources: [
      'The Pyramid Principle (Barbara Minto)',
      'The McKinsey Way (Ethan Rasiel)',
    ],
    defaultFrameworks: ['MINTO_PYRAMID', 'MCKINSEY_SCR'],
    defaultThemes: ['mckinsey-executive', 'bcg-strategy', 'light-minimal'],
    defaultTone: 'ANALYTICAL',
    defaultAudience: 'EXECUTIVES',
    defaultGoal: 'GET_BUYIN',
    densityProfile: {
      maxBulletsPerSlide: 4,
      maxWordsPerSlide: 60,
      maxTableRows: 5,
      maxConceptsPerSlide: 1,
      maxNestedListDepth: 1,
    },
    slideRange: { min: 8, max: 12 },
    narrativeRules: [
      'ANSWER FIRST: The recommendation must appear on slide 2 or 3, not buried at the end.',
      'Every slide title MUST be a complete action sentence (subject + verb + object). No topic labels.',
      'Structure supporting arguments in groups of 3 (MECE: Mutually Exclusive, Collectively Exhaustive).',
      'Data slides must include "Source: [Name], [Year]" and "Exhibit N:" numbering.',
      'Resolution/recommendation section must be 60-70% of all slides.',
      'No adjective without a number: "significant growth" is banned. Use "42% growth".',
      'Situation and Complication combined: max 2 slides. Get to the answer fast.',
    ],
    qualityGates: [
      {
        agent: 'style',
        threshold: 0.8,
        extraRules: [
          'Every title MUST be an action sentence with a verb. Flag topic labels as errors.',
          'Bold ONLY numbers and company names. No decorative emphasis.',
          'Every data slide must end with "Source: [Name], [Year]".',
        ],
      },
      {
        agent: 'narrative',
        threshold: 0.75,
        extraRules: [
          'Verify the recommendation appears by slide 3.',
          'Verify supporting arguments are grouped in threes.',
          'Flag if Situation + Complication exceed 2 slides.',
        ],
      },
    ],
    slideTypeDistribution: [
      {
        slideType: 'DATA_METRICS',
        min: 3,
        description: 'Evidence tables with source citations',
      },
      {
        slideType: 'PROCESS',
        min: 1,
        description: 'Implementation timeline',
      },
    ],
    antiPatterns: [
      'NEVER bury the recommendation at the end. Answer-first or audience-first.',
      'NEVER use a topic label as a title ("Market Overview" -> "Addressable market reaches $12B by 2028").',
      'NEVER present data without source citations.',
      'NEVER use adjectives without backing numbers.',
      'NEVER include decorative images — consulting decks are text and data only.',
    ],
  },

  // ── 4. KEYNOTE ─────────────────────────────────────────────
  {
    id: 'KEYNOTE',
    name: 'Keynote',
    description:
      'Duarte Resonate sparkline + TED principles. Story-driven with a jaw-dropping moment.',
    bookSources: [
      'Resonate (Nancy Duarte)',
      'Talk Like TED (Carmine Gallo)',
      'Presentation Zen (Garr Reynolds)',
    ],
    defaultFrameworks: ['RESONATE', 'TALK_LIKE_TED'],
    defaultThemes: ['ted-talk', 'apple-keynote', 'creative-warm'],
    defaultTone: 'INSPIRATIONAL',
    defaultAudience: 'CONFERENCE',
    defaultGoal: 'INSPIRE',
    densityProfile: {
      maxBulletsPerSlide: 3,
      maxWordsPerSlide: 30,
      maxTableRows: 3,
      maxConceptsPerSlide: 1,
      maxNestedListDepth: 1,
    },
    slideRange: { min: 12, max: 18 },
    narrativeRules: [
      '65% stories, 25% data, 10% CTA. Open with a personal or customer story, not a fact.',
      'Oscillate between "what is" and "what could be" to create contrast throughout the middle.',
      'One JAW-DROPPING MOMENT is required: a single slide so compelling it becomes the soundbite. Tag it with ### in the key takeaway.',
      'Maximum 30 words per slide. Let images and whitespace do the work.',
      'Every third slide should use a full-bleed image or visual metaphor.',
      'Close with a vision story about the future, then a specific call to action.',
      'Speaker notes carry the substance. Slides carry the emotion.',
    ],
    qualityGates: [
      {
        agent: 'narrative',
        threshold: 0.7,
        extraRules: [
          'Verify the "what is" / "what could be" oscillation pattern.',
          'Verify at least one jaw-dropping moment slide exists.',
          'Flag if any slide exceeds 30 words.',
          'Verify the deck opens with a story, not a fact dump.',
        ],
      },
      {
        agent: 'style',
        extraRules: [
          'Image prompts must be vivid and emotional, not corporate stock.',
          'Flag slides with more than 3 bullets — keynotes need minimal text.',
        ],
      },
    ],
    slideTypeDistribution: [
      {
        slideType: 'QUOTE',
        min: 1,
        description: 'Memorable quote or soundbite',
      },
      {
        slideType: 'SECTION_DIVIDER',
        min: 2,
        description: 'Act breaks',
      },
    ],
    antiPatterns: [
      'NEVER open with an agenda slide or "Today I will talk about...".',
      'NEVER exceed 30 words on any slide.',
      'NEVER use corporate stock photo language in image prompts.',
      'NEVER skip the jaw-dropping moment — every keynote needs one.',
      'NEVER use nested bullet lists. Keep it flat and visual.',
    ],
  },

  // ── 5. PRODUCT_LAUNCH ─────────────────────────────────────
  {
    id: 'PRODUCT_LAUNCH',
    name: 'Product Launch',
    description:
      "Steve Jobs antagonist-to-hero arc. Rule of Three. Apple-style minimal.",
    bookSources: [
      'The Presentation Secrets of Steve Jobs (Carmine Gallo)',
      'Made to Stick (Heath brothers)',
    ],
    defaultFrameworks: ['HEROS_JOURNEY', 'PAS'],
    defaultThemes: ['apple-keynote', 'pitchable-dark', 'stripe-fintech'],
    defaultTone: 'BOLD',
    defaultAudience: 'CUSTOMERS',
    defaultGoal: 'SELL_PRODUCT',
    densityProfile: {
      maxBulletsPerSlide: 3,
      maxWordsPerSlide: 35,
      maxTableRows: 3,
      maxConceptsPerSlide: 1,
      maxNestedListDepth: 1,
    },
    slideRange: { min: 12, max: 16 },
    narrativeRules: [
      'Open with the ANTAGONIST: the pain, the frustration, the enemy. Make the audience feel it.',
      'Introduce the product as the HERO that defeats the antagonist. Delay the reveal for tension.',
      'RULE OF THREE: Group all features/benefits into exactly 3 pillars. Never 4, never 5.',
      'One idea per slide. One image per slide. One takeaway per slide. Steve Jobs minimal.',
      'Demo or "how it works" section is MANDATORY — show, do not tell.',
      'Use superlatives sparingly but boldly: "the fastest", "the first", "the only".',
      'End with availability, pricing (if applicable), and one bold closing statement.',
    ],
    qualityGates: [
      {
        agent: 'narrative',
        extraRules: [
          'Verify the antagonist -> hero arc structure.',
          'Verify features are grouped in threes.',
          'Verify a demo/how-it-works section exists.',
        ],
      },
      {
        agent: 'style',
        extraRules: [
          'Flag slides with more than 35 words — Apple-style demands minimal text.',
          'Image prompts should specify product-focused, dark/clean aesthetic.',
        ],
      },
    ],
    slideTypeDistribution: [
      {
        slideType: 'PROBLEM',
        min: 2,
        description: 'The antagonist / pain',
      },
      {
        slideType: 'SOLUTION',
        min: 2,
        description: 'The hero product',
      },
      {
        slideType: 'PROCESS',
        min: 1,
        description: 'Demo / how it works',
      },
      {
        slideType: 'FEATURE_GRID',
        min: 1,
        description: 'Feature pillars',
      },
    ],
    antiPatterns: [
      'NEVER start with the product. Start with the problem it solves.',
      'NEVER list more than 3 feature pillars. Group ruthlessly.',
      'NEVER show a slide with both text and a table. Choose one.',
      'NEVER use "also" or "additionally" — each feature pillar stands alone.',
    ],
  },

  // ── 6. BOARD_UPDATE ────────────────────────────────────────
  {
    id: 'BOARD_UPDATE',
    name: 'Board Update',
    description:
      'What/So What/Now What. Data-dense. Executive summary upfront.',
    bookSources: [
      'The McKinsey Way (Ethan Rasiel)',
      'Measure What Matters (John Doerr)',
    ],
    defaultFrameworks: ['WHAT_SO_WHAT_NOW_WHAT', 'MINTO_PYRAMID'],
    defaultThemes: ['mckinsey-executive', 'dark-professional', 'bcg-strategy'],
    defaultTone: 'FORMAL',
    defaultAudience: 'BOARD',
    defaultGoal: 'REPORT_RESULTS',
    densityProfile: {
      maxBulletsPerSlide: 5,
      maxWordsPerSlide: 70,
      maxTableRows: 6,
      maxConceptsPerSlide: 1,
      maxNestedListDepth: 1,
    },
    slideRange: { min: 10, max: 14 },
    narrativeRules: [
      "EXECUTIVE SUMMARY on slide 2: 3-5 bullet points covering the entire deck's key takeaways.",
      'What section (30%): Pure data. KPIs, financials, OKRs. Tables with period-over-period comparison.',
      'So What section (30%): Implications. What does the data mean for strategy, risk, and opportunity?',
      'Now What section (40%): Decisions needed. Be specific: "Approve $2M for Q3 expansion."',
      'Every data table must include YoY or QoQ comparison columns.',
      'Red/yellow/green status indicators for KPIs when possible (use accent colors).',
      'Board members scan, not read. Lead every slide with the headline takeaway.',
    ],
    qualityGates: [
      {
        agent: 'narrative',
        threshold: 0.7,
        extraRules: [
          'Verify executive summary slide exists by slide 2.',
          'Verify What/So What/Now What structure with ~30/30/40 balance.',
          'Verify Now What section contains specific decision requests.',
        ],
      },
      {
        agent: 'fact_check',
        threshold: 0.8,
        extraRules: [
          'KPI numbers must be internally consistent across slides.',
          'Period comparisons must use matching timeframes.',
        ],
      },
    ],
    slideTypeDistribution: [
      {
        slideType: 'DATA_METRICS',
        min: 4,
        description: 'KPIs, financials, OKRs with comparisons',
      },
      {
        slideType: 'CTA',
        min: 1,
        description: 'Decision requests with specific asks',
      },
      {
        slideType: 'METRICS_HIGHLIGHT',
        min: 1,
        description: 'KPI headlines',
      },
    ],
    antiPatterns: [
      'NEVER bury the executive summary. It goes on slide 2.',
      'NEVER present data without period-over-period comparison.',
      'NEVER end without specific decision requests ("Approve X by Y date").',
      'NEVER use vague implications ("results are encouraging" -> "18% growth exceeds 12% target by 50%").',
    ],
  },

  // ── 7. TECHNICAL_DEEP_DIVE ─────────────────────────────────
  {
    id: 'TECHNICAL_DEEP_DIVE',
    name: 'Technical Deep Dive',
    description:
      'STAR framework. Architecture-heavy. Code/benchmark-ready.',
    bookSources: [
      'The Pragmatic Programmer (Hunt & Thomas)',
      'Designing Data-Intensive Applications (Kleppmann)',
    ],
    defaultFrameworks: ['STAR', 'WHAT_SO_WHAT_NOW_WHAT'],
    defaultThemes: ['technical-teal', 'stripe-fintech', 'academic-research'],
    defaultTone: 'ANALYTICAL',
    defaultAudience: 'TECHNICAL',
    defaultGoal: 'EDUCATE',
    densityProfile: {
      maxBulletsPerSlide: 5,
      maxWordsPerSlide: 65,
      maxTableRows: 5,
      maxConceptsPerSlide: 1,
      maxNestedListDepth: 2,
    },
    slideRange: { min: 12, max: 18 },
    narrativeRules: [
      'Open with the problem/motivation in technical terms. Assume domain expertise.',
      'Architecture slides must describe system layers with specific technology names.',
      'Include at least one benchmark/performance comparison table with exact numbers.',
      'Code examples belong in speaker notes, not on slides. Reference them by name.',
      'Each deep-dive slide should cover one component of the system — never two.',
      'Trade-off analysis is valued: show what was considered AND rejected, with reasons.',
      'Close with adoption path: how to get started, prerequisites, and documentation links.',
    ],
    qualityGates: [
      {
        agent: 'narrative',
        extraRules: [
          'Verify at least one ARCHITECTURE slide exists.',
          'Verify benchmark/performance data is present.',
          'Verify adoption/getting-started section exists in closing slides.',
        ],
      },
      {
        agent: 'style',
        extraRules: [
          'Technical jargon is expected and welcome. Do not flag acronyms.',
          'Architecture slides should have imagePromptHint for system diagrams.',
        ],
      },
    ],
    slideTypeDistribution: [
      {
        slideType: 'ARCHITECTURE',
        min: 2,
        description: 'System diagrams and layer descriptions',
      },
      {
        slideType: 'DATA_METRICS',
        min: 2,
        description: 'Benchmarks and performance data',
      },
      {
        slideType: 'PROCESS',
        min: 1,
        description: 'Getting started / adoption path',
      },
      {
        slideType: 'FEATURE_GRID',
        min: 1,
        description: 'Key capabilities overview',
      },
      {
        slideType: 'SECTION_DIVIDER',
        min: 2,
        description: 'Section breaks between deep-dive topics',
      },
    ],
    antiPatterns: [
      'NEVER oversimplify for non-technical audiences. This is a deep dive.',
      'NEVER put code on slides. Put it in speaker notes and reference it.',
      'NEVER skip the "why" — always explain motivation before architecture.',
      'NEVER present benchmarks without specifying conditions (hardware, dataset size, methodology).',
    ],
  },

  // ── 8. CULTURE_DECK ────────────────────────────────────────
  {
    id: 'CULTURE_DECK',
    name: 'Culture Deck',
    description:
      "Pixar Story Spine + Hero's Journey. Photo-rich. Values-driven.",
    bookSources: [
      'Creativity Inc (Ed Catmull)',
      'Powerful (Patty McCord)',
      'No Rules Rules (Hastings & Meyer)',
    ],
    defaultFrameworks: ['PIXAR_PITCH', 'HEROS_JOURNEY'],
    defaultThemes: ['airbnb-story', 'creative-warm', 'ted-talk'],
    defaultTone: 'STORYTELLING',
    defaultAudience: 'TEAM',
    defaultGoal: 'INSPIRE',
    densityProfile: {
      maxBulletsPerSlide: 3,
      maxWordsPerSlide: 30,
      maxTableRows: 3,
      maxConceptsPerSlide: 1,
      maxNestedListDepth: 1,
    },
    slideRange: { min: 14, max: 20 },
    narrativeRules: [
      'Every value must be illustrated with a REAL story from the company, not a generic statement.',
      'Use the Pixar "Once upon a time... Every day... Until one day..." structure for company origin.',
      'Photo-rich: at least every other slide should have an imagePromptHint for team/culture imagery.',
      'Values slides: one value per slide. Title is the value, body is the story proving it.',
      'Include "what we expect from you" section — make culture actionable, not just aspirational.',
      'Close with how to live these values daily — specific behaviors, not platitudes.',
      'Tone: authentic, warm, human. Use first names and real anecdotes.',
    ],
    qualityGates: [
      {
        agent: 'narrative',
        extraRules: [
          'Verify each value is paired with a specific illustrative story.',
          'Verify the "what we expect" section exists.',
          'Flag generic value statements without backing stories.',
        ],
      },
      {
        agent: 'style',
        extraRules: [
          'At least 50% of slides must have non-empty imagePromptHint.',
          'Image prompts should evoke warm, human, team-oriented scenes.',
          'Flag corporate stock photo language ("business team meeting in conference room").',
        ],
      },
    ],
    slideTypeDistribution: [
      {
        slideType: 'QUOTE',
        min: 2,
        description: 'Team member quotes embodying values',
      },
    ],
    antiPatterns: [
      'NEVER list values as bullet points without stories. Each value is its own slide.',
      'NEVER use corporate jargon ("synergy", "leverage", "optimize"). Use human language.',
      'NEVER skip the "what we expect" section — culture without expectations is decoration.',
      'NEVER use fewer than 14 slides. Culture decks need breathing room.',
    ],
  },

  // ── 9. TRAINING_WORKSHOP ───────────────────────────────────
  {
    id: 'TRAINING_WORKSHOP',
    name: 'Training Workshop',
    description:
      'Beyond Bullet Points three-act structure. Interactive. Learning-objective-driven.',
    bookSources: [
      'Beyond Bullet Points (Cliff Atkinson)',
      'Design for How People Learn (Julie Dirksen)',
    ],
    defaultFrameworks: ['BAB', 'STAR'],
    defaultThemes: ['z4-dark-premium', 'corporate-blue', 'light-minimal'],
    defaultTone: 'CONVERSATIONAL',
    defaultAudience: 'TEAM',
    defaultGoal: 'EDUCATE',
    densityProfile: {
      maxBulletsPerSlide: 5,
      maxWordsPerSlide: 55,
      maxTableRows: 4,
      maxConceptsPerSlide: 1,
      maxNestedListDepth: 2,
    },
    slideRange: { min: 14, max: 22 },
    narrativeRules: [
      'Open with learning objectives: "By the end of this session, you will be able to..." (3 max).',
      'Three-act structure: Act 1 = Setup/Context, Act 2 = Confrontation/Learning, Act 3 = Resolution/Practice.',
      'Act 2 should be 60% of slides — this is where teaching happens.',
      'Include checkpoint/recap slides every 5-6 slides to reinforce key concepts.',
      'Each concept slide should pair theory with a practical example.',
      'Close with a hands-on exercise prompt or next-steps checklist.',
      'Speaker notes must include facilitator instructions: timing, discussion prompts, exercise setup.',
    ],
    qualityGates: [
      {
        agent: 'narrative',
        extraRules: [
          'Verify learning objectives slide exists in the first 2 slides.',
          'Verify at least 2 checkpoint/recap slides exist.',
          'Verify closing includes practical exercise or next steps.',
        ],
      },
    ],
    slideTypeDistribution: [
      {
        slideType: 'PROCESS',
        min: 2,
        description: 'Step-by-step learning workflows',
      },
      {
        slideType: 'COMPARISON',
        min: 1,
        description: 'Before/after or good/bad examples',
      },
      {
        slideType: 'CONTENT',
        min: 3,
        description: 'Theory + example pairs',
      },
      {
        slideType: 'SECTION_DIVIDER',
        min: 2,
        description: 'Module separators',
      },
      {
        slideType: 'TIMELINE',
        min: 1,
        description: 'Learning path',
      },
    ],
    antiPatterns: [
      'NEVER start without learning objectives. The audience needs to know what they will gain.',
      'NEVER present theory without a practical example on the same or next slide.',
      'NEVER exceed 6 slides without a checkpoint/recap.',
      'NEVER end without a hands-on exercise or action checklist.',
    ],
  },

  // ── 10. CASE_STUDY ─────────────────────────────────────────
  {
    id: 'CASE_STUDY',
    name: 'Case Study',
    description:
      'STAR + Before-After-Bridge. Proof-centric. Quantified outcomes.',
    bookSources: [
      'The Case Study Handbook (William Ellet)',
      'Storynomics (Robert McKee)',
    ],
    defaultFrameworks: ['STAR', 'BAB'],
    defaultThemes: ['corporate-blue', 'light-minimal', 'sequoia-capital'],
    defaultTone: 'ANALYTICAL',
    defaultAudience: 'CUSTOMERS',
    defaultGoal: 'SELL_PRODUCT',
    densityProfile: {
      maxBulletsPerSlide: 4,
      maxWordsPerSlide: 55,
      maxTableRows: 5,
      maxConceptsPerSlide: 1,
      maxNestedListDepth: 1,
    },
    slideRange: { min: 8, max: 12 },
    narrativeRules: [
      'Open with the customer name, industry, and challenge in one slide. Make the protagonist clear.',
      'Before state must include specific pain metrics: cost, time, error rate, etc.',
      'After state must mirror Before metrics with improved numbers. Same units, same format.',
      'The bridge (solution) section must explain WHAT was implemented AND how long it took.',
      'Include at least one direct customer quote with attribution.',
      'Close with "Results at a Glance" summary table: metric, before, after, improvement %.',
      'Every outcome claim must include the timeframe ("within 6 months", "after 90 days").',
    ],
    qualityGates: [
      {
        agent: 'narrative',
        extraRules: [
          'Verify Before metrics are mirrored in After metrics (same units).',
          'Verify a "Results at a Glance" summary exists.',
          'Verify at least one customer quote is present.',
        ],
      },
      {
        agent: 'fact_check',
        threshold: 0.85,
        extraRules: [
          'Case study numbers must be internally consistent (before vs. after vs. improvement %).',
          'Timeline claims must be specific, not vague ("recently" -> "in Q3 2024").',
        ],
      },
    ],
    slideTypeDistribution: [
      {
        slideType: 'COMPARISON',
        min: 1,
        description: 'Before/After results table',
      },
      {
        slideType: 'DATA_METRICS',
        min: 2,
        description: 'Quantified outcomes and summary',
      },
      {
        slideType: 'QUOTE',
        min: 1,
        description: 'Customer testimonial',
      },
      {
        slideType: 'METRICS_HIGHLIGHT',
        min: 1,
        description: 'Results at a glance',
      },
    ],
    antiPatterns: [
      'NEVER present results without Before state comparison.',
      'NEVER use vague outcomes ("improved performance" -> "reduced latency by 73% from 1.2s to 0.3s").',
      'NEVER skip the timeline — when was this achieved?',
      'NEVER end without a summary results table.',
    ],
  },
];

// ── Lookup Functions ────────────────────────────────────────

export function getArchetypeConfig(
  id: DeckArchetype,
): DeckArchetypeConfig | undefined {
  return DECK_ARCHETYPES.find((a) => a.id === id);
}

export function getAllArchetypes(): DeckArchetypeConfig[] {
  return DECK_ARCHETYPES;
}
