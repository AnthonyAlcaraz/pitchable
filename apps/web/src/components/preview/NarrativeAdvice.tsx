import { MessageSquareText, Lightbulb } from 'lucide-react';
import { EditableText } from './EditableText';

const COACHING_TIPS: Record<string, string[]> = {
  TITLE: [
    'Set the stage — state who you are, what this is about, and why it matters in one breath.',
    'Make eye contact with the audience before speaking your first word.',
    'Keep your energy high; the opening sets the tone for everything.',
  ],
  PROBLEM: [
    'Paint the pain. Use a concrete story or statistic that makes the audience feel the problem.',
    'Pause after the key number — let it sink in before moving on.',
    'Avoid jargon here; this slide should resonate with everyone in the room.',
  ],
  SOLUTION: [
    'Transition clearly: "Here is how we solve this."',
    'Focus on the outcome first, then explain the mechanism.',
    'If you have a demo, this is the slide to tee it up.',
  ],
  ARCHITECTURE: [
    'Walk through the diagram left-to-right or top-to-bottom — give the audience a visual path.',
    'Highlight the one differentiating component; gloss over commodity parts.',
    'Anticipate the "why not just use X?" question and address it proactively.',
  ],
  PROCESS: [
    'Number your steps verbally as you go — it helps the audience track progress.',
    'Emphasize the step where most people get stuck or drop off.',
    'Keep transitions snappy: "Step one done. Step two…"',
  ],
  COMPARISON: [
    'Be fair to alternatives — straw-manning kills credibility.',
    'Highlight your strongest differentiator, not every cell in the table.',
    'Use "unlike X, we…" framing to make the contrast memorable.',
  ],
  DATA_METRICS: [
    'Lead with the insight, not the chart. Say the takeaway before showing the number.',
    'One key metric per moment — do not read every row aloud.',
    'Give context: is this number good? How does it compare to last quarter or the industry?',
  ],
  CTA: [
    'Be explicit about the next step: "Here is exactly what I am asking for."',
    'Create urgency — why act now, not next month?',
    'End on your strongest emotional note; this is the last thing they will remember.',
  ],
  CONTENT: [
    'Choose one takeaway per slide — if there are two, you need two slides.',
    'Use the "So what?" test: every bullet should answer why the audience should care.',
    'Vary your delivery: slow down on the key point, speed up on supporting details.',
  ],
  QUOTE: [
    'Read the quote aloud slowly, then add your own brief commentary.',
    'Attribute the quote with a short credibility line: "As [Name], [Role] at [Company], said…"',
    'Pause after the quote to let the audience absorb the message.',
  ],
  VISUAL_HUMOR: [
    'Let the image land first — pause and let the audience react before speaking.',
    'Your one line should amplify the visual, not explain it.',
    'Use humor to transition into a serious point — it makes the contrast memorable.',
  ],
};

const DEFAULT_TIPS = [
  'Speak to the audience, not the screen.',
  'One idea per slide keeps attention focused.',
  'Pause between sections to let key points land.',
];

interface NarrativeAdviceProps {
  slideType: string;
  speakerNotes: string | null;
  onSaveSpeakerNotes: (value: string) => void;
}

export function NarrativeAdvice({ slideType, speakerNotes, onSaveSpeakerNotes }: NarrativeAdviceProps) {
  const tips = COACHING_TIPS[slideType] ?? DEFAULT_TIPS;

  return (
    <div className="flex gap-4">
      {/* Speaker Notes */}
      <div className="flex-1 rounded-lg border border-border bg-card p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
          <MessageSquareText className="h-3.5 w-3.5 text-primary" />
          Speaker Notes
        </div>
        <EditableText
          value={speakerNotes ?? ''}
          onSave={onSaveSpeakerNotes}
          className="text-sm leading-relaxed text-foreground/80"
          placeholder="Click to add speaker notes..."
          multiline
        />
      </div>

      {/* Narrative Coaching */}
      <div className="w-72 flex-shrink-0 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Lightbulb className="h-3.5 w-3.5" />
          Delivery Tips
        </div>
        <ul className="space-y-1.5">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-foreground/70">
              <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-amber-500/60" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
