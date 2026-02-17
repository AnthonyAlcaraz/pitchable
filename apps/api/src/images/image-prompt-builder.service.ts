import { Injectable } from '@nestjs/common';

// ── Interfaces ──────────────────────────────────────────────

export interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

export interface ImagePrompt {
  prompt: string;
  negativePrompt: string;
  aspectRatio: '16:9';
  style: string;
}

/**
 * Z4-grade rich JSON prompt structure.
 * Matches the proven Nano Banana Pro / Imagen 3 pipeline from the z4 skill.
 */
interface RichPrompt {
  subject: {
    main: string;
    elements: Record<string, string>;
  };
  background: {
    type: string;
    color: string;
    texture: string;
    depth: string;
  };
  style: {
    medium: string;
    artistic_reference: string;
    color_palette: string;
    vibe: string;
  };
  technical: {
    resolution: string;
    aspect_ratio: string;
    [key: string]: string;
  };
  lighting: {
    type: string;
    source: string;
    details: string;
  };
  constraints: {
    must_keep: string[];
    avoid: string[];
  };
  negative_prompt: string[];
}

// ── Shared negative prompts ─────────────────────────────────

const BASE_NEGATIVE = [
  'text', 'words', 'letters', 'numbers', 'watermark', 'logo', 'signature',
  'blurry', 'pixelated', 'low quality', 'jpeg artifacts',
  'cartoon', 'anime', 'illustration', 'sketch', 'drawing',
  'busy background', 'cluttered', 'messy',
  'multiple subjects', 'split composition',
  'oversaturated', 'neon', 'garish colors',
];

// ── Service ─────────────────────────────────────────────────

@Injectable()
export class ImagePromptBuilderService {
  buildPrompt(
    slideType: string,
    slideTitle: string,
    slideBody: string,
    theme: ThemeColors,
  ): ImagePrompt {
    let richPrompt: RichPrompt;

    switch (slideType) {
      case 'TITLE':
        richPrompt = this.buildTitleRich(slideTitle, theme);
        break;
      case 'PROBLEM':
        richPrompt = this.buildProblemRich(slideTitle, slideBody);
        break;
      case 'SOLUTION':
        richPrompt = this.buildSolutionRich(slideTitle, slideBody);
        break;
      case 'ARCHITECTURE':
        richPrompt = this.buildArchitectureRich(slideTitle, slideBody);
        break;
      case 'DATA_METRICS':
        richPrompt = this.buildMetricsRich(slideTitle, slideBody);
        break;
      case 'PROCESS':
        richPrompt = this.buildProcessRich(slideTitle, slideBody, theme);
        break;
      case 'COMPARISON':
        richPrompt = this.buildComparisonRich(slideTitle, slideBody, theme);
        break;
      case 'CTA':
        richPrompt = this.buildCTARich(slideTitle);
        break;
      case 'VISUAL_HUMOR':
        richPrompt = this.buildVisualHumorRich(slideTitle, slideBody, theme);
        break;
      case 'QUOTE':
        richPrompt = this.buildQuoteRich(slideTitle, slideBody, theme);
        break;
      default:
        richPrompt = this.buildGenericRich(slideTitle, slideBody, theme);
        break;
    }

    return {
      prompt: JSON.stringify(richPrompt, null, 2),
      negativePrompt: richPrompt.negative_prompt.join(', '),
      aspectRatio: '16:9',
      style: slideType.toLowerCase(),
    };
  }

  // ── Per-type rich prompt builders (z4 quality) ────────────

