import type {
  AudienceType,
  PitchGoal,
  StoryFramework,
} from '../../../generated/prisma/enums.js';

export interface StoryFrameworkConfig {
  id: StoryFramework;
  name: string;
  shortDescription: string;
  detailedGuidance: string;
  slideStructure: string[];
  bestFor: AudienceType[];
  bestForGoals: PitchGoal[];
  idealSlideRange: { min: number; max: number };
}

export const STORY_FRAMEWORKS: StoryFrameworkConfig[] = [
  {
    id: 'HEROS_JOURNEY',
    name: "Hero's Journey",
    shortDescription:
      'Position the customer as the hero and your product as the mentor guiding them to transformation.',
    detailedGuidance: `Structure the presentation as a Hero's Journey narrative:
1. THE ORDINARY WORLD: Show the audience's current reality — their daily struggles, the status quo they accept as normal.
2. THE CALL TO ADVENTURE: Present the opportunity or problem that demands change. Make it feel urgent.
3. THE MENTOR (your product/company): Introduce yourself as the guide who has the solution. You are not the hero — the customer is.
4. THE TRIALS: Show the challenges of the journey and how your solution addresses each one with specific capabilities.
5. THE TRANSFORMATION: Paint a vivid picture of success — what life looks like after adoption. Use metrics and outcomes.
6. THE RETURN: Concrete next steps, the ask, how to begin the journey today.

Tone: Build emotional connection. Use "you" and "your" frequently. Frame every feature as a benefit to the hero (the audience). Tell stories of real transformations when possible.`,
    slideStructure: [
      'Hook / Title',
      'The Ordinary World (Status Quo)',
      'The Call to Adventure (Problem)',
      'Meeting the Mentor (Your Solution)',
      'Trials & Challenges',
      'The Solution in Action',
      'The Transformation (Results)',
      'Social Proof',
      'The Return / Call to Action',
    ],
    bestFor: ['INVESTORS', 'CUSTOMERS'],
    bestForGoals: ['RAISE_FUNDING', 'SELL_PRODUCT', 'INSPIRE'],
    idealSlideRange: { min: 10, max: 14 },
  },
  {
    id: 'MINTO_PYRAMID',
    name: 'Minto Pyramid (SCQA)',
    shortDescription:
      'Start with the answer, then support with structured logic. Executive-friendly, efficiency-first.',
    detailedGuidance: `Structure the presentation using the Minto Pyramid Principle:
1. SITUATION: Establish the context everyone accepts as fact. Brief — 1 slide maximum.
2. COMPLICATION: Explain the dilemma or challenge. Why does the situation require action now?
3. QUESTION: Frame the key question that needs resolution (implicit or explicit).
4. ANSWER: Present your recommendation at the TOP. This is the most important slide.
5. SUPPORTING ARGUMENTS: 3 key reasons supporting your answer, each with evidence beneath.

Critical rule: Think bottom-up, present top-down. Lead with the conclusion. Busy executives get the recommendation immediately, then can dig into supporting logic. Keep Situation and Complication brief — the audience cares most about the Answer.`,
    slideStructure: [
      'Title / Executive Summary',
      'Situation (Context)',
      'Complication (Challenge)',
      'Recommendation (Answer)',
      'Supporting Argument 1 + Evidence',
      'Supporting Argument 2 + Evidence',
      'Supporting Argument 3 + Evidence',
      'Implementation / Next Steps',
    ],
    bestFor: ['EXECUTIVES', 'BOARD', 'TECHNICAL'],
    bestForGoals: ['GET_BUYIN', 'REPORT_RESULTS', 'EDUCATE'],
    idealSlideRange: { min: 8, max: 12 },
  },
  {
    id: 'RESONATE',
    name: "Duarte's Resonate",
    shortDescription:
      'Oscillate between "what is" and "what could be" to create contrast and drive transformation.',
    detailedGuidance: `Structure the presentation using Nancy Duarte's Resonate framework:
1. WHAT IS (Today): Start with the current reality. Be honest about the status quo.
2. WHAT COULD BE (Tomorrow): Paint the picture of a better future. Create desire.
3. OSCILLATE: Alternate between current pain and future possibility throughout the middle slides. Each oscillation builds tension and urgency.
4. NEW BLISS: End with the transformed future state. Make it concrete and achievable.

The audience is the hero, the presenter is the mentor. Create a "star moment" — one slide or point that is so compelling it becomes the thing people remember and share. Use contrast as your primary tool: dark/light, problem/solution, before/after.`,
    slideStructure: [
      'Title / Opening Hook',
      'What Is (Current Reality)',
      'What Could Be (Vision)',
      'Gap Analysis (Why Change)',
      'What Is (Deeper Pain)',
      'What Could Be (Specific Benefits)',
      'The Path Forward',
      'Star Moment (Key Insight)',
      'New Bliss / Call to Action',
    ],
    bestFor: ['TEAM', 'CONFERENCE', 'CUSTOMERS'],
    bestForGoals: ['INSPIRE', 'GET_BUYIN', 'SELL_PRODUCT'],
    idealSlideRange: { min: 10, max: 16 },
  },
  {
    id: 'PAS',
    name: 'Problem-Agitate-Solve',
    shortDescription:
      'Identify the pain, dig into its emotional impact, then present your solution as the direct answer.',
    detailedGuidance: `Structure the presentation using Problem-Agitate-Solve:
1. PROBLEM: Identify the specific pain point the audience faces. Be precise — vague problems feel ignorable.
2. AGITATE: This is the critical step most presenters skip. Dig into the emotional and practical impact of the problem. Show the cost of inaction — lost revenue, wasted time, frustrated customers, competitive disadvantage. Make the problem feel urgent and personal.
3. SOLVE: Present your solution as the direct answer to the agitated problem. Every feature you mention should map back to a specific pain from the Agitate phase.

The Agitate phase should take 30-40% of total slides. Without it, the Solution feels premature. With it, the audience is primed to receive your answer.`,
    slideStructure: [
      'Title / Hook',
      'The Problem (What Hurts)',
      'Agitate: Impact on Revenue',
      'Agitate: Impact on Team/Customers',
      'Agitate: Cost of Inaction',
      'The Solution (Your Answer)',
      'How It Works',
      'Results / Proof',
      'Call to Action',
    ],
    bestFor: ['CUSTOMERS', 'INVESTORS'],
    bestForGoals: ['SELL_PRODUCT', 'RAISE_FUNDING'],
    idealSlideRange: { min: 8, max: 12 },
  },
  {
    id: 'BAB',
    name: 'Before-After-Bridge',
    shortDescription:
      'Show the current struggle, paint the solved future, then reveal your offer as the bridge.',
    detailedGuidance: `Structure the presentation using Before-After-Bridge:
1. BEFORE: Paint a vivid picture of the audience's current struggle. Use empathy — show you understand their world deeply. Include specific scenarios, quotes, or data that make the pain tangible.
2. AFTER: Show what life looks like with the problem solved. Focus on both emotional benefits (peace of mind, confidence) and practical outcomes (metrics, efficiency). Make this aspirational but achievable.
3. BRIDGE: Your product or solution is the bridge connecting Before to After. Explain exactly how it works, why it's credible, and what the first step is.

Keep the Before and After sections roughly equal in length. The Bridge can be shorter — the audience already wants to cross it by the time you reveal it.`,
    slideStructure: [
      'Title / Opening',
      'Before: The Current Reality',
      'Before: The Daily Pain',
      'After: The Transformed State',
      'After: Measurable Outcomes',
      'The Bridge (Your Solution)',
      'How It Works',
      'Getting Started / CTA',
    ],
    bestFor: ['CUSTOMERS', 'TEAM'],
    bestForGoals: ['SELL_PRODUCT', 'INSPIRE', 'GET_BUYIN'],
    idealSlideRange: { min: 8, max: 10 },
  },
  {
    id: 'STAR',
    name: 'STAR (Situation-Task-Action-Result)',
    shortDescription:
      'Structured proof through specific situations, tasks, actions, and quantifiable results.',
    detailedGuidance: `Structure the presentation using the STAR framework:
1. SITUATION: Set the context clearly. What was the market landscape, customer environment, or challenge? Be specific about time, scale, and stakeholders.
2. TASK: Define the objective. What needed to be accomplished? Frame it in terms the audience cares about.
3. ACTION: Explain the specific steps taken. This is where your methodology, product, or team shines. Be concrete — avoid hand-waving.
4. RESULT: Share quantifiable outcomes. Revenue impact, time saved, efficiency gained, customer satisfaction scores. Hard numbers build credibility.

Use multiple STAR cycles if presenting several case studies. Each cycle should build on the previous one, showing increasing complexity or impact.`,
    slideStructure: [
      'Title / Overview',
      'Situation (Context & Challenge)',
      'Task (Objective)',
      'Action (What We Did)',
      'Action (How We Did It)',
      'Result (Quantified Outcomes)',
      'Key Takeaways',
      'Next Steps / CTA',
    ],
    bestFor: ['TECHNICAL', 'BOARD', 'CUSTOMERS'],
    bestForGoals: ['REPORT_RESULTS', 'SELL_PRODUCT', 'GET_BUYIN'],
    idealSlideRange: { min: 8, max: 12 },
  },
  {
    id: 'PIXAR_PITCH',
    name: 'Pixar Pitch (Story Spine)',
    shortDescription:
      'Use "Once upon a time... Every day... Until one day..." to create a natural narrative flow.',
    detailedGuidance: `Structure the presentation using the Pixar Story Spine:
1. "Once upon a time..." — Establish the status quo. How does the world work today?
2. "Every day..." — Show the routine that needs disrupting. What does the audience accept as normal?
3. "One day..." — Introduce the catalyst for change. Your innovation, discovery, or product.
4. "Because of that..." — Show the initial effects of your solution. What changes first?
5. "Because of that..." — Show the ripple effects. How does the change compound?
6. "Until finally..." — The end state. The transformed reality.

This framework feels natural because it mirrors how humans tell stories. The "Because of that" repetition shows causality and builds momentum. Each slide should logically lead to the next through cause and effect, not just sequence.`,
    slideStructure: [
      'Title / Hook',
      'Once Upon a Time (Status Quo)',
      'Every Day (The Routine)',
      'One Day (The Catalyst)',
      'Because of That (First Impact)',
      'Because of That (Ripple Effects)',
      'Because of That (Compound Value)',
      'Until Finally (Transformation)',
      'Call to Action',
    ],
    bestFor: ['CONFERENCE', 'TEAM', 'CUSTOMERS'],
    bestForGoals: ['INSPIRE', 'SELL_PRODUCT', 'EDUCATE'],
    idealSlideRange: { min: 8, max: 12 },
  },
  {
    id: 'MCKINSEY_SCR',
    name: 'McKinsey SCR',
    shortDescription:
      'Situation-Complication-Resolution for strategy presentations. Direct, logical, action-oriented.',
    detailedGuidance: `Structure the presentation using McKinsey's SCR framework:
1. SITUATION: Recent context the audience knows and accepts. Keep this brief — 1-2 slides. Do not over-explain what they already know.
2. COMPLICATION: Why the situation requires action. What has changed, what risks exist, what opportunity is being missed. This creates urgency.
3. RESOLUTION: The recommended action. This should occupy the majority of slides because it's what the audience needs to act on.

Ordering options:
- S-C-R (standard): Use when the audience is unlikely to accept the resolution immediately. Build up the case.
- R-S-C (answer-first): Use when the audience will mostly accept the resolution. Lead with it for efficiency.

Keep Situation and Complication concise. The Resolution section should be 60-70% of all slides.`,
    slideStructure: [
      'Title / Executive Summary',
      'Situation (Context)',
      'Complication (Why Act Now)',
      'Resolution: Recommendation',
      'Resolution: Supporting Evidence 1',
      'Resolution: Supporting Evidence 2',
      'Resolution: Implementation Plan',
      'Next Steps / Timeline',
    ],
    bestFor: ['EXECUTIVES', 'BOARD', 'INVESTORS'],
    bestForGoals: ['GET_BUYIN', 'REPORT_RESULTS', 'RAISE_FUNDING'],
    idealSlideRange: { min: 8, max: 12 },
  },
  {
    id: 'POPP',
    name: 'POPP (Problem-Opportunity-Plan-Proof)',
    shortDescription:
      'Address the four key investor questions in logical order: Why care? How big? What plan? Why believe?',
    detailedGuidance: `Structure the presentation using POPP:
1. PROBLEM: Why should the audience care? Define the pain point with data. Show that real people experience this problem at scale.
2. OPPORTUNITY: How big is this? TAM/SAM/SOM for investors. Market growth rate. Timing — why now is the right moment.
3. PLAN: Your execution strategy. Product, go-to-market, team, business model. Show you have a credible path to capture the opportunity.
4. PROOF: Why should they believe you? Traction metrics, customer testimonials, revenue, partnerships, team credentials. Hard evidence over promises.

Each section directly answers an investor's mental question. POPP works because it mirrors the due diligence process — problem validation, market sizing, execution assessment, and evidence review.`,
    slideStructure: [
      'Title / One-Line Pitch',
      'Problem (Pain Point)',
      'Problem (Market Evidence)',
      'Opportunity (Market Size)',
      'Opportunity (Why Now)',
      'Plan (Product)',
      'Plan (Go-to-Market)',
      'Plan (Business Model)',
      'Proof (Traction)',
      'Proof (Team)',
      'The Ask / CTA',
    ],
    bestFor: ['INVESTORS', 'BOARD'],
    bestForGoals: ['RAISE_FUNDING', 'GET_BUYIN'],
    idealSlideRange: { min: 10, max: 14 },
  },
  {
    id: 'KAWASAKI_10_20_30',
    name: 'Kawasaki 10/20/30',
    shortDescription:
      '10 slides, 20 minutes, 30-point font. Forces brutal prioritization and clarity.',
    detailedGuidance: `Structure the presentation using Guy Kawasaki's 10/20/30 Rule:
- EXACTLY 10 slides (no exceptions)
- 20 minutes maximum duration
- 30-point font minimum (forces simplicity — no text walls)

Required slide structure:
1. Title & Hook
2. Problem / Opportunity
3. Value Proposition
4. Underlying Magic (technology/secret sauce)
5. Business Model
6. Go-to-Market Plan
7. Competitive Analysis
8. Management Team
9. Financial Projections & Key Metrics
10. Current Status, Accomplishments, Timeline & Use of Funds

Large fonts prevent text-heavy slides, forcing presenters to tell stories rather than read bullets. Each slide must convey exactly one powerful idea. If you can't fit it in 30pt, you're trying to say too much.`,
    slideStructure: [
      'Title & Hook',
      'Problem / Opportunity',
      'Value Proposition',
      'Underlying Magic',
      'Business Model',
      'Go-to-Market Plan',
      'Competitive Analysis',
      'Management Team',
      'Financial Projections',
      'Status & The Ask',
    ],
    bestFor: ['INVESTORS'],
    bestForGoals: ['RAISE_FUNDING'],
    idealSlideRange: { min: 10, max: 10 },
  },
  {
    id: 'WHAT_SO_WHAT_NOW_WHAT',
    name: 'What / So What / Now What',
    shortDescription:
      'Present facts, explain implications, then drive specific action. Perfect for data-heavy presentations.',
    detailedGuidance: `Structure the presentation using What / So What / Now What:
1. WHAT: Present the facts, data, or situation. Be objective and thorough. Use charts, metrics, and evidence. No editorializing yet.
2. SO WHAT: Explain the implications. Why should the audience care about these facts? What do they mean for the business, team, or strategy? Connect data to outcomes they care about.
3. NOW WHAT: Clear call to action. What should the audience do, think, or decide based on the implications? Be specific — "approve X", "invest in Y", "change Z by date".

Many presentations stop at "What" (data dump) or "So What" (analysis without action). The "Now What" is what makes a presentation valuable — it drives decision-making. Allocate roughly 30% / 30% / 40% of slides to each section.`,
    slideStructure: [
      'Title / Context',
      'What: Key Data Point 1',
      'What: Key Data Point 2',
      'What: Key Data Point 3',
      'So What: Implication 1',
      'So What: Implication 2',
      'Now What: Recommendation',
      'Now What: Implementation Plan',
      'Now What: Timeline & Next Steps',
    ],
    bestFor: ['BOARD', 'EXECUTIVES', 'TECHNICAL'],
    bestForGoals: ['REPORT_RESULTS', 'GET_BUYIN', 'EDUCATE'],
    idealSlideRange: { min: 8, max: 12 },
  },
  {
    id: 'TALK_LIKE_TED',
    name: "Talk Like TED (Gallo's 9 Secrets)",
    shortDescription:
      '65% stories, emotional connection, novel content. Designed for maximum audience engagement.',
    detailedGuidance: `Structure the presentation using Carmine Gallo's Talk Like TED principles:
1. UNLEASH THE MASTER WITHIN: Start with passion. The audience must feel your genuine enthusiasm for the topic.
2. MASTER STORYTELLING: 65% of the best TED talks are stories. Open with a personal story, weave customer stories throughout, close with a vision story.
3. HAVE A CONVERSATION: Avoid presentation mode. Speak naturally as if talking to a friend. Practice until scripted content feels spontaneous.
4. TEACH SOMETHING NEW: Give the audience a "holy shit" moment — a fact, insight, or perspective they've never considered.
5. DELIVER JAW-DROPPING MOMENTS: Create one slide or moment so compelling it becomes the thing people remember and share.
6. LIGHTEN UP: Use humor naturally. It builds rapport and makes complex topics accessible.
7. STICK TO THE 18-MINUTE RULE: Keep it short. Attention declines after 18 minutes.
8. PAINT A MENTAL PICTURE: Use sensory language. Help the audience see, feel, and experience your message.
9. STAY IN YOUR LANE: Be authentic. Don't try to be someone you're not.

Allocate 65% of content to stories (personal, customer, vision), 25% to data/evidence, 10% to calls-to-action.`,
    slideStructure: [
      'Opening Story / Hook',
      'The Big Idea (Novel Insight)',
      'Story: The Origin',
      'Data / Evidence',
      'Story: The Customer',
      'The Jaw-Dropping Moment',
      'Vision for the Future',
      'Call to Action',
    ],
    bestFor: ['CONFERENCE', 'TEAM', 'CUSTOMERS'],
    bestForGoals: ['INSPIRE', 'EDUCATE', 'SELL_PRODUCT'],
    idealSlideRange: { min: 8, max: 12 },
  },
];

/**
 * Get a single framework config by its enum ID.
 */
export function getFrameworkConfig(
  id: StoryFramework,
): StoryFrameworkConfig | undefined {
  return STORY_FRAMEWORKS.find((f) => f.id === id);
}

/**
 * Get all framework configs (for API listing endpoint).
 */
export function getAllFrameworks(): StoryFrameworkConfig[] {
  return STORY_FRAMEWORKS;
}
