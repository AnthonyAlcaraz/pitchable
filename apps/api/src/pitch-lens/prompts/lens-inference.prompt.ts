import { STORY_FRAMEWORKS } from '../frameworks/story-frameworks.config.js';

/**
 * Build the system prompt for agentic Pitch Lens inference.
 * The LLM analyzes KB content to recommend the optimal narrative framework,
 * audience type, tone, and slide structure.
 */
export function buildLensInferenceSystemPrompt(): string {
  // Build compact framework reference for the LLM
  const frameworkRef = STORY_FRAMEWORKS.map((f) => {
    return `- ${f.id} ("${f.name}"): ${f.shortDescription} Best for: ${f.bestFor.join(', ')}. Goals: ${f.bestForGoals.join(', ')}. Slides: ${f.idealSlideRange.min}-${f.idealSlideRange.max}.`;
  }).join('\n');

  return `You are Pitchable's Narrative Strategist. Analyze the knowledge base content and topic to recommend the optimal presentation strategy.

YOUR TASK:
1. Analyze the KB content — extract themes, entities, data density, vocabulary patterns
2. Detect the most likely audience from KB vocabulary and topic context
3. Score each storytelling framework against the KB content fit
4. Map KB themes to framework phases
5. Identify gaps — framework phases with no KB support

FRAMEWORK SCORING CRITERIA:
- Data-heavy KB (lots of metrics, KPIs, financials) → Minto Pyramid, STAR, McKinsey SCR
- Story-heavy KB (case studies, testimonials, journeys) → Hero's Journey, Pixar Pitch, Resonate
- Problem-centric KB (pain points, costs, inefficiencies) → PAS, BAB
- Investor-focused KB (traction, market size, team bios) → POPP, Kawasaki 10/20/30
- Executive briefing KB (recommendations, results, next steps) → What/So What/Now What, McKinsey SCR

AUDIENCE DETECTION SIGNALS:
- Financial terms (ARR, MRR, burn rate, runway) → INVESTORS
- Technical jargon (API, microservices, latency) → TECHNICAL
- Business metrics (ROI, TCO, market share) → EXECUTIVES or BOARD
- Customer stories, use cases → CUSTOMERS
- Team culture, vision → TEAM or CONFERENCE

AVAILABLE FRAMEWORKS:
${frameworkRef}

OUTPUT FORMAT:
Respond with valid JSON matching this exact schema:
{
  "recommendedLens": {
    "audienceType": "INVESTORS | CUSTOMERS | EXECUTIVES | BOARD | TEAM | CONFERENCE | TECHNICAL",
    "pitchGoal": "RAISE_FUNDING | SELL_PRODUCT | GET_BUYIN | REPORT_RESULTS | INSPIRE | EDUCATE",
    "industry": "detected industry string",
    "companyStage": "IDEA | MVP | GROWTH | ENTERPRISE",
    "toneStyle": "FORMAL | CONVERSATIONAL | BOLD | INSPIRATIONAL | ANALYTICAL | STORYTELLING",
    "technicalLevel": "NON_TECHNICAL | SEMI_TECHNICAL | TECHNICAL | HIGHLY_TECHNICAL",
    "selectedFramework": "framework ID from list above",
    "reasoning": "2-3 sentences explaining why this framework fits the KB content"
  },
  "alternativeFrameworks": [
    {
      "frameworkId": "second best framework ID",
      "reasoning": "why this is the runner-up"
    }
  ],
  "narrativeStructure": {
    "suggestedSlides": ["Title", "Slide 2 title", "..."],
    "kbThemes": ["theme1", "theme2", "theme3"],
    "dataRichAreas": ["area with strong KB data support"],
    "narrativeGaps": ["framework phases lacking KB content"]
  }
}

Only output JSON. No markdown fences, no explanation.`;
}

/**
 * Build the user prompt with KB content and topic for inference.
 */
export function buildLensInferenceUserPrompt(
  topic: string,
  kbContent: string,
  audienceHint?: string,
): string {
  const parts = [`Analyze the following and recommend the best presentation strategy.`];
  parts.push(`\nTOPIC: ${topic}`);

  if (audienceHint) {
    parts.push(`AUDIENCE HINT (from user): ${audienceHint}`);
  }

  if (kbContent) {
    parts.push(`\nKNOWLEDGE BASE CONTENT (analyze this for themes, data density, and narrative fit):\n${kbContent}`);
  } else {
    parts.push(`\nNo knowledge base content available. Infer the best strategy from the topic alone.`);
  }

  return parts.join('\n');
}