  private buildTitleRich(title: string, theme: ThemeColors): RichPrompt {
    const condensed = this.condenseTitle(title);
    return {
      subject: {
        main: `Abstract visualization representing: ${condensed}`,
        elements: {
          primary: 'Interconnected glowing geometric nodes forming an elegant network',
          secondary: 'Subtle energy waves radiating from center',
          composition: 'Centered, bold, commanding presence with depth',
        },
      },
      background: {
        type: 'Gradient backdrop',
        color: `Deep blue (${theme.primaryColor}) transitioning to purple (${theme.secondaryColor})`,
        texture: 'Subtle hexagonal grid pattern with soft glow',
        depth: 'Multi-layered with atmospheric haze',
      },
      style: {
        medium: '3D Digital Art',
        artistic_reference: 'Minimalist tech aesthetic, Apple keynote style, Bloomberg terminal elegance',
        color_palette: `Deep blues, electric purple, ${theme.accentColor} accents, white highlights`,
        vibe: 'Professional, innovative, trustworthy, powerful',
      },
      technical: {
        resolution: 'Ultra high resolution, 4K quality',
        aspect_ratio: '16:9 widescreen presentation format',
        depth_of_field: 'Shallow, primary subject sharp, background soft bokeh',
      },
      lighting: {
        type: 'Cinematic studio three-point lighting',
        source: 'Key light from upper left at 45 degrees, soft fill from right, rim light from behind',
        details: 'Soft gradient shadows, subtle rim lighting on edges, gentle bloom on highlights',
      },
      constraints: {
        must_keep: [
          'Clean, uncluttered composition',
          'Professional corporate aesthetic',
          'Clear single focal point',
          'Harmonious color palette',
          'Sense of depth and dimension',
        ],
        avoid: [
          'Any text, words, or letters in image',
          'Cluttered or busy composition',
          'Cartoonish or childish style',
          'Low resolution artifacts',
          'Multiple competing focal points',
          'Harsh or unnatural colors',
        ],
      },
      negative_prompt: [...BASE_NEGATIVE],
    };
  }

  private buildProblemRich(title: string, body: string): RichPrompt {
    const concept = this.condenseTitle(title);
    return {
      subject: {
        main: `Visual metaphor for challenge: ${concept}`,
        elements: {
          primary: 'Tangled, fragmented geometric structures in disarray',
          secondary: 'Sharp angular pieces, disconnected nodes, broken connections',
          details: 'Visual tension through asymmetry and fractured forms',
        },
      },
      background: {
        type: 'Dark moody gradient',
        color: 'Charcoal (#1a1a2e) with deep red undertones (#16213e)',
        texture: 'Subtle noise grain, distressed texture',
        depth: 'Deep atmospheric darkness, slightly ominous',
      },
      style: {
        medium: '3D Digital Art with dramatic lighting',
        artistic_reference: 'Dramatic tension, film noir aesthetic, cyberpunk undertones',
        color_palette: 'Dark grays, muted reds, warning oranges, cold blues',
        vibe: 'Tension, challenge, complexity, urgency',
      },
      technical: {
        resolution: 'High resolution',
        aspect_ratio: '16:9',
        focus: 'Sharp on chaotic elements, slight motion blur on fragments',
      },
      lighting: {
        type: 'Low-key dramatic lighting',
        source: 'Single harsh spotlight from upper left, minimal fill',
        details: 'Deep harsh shadows, high contrast, chiaroscuro effect',
      },
      constraints: {
        must_keep: [
          'Sense of complexity and chaos',
          'Visual tension and discomfort',
          'Dark moody atmosphere',
          'Professional quality despite chaotic subject',
          'Clear representation of problem',
        ],
        avoid: [
          'Bright happy colors',
          'Resolved or organized imagery',
          'People showing distress',
          'Any text or labels',
          'Overly abstract',
        ],
      },
      negative_prompt: [
        ...BASE_NEGATIVE,
        'happy', 'bright', 'cheerful', 'colorful rainbow',
        'organized', 'clean', 'simple', 'resolved', 'fixed',
        'smiling', 'positive', 'celebration',
      ],
    };
  }

