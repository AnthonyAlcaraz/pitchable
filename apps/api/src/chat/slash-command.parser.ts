export interface ParsedSlashCommand {
  command: string;
  args: string[];
  raw: string;
}

const VALID_COMMANDS = [
  'theme',
  'export',
  'outline',
  'regenerate',
  'rewrite',
  'images',
  'email',
  'help',
  'auto-approve',
  'config',
] as const;

export function parseSlashCommand(
  input: string,
): ParsedSlashCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return null;

  const parts = trimmed.split(/\s+/);
  const command = parts[0].slice(1).toLowerCase();

  if (!VALID_COMMANDS.includes(command as (typeof VALID_COMMANDS)[number])) {
    return null;
  }

  return {
    command,
    args: parts.slice(1),
    raw: trimmed,
  };
}

export function getAvailableCommands(): {
  command: string;
  description: string;
}[] {
  return [
    { command: '/theme', description: 'Change presentation theme (e.g. /theme pitchable-dark)' },
    { command: '/export', description: 'Export presentation (e.g. /export pptx)' },
    { command: '/email', description: 'Email presentation as PDF or PPTX (e.g. /email pdf, /email pptx user@example.com)' },
    { command: '/outline', description: 'Regenerate the outline' },
    { command: '/regenerate', description: 'Regenerate a slide (e.g. /regenerate slide 3)' },
    { command: '/images', description: 'Generate images for slides (e.g. /images 6)' },
    { command: '/rewrite', description: 'Rewrite all slides using the current Brief context (keeps structure)' },
    { command: '/config', description: 'Configure density & images (e.g. /config bullets 3, /config words 50, /config rows 3, /config images background, /config frequency 6)' },
    { command: '/help', description: 'Show available commands' },
    { command: '/auto-approve', description: 'Toggle auto-approve for generated slides (e.g. /auto-approve off)' },
  ];
}
