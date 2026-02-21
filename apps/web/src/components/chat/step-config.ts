import {
  Search, Brain, Palette, FileSliders, Eye, Save,
  Trash2, ArrowUpDown, Layers, Sparkles, ShieldCheck, Download, ImageIcon, type LucideIcon,
} from 'lucide-react';

export interface StepConfig {
  icon: LucideIcon;
  phase: 'prepare' | 'generate' | 'finalize';
  accentColor: string;
}

const STEP_MAP: Record<string, StepConfig> = {
  // Preparation phase
  rag:          { icon: Search,      phase: 'prepare',  accentColor: 'text-blue-400' },
  kb_context:   { icon: Search,      phase: 'prepare',  accentColor: 'text-blue-400' },
  context:      { icon: Search,      phase: 'prepare',  accentColor: 'text-blue-400' },
  theme:        { icon: Palette,     phase: 'prepare',  accentColor: 'text-violet-400' },
  analyze:      { icon: Eye,         phase: 'prepare',  accentColor: 'text-cyan-400' },
  read_slide:   { icon: Eye,         phase: 'prepare',  accentColor: 'text-cyan-400' },

  // Generation phase
  outline_llm:  { icon: Brain,       phase: 'generate', accentColor: 'text-amber-400' },
  llm_modify:   { icon: Brain,       phase: 'generate', accentColor: 'text-amber-400' },
  llm_regen:    { icon: Brain,       phase: 'generate', accentColor: 'text-amber-400' },
  llm_add:      { icon: Brain,       phase: 'generate', accentColor: 'text-amber-400' },
  llm_stream:   { icon: Sparkles,    phase: 'generate', accentColor: 'text-amber-400' },
  generate_slide: { icon: FileSliders, phase: 'generate', accentColor: 'text-primary' },
  quality_review: { icon: ShieldCheck, phase: 'finalize', accentColor: 'text-teal-400' },

  // Export phase
  export_waiting_images: { icon: Download, phase: 'prepare', accentColor: 'text-orange-400' },
  export_loading:        { icon: Download, phase: 'prepare', accentColor: 'text-orange-400' },
  export_preparing:      { icon: Download, phase: 'prepare', accentColor: 'text-orange-400' },
  export_rendering:      { icon: Download, phase: 'generate', accentColor: 'text-orange-400' },
  export_uploading:      { icon: Download, phase: 'finalize', accentColor: 'text-orange-400' },
  export_complete:       { icon: Download, phase: 'finalize', accentColor: 'text-emerald-400' },

  // Image generation phase
  image_gen:             { icon: ImageIcon, phase: 'finalize', accentColor: 'text-orange-400' },

  // Finalize phase
  save:         { icon: Save,        phase: 'finalize', accentColor: 'text-emerald-400' },
  insert:       { icon: Layers,      phase: 'finalize', accentColor: 'text-emerald-400' },
  delete:       { icon: Trash2,      phase: 'finalize', accentColor: 'text-red-400' },
  renumber:     { icon: ArrowUpDown, phase: 'finalize', accentColor: 'text-emerald-400' },
};

const DEFAULT_CONFIG: StepConfig = {
  icon: Sparkles,
  phase: 'generate',
  accentColor: 'text-primary',
};

export function getStepConfig(stepId: string): StepConfig {
  return STEP_MAP[stepId] ?? DEFAULT_CONFIG;
}

export function formatElapsed(startedAt: number, completedAt?: number): string {
  const end = completedAt ?? Date.now();
  const ms = end - startedAt;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const PHASE_LABELS: Record<string, string> = {
  prepare: 'Preparing',
  generate: 'Generating',
  finalize: 'Saving',
};