  private buildSolutionRich(title: string, body: string): RichPrompt {
    const concept = this.condenseTitle(title);
    return {
      subject: {
        main: `Visual metaphor for solution: ${concept}`,
        elements: {
          primary: 'Elegant interconnected geometric structure, perfectly aligned nodes',
          secondary: 'Smooth flowing energy connections, harmonic patterns',
          details: 'Balance, symmetry, and visual harmony',
        },
      },
      background: {
        type: 'Light gradient with depth',
        color: 'Soft white to light blue (#ebf8ff) to soft purple (#e9d8fd)',
        texture: 'Clean, minimal, subtle radial gradient',
        depth: 'Bright, open, optimistic atmosphere',
      },
      style: {
        medium: '3D Digital Art with soft rendering',
        artistic_reference: 'Clean tech aesthetic, solution visualization, utopian futurism',
        color_palette: 'Bright blues, soft greens, white, gold accents, silver',
        vibe: 'Clarity, innovation, elegance, relief, accomplishment',
      },
      technical: {
        resolution: 'Ultra high resolution',
        aspect_ratio: '16:9',
        focus: 'Sharp throughout with soft atmospheric glow',
      },
      lighting: {
        type: 'High-key bright studio lighting',
        source: 'Even soft illumination from multiple directions',
        details: 'Minimal shadows, subtle gradients, uplifting atmosphere, rim glow',
      },
      constraints: {
        must_keep: [
          'Sense of clarity and perfect order',
          'Bright optimistic mood',
          'Professional elegance',
          'Clean minimal composition',
          'Visual harmony and balance',
        ],
        avoid: [
          'Dark moody imagery',
          'Chaotic or complex elements',
          'Any text or labels',
          'Harsh shadows',
          'Cold or clinical feeling',
        ],
      },
      negative_prompt: [
        ...BASE_NEGATIVE,
        'dark', 'moody', 'dramatic shadows',
        'chaotic', 'complicated', 'tangled',
        'cold', 'sterile', 'harsh',
      ],
    };
  }

  private buildArchitectureRich(title: string, body: string): RichPrompt {
    const concept = this.condenseTitle(title);
    return {
      subject: {
        main: `Isometric visualization of: ${concept}`,
        elements: {
          layout: 'Layered isometric blocks representing system components',
          connections: 'Glowing energy lines connecting layers and nodes',
          details: 'Clean geometric shapes, distinct color coding per layer',
        },
      },
      background: {
        type: 'Solid dark professional',
        color: 'Deep navy (#0f172a) to charcoal (#1e293b)',
        texture: 'Subtle dot grid pattern, blueprint aesthetic',
        depth: 'Flat, non-distracting, professional',
      },
      style: {
        medium: '3D Isometric Technical Render',
        artistic_reference: 'Modern infographic, technical diagram, AWS architecture icons style',
        color_palette: 'Electric blue, cyan, purple, teal gradients, white highlights',
        vibe: 'Technical, precise, innovative, systematic',
      },
      technical: {
        resolution: 'High resolution',
        aspect_ratio: '16:9',
        perspective: 'True isometric 30-degree angle, no perspective distortion',
      },
      lighting: {
        type: 'Soft ambient with accent glows',
        source: 'Even soft lighting with self-illuminated components',
        details: 'Subtle shadows for depth, glowing edges on active elements',
      },
      constraints: {
        must_keep: [
          'Perfect isometric perspective',
          'Clear visual hierarchy between layers',
          'Geometric precision and clean lines',
          'Visible connection flows between components',
          'Professional technical aesthetic',
        ],
        avoid: [
          'Organic or natural shapes',
          'Photo-realistic rendering',
          'Text labels inside the image',
          'Cluttered or tangled connections',
          'Perspective distortion',
        ],
      },
      negative_prompt: [
        ...BASE_NEGATIVE,
        'photorealistic', 'photograph', 'realistic photo',
        'organic', 'natural', 'curved organic shapes',
        'tangled', 'cluttered lines',
        'perspective', 'vanishing point',
      ],
    };
  }

  private buildMetricsRich(title: string, body: string): RichPrompt {
    const concept = this.condenseTitle(title);
    return {
      subject: {
        main: `Abstract data visualization representing: ${concept}`,
        elements: {
          primary: 'Rising geometric forms suggesting growth and success',
          secondary: 'Flowing data particles, dynamic energy streams',
          details: 'Clean bars, nodes, or wave elements with upward momentum',
        },
      },
      background: {
        type: 'Dark gradient professional',
        color: 'Deep blue (#0c1929) to near black (#050a15)',
        texture: 'Minimal grid lines, subtle coordinate system',
        depth: 'Professional depth with atmospheric glow',
      },
      style: {
        medium: '3D Data Visualization Art',
        artistic_reference: 'Bloomberg terminal aesthetic, financial data viz, trading dashboard',
        color_palette: 'Electric blue, success green (#10b981), gold highlights, white accents',
        vibe: 'Data-driven, growth, success, momentum, achievement',
      },
      technical: {
        resolution: 'High resolution',
        aspect_ratio: '16:9',
      },
      lighting: {
        type: 'Self-illuminated glowing elements on dark background',
        source: 'Data points and bars emit their own light',
        details: 'Subtle bloom effects, light rays, atmospheric glow',
      },
      constraints: {
        must_keep: [
          'Clean data visualization aesthetic',
          'Upward growth direction',
          'Professional financial look',
          'Clear visual hierarchy',
          'Glowing energy feel',
        ],
        avoid: [
          'Actual numbers or text in image',
          'Cluttered or confusing charts',
          'Childish or cartoon graphics',
          'Downward or negative trends',
          'Overly complex visualization',
        ],
      },
      negative_prompt: [
        ...BASE_NEGATIVE,
        'axis labels',
        'childish', 'playful', 'cute',
        'confusing',
        'downward', 'declining', 'negative',
      ],
    };
  }

  private buildProcessRich(title: string, body: string, theme: ThemeColors): RichPrompt {
    const concept = this.condenseTitle(title);
    return {
      subject: {
        main: `Sequential workflow visualization: ${concept}`,
        elements: {
          primary: 'Connected steps flowing left-to-right with directional arrows',
          secondary: 'Numbered nodes with glowing transition paths',
          details: 'Clear progression, each step distinct but connected',
        },
      },
      background: {
        type: 'Dark gradient professional',
        color: `Deep navy (${theme.primaryColor}) to charcoal`,
        texture: 'Subtle grid pattern, clean technical aesthetic',
        depth: 'Professional depth, non-distracting',
      },
      style: {
        medium: '3D Digital Art with clean rendering',
        artistic_reference: 'Modern workflow infographic, pipeline visualization, tech documentation',
        color_palette: `${theme.accentColor} accents, electric blue transitions, white highlights on dark`,
        vibe: 'Systematic, progressive, clear, professional',
      },
      technical: {
        resolution: 'High resolution',
        aspect_ratio: '16:9',
        layout: 'Horizontal left-to-right sequential flow',
      },
      lighting: {
        type: 'Soft ambient with accent glows on active steps',
        source: 'Even soft lighting with self-illuminated step nodes',
        details: 'Glow trails between steps, subtle depth shadows',
      },
      constraints: {
        must_keep: [
          'Clear left-to-right progression',
          'Distinct numbered steps',
          'Visible connection arrows between steps',
          'Professional workflow aesthetic',
          'Clean geometric precision',
        ],
        avoid: [
          'Circular layouts',
          'Branching paths',
          'Text labels in image',
          'Cluttered connections',
          'Abstract without clear flow',
        ],
      },
      negative_prompt: [
        ...BASE_NEGATIVE,
        'circular', 'branching', 'recursive',
        'abstract', 'organic',
      ],
    };
  }

  private buildComparisonRich(title: string, body: string, theme: ThemeColors): RichPrompt {
    const concept = this.condenseTitle(title);
    return {
      subject: {
        main: `Side-by-side comparison visualization: ${concept}`,
        elements: {
          primary: 'Two distinct columns separated by a clean divider',
          secondary: 'Left side showing old/problem state, right side showing new/solution state',
          details: 'Visual contrast between the two sides through color and form',
        },
      },
      background: {
        type: 'Split gradient backdrop',
        color: 'Left: darker muted tones, Right: brighter optimistic tones',
        texture: 'Clean, minimal, professional',
        depth: 'Flat professional depth',
      },
      style: {
        medium: '3D Digital Art',
        artistic_reference: 'Before/after comparison, split-screen infographic, transformation visual',
        color_palette: `Left: muted grays and reds. Right: ${theme.accentColor}, bright blues, greens`,
        vibe: 'Contrast, transformation, improvement, clarity',
      },
      technical: {
        resolution: 'High resolution',
        aspect_ratio: '16:9',
        layout: 'Two-column side-by-side with clear center divider',
      },
      lighting: {
        type: 'Contrast lighting — dimmer left, brighter right',
        source: 'Soft dim light on left, bright uplighting on right',
        details: 'Visual metaphor through lighting contrast',
      },
      constraints: {
        must_keep: [
          'Clear two-column separation',
          'Visual contrast between sides',
          'Professional comparison aesthetic',
          'Balanced composition',
          'Consistent formatting within each side',
        ],
        avoid: [
          'Overlapping elements between sides',
          'Asymmetric layouts',
          'Text or labels',
          'Cluttered composition',
          'Single unified scene',
        ],
      },
      negative_prompt: [
        ...BASE_NEGATIVE,
        'unified scene', 'single composition',
        'asymmetric', 'overlapping',
      ],
    };
  }

  private buildCTARich(title: string): RichPrompt {
    const concept = this.condenseTitle(title);
    return {
      subject: {
        main: `Inspirational visualization for: ${concept}`,
        elements: {
          primary: 'Ascending geometric structure reaching toward light',
          secondary: 'Energy convergence, focal point of power',
          details: 'Upward movement, aspiration, achievement',
        },
      },
      background: {
        type: 'Dynamic gradient with energy',
        color: 'Deep blue transitioning to golden light at top',
        texture: 'Subtle rays of light, ethereal atmosphere',
        depth: 'Expansive, inspiring, limitless',
      },
      style: {
        medium: '3D Digital Art with dramatic lighting',
        artistic_reference: 'Inspirational corporate, achievement visualization, sunrise aesthetic',
        color_palette: 'Deep blues, rising gold, warm amber, white light',
        vibe: 'Aspiration, achievement, momentum, partnership, future',
      },
      technical: {
        resolution: 'High resolution',
        aspect_ratio: '16:9',
      },
      lighting: {
        type: 'Dramatic uplighting with golden key light',
        source: 'Light source from above/ahead, suggesting destination',
        details: 'God rays, volumetric light, inspirational glow',
      },
      constraints: {
        must_keep: [
          'Upward movement and aspiration',
          'Golden light as destination',
          'Sense of momentum and achievement',
          'Professional yet inspiring',
          'Clear focal point',
        ],
        avoid: [
          'Text or words',
          'Closed or constrained feeling',
          'Dark or pessimistic mood',
          'Cluttered composition',
        ],
      },
      negative_prompt: [
        ...BASE_NEGATIVE,
        'dark', 'pessimistic', 'closed', 'constrained',
        'downward', 'declining',
      ],
    };
  }

  private buildQuoteRich(title: string, body: string, theme: ThemeColors): RichPrompt {
    return {
      subject: {
        main: 'Elegant contemplative abstract visual for a thought-provoking quote',
        elements: {
          primary: 'Single luminous orb or crystal structure as focal point',
          secondary: 'Soft radiating light waves, meditative atmosphere',
          details: 'Stillness, depth, contemplation',
        },
      },
      background: {
        type: 'Deep gradient with warmth',
        color: `Deep navy (${theme.primaryColor}) to warm dark purple`,
        texture: 'Subtle particle dust, atmospheric depth',
        depth: 'Infinite, contemplative, expansive',
      },
      style: {
        medium: '3D Digital Art with ethereal quality',
        artistic_reference: 'Meditative visualization, TED talk aesthetic, wisdom visualization',
        color_palette: `Warm gold (${theme.accentColor}), deep blues, soft amber, white glow`,
        vibe: 'Wisdom, depth, contemplation, authority',
      },
      technical: {
        resolution: 'High resolution',
        aspect_ratio: '16:9',
      },
      lighting: {
        type: 'Soft ambient with warm central glow',
        source: 'Central warm light source, gentle ambient fill',
        details: 'Warm golden tones, soft bokeh, atmospheric particles',
      },
      constraints: {
        must_keep: [
          'Contemplative meditative mood',
          'Single clear focal point',
          'Warm inviting tones',
          'Professional elegance',
          'Space for text overlay',
        ],
        avoid: [
          'Action or movement',
          'Multiple focal points',
          'Cold clinical aesthetic',
          'Text or labels',
          'Busy composition',
        ],
      },
      negative_prompt: [
        ...BASE_NEGATIVE,
        'action', 'movement', 'dynamic',
        'cold', 'clinical', 'sterile',
      ],
    };
  }

  private buildVisualHumorRich(title: string, body: string, theme: ThemeColors): RichPrompt {
    const concept = this.condenseTitle(title);
    return {
      subject: {
        main: `A perfectly ordinary, realistic scene that becomes unexpectedly ironic when paired with: "${concept}"`,
        elements: {
          primary: 'A vivid, relatable scene or visual metaphor',
          secondary: 'Subtle details that reward a second look',
          composition: 'Cinematic, full-frame, immersive — designed to fill the entire slide',
        },
      },
      background: {
        type: 'Full scene — no abstract backgrounds',
        color: 'Natural scene colors, warm or cool depending on mood',
        texture: 'Photorealistic detail and texture',
        depth: 'Cinematic depth of field, environmental storytelling',
      },
      style: {
        medium: 'Photorealistic digital photography',
        artistic_reference: 'Editorial photography, New Yorker magazine illustration energy, visual metaphor',
        color_palette: 'Natural, vivid, cinematic color grading',
        vibe: 'Deadpan, understated, clever, the humor is in the subtext',
      },
      technical: {
        resolution: 'Ultra high resolution, 4K quality',
        aspect_ratio: '16:9 widescreen — image fills entire slide',
      },
      lighting: {
        type: 'Cinematic natural lighting',
        source: 'Scene-appropriate — office fluorescent, outdoor natural, stage spotlight',
        details: 'Professional photography quality, subtle color grading',
      },
      constraints: {
        must_keep: [
          'Scene must be INSTANTLY readable — humor lands in 1 second',
          'Full-frame composition — no empty corners',
          'Photorealistic quality',
          'Relatable to business/tech audience',
          'The humor comes from pairing with the title — image alone should be interesting',
        ],
        avoid: [
          'Any text, words, or letters in the image',
          'Abstract or geometric imagery',
          'Corporate clip-art aesthetic',
          'Dark or moody unless the humor calls for it',
          'Multiple scenes — one clear focal point',
        ],
      },
      negative_prompt: [
        ...BASE_NEGATIVE,
        'abstract', 'geometric', 'diagram', 'chart', 'graph',
        'corporate clip art', 'flat design',
        'split composition', 'collage',
      ],
    };
  }

  private buildGenericRich(title: string, body: string, theme: ThemeColors): RichPrompt {
    const concept = this.condenseTitle(title);
    return {
      subject: {
        main: `Professional visualization for: ${concept}`,
        elements: {
          primary: 'Clean geometric forms representing key concepts',
          secondary: 'Subtle connection lines and hierarchy indicators',
          details: 'Professional, clear, focused composition',
        },
      },
      background: {
        type: 'Professional gradient',
        color: `${theme.backgroundColor} transitioning to deeper tone`,
        texture: 'Subtle geometric pattern, clean professional',
        depth: 'Professional depth with soft atmospheric haze',
      },
      style: {
        medium: '3D Digital Art',
        artistic_reference: 'Apple keynote style, modern SaaS documentation, clean infographic',
        color_palette: `${theme.primaryColor} primary, ${theme.accentColor} accents, white highlights`,
        vibe: 'Professional, clear, modern, trustworthy',
      },
      technical: {
        resolution: 'High resolution',
        aspect_ratio: '16:9',
      },
      lighting: {
        type: 'Soft studio three-point lighting',
        source: 'Key light from upper left, soft fill from right',
        details: 'Clean shadows, professional atmosphere, subtle rim light',
      },
      constraints: {
        must_keep: [
          'Clean professional aesthetic',
          'Single clear focal point',
          'Harmonious color palette',
          'Modern presentation quality',
          'Balanced composition',
        ],
        avoid: [
          'Text or labels',
          'Cluttered composition',
          'Cartoonish elements',
          'Multiple competing focal points',
          'Harsh colors',
        ],
      },
      negative_prompt: [...BASE_NEGATIVE],
    };
  }


  // ── Helpers ───────────────────────────────────────────────

  private condenseTitle(title: string): string {
    const fillerWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'and',
      'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
    ]);

    const words = title
      .split(/\s+/)
      .filter((w) => !fillerWords.has(w.toLowerCase()))
      .slice(0, 8);

    return words.join(' ') || title;
  }
}
