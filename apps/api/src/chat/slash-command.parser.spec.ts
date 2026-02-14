import { parseSlashCommand, getAvailableCommands } from './slash-command.parser';

describe('parseSlashCommand', () => {
  it('should parse valid commands', () => {
    const result = parseSlashCommand('/theme dark-professional');
    expect(result).toEqual({
      command: 'theme',
      args: ['dark-professional'],
      raw: '/theme dark-professional',
    });
  });

  it('should parse command with no args', () => {
    const result = parseSlashCommand('/help');
    expect(result).toEqual({
      command: 'help',
      args: [],
      raw: '/help',
    });
  });

  it('should parse command with multiple args', () => {
    const result = parseSlashCommand('/regenerate slide 3');
    expect(result).toEqual({
      command: 'regenerate',
      args: ['slide', '3'],
      raw: '/regenerate slide 3',
    });
  });

  it('should parse /auto-approve command', () => {
    const result = parseSlashCommand('/auto-approve on');
    expect(result).toEqual({
      command: 'auto-approve',
      args: ['on'],
      raw: '/auto-approve on',
    });
  });

  it('should return null for non-slash input', () => {
    expect(parseSlashCommand('hello world')).toBeNull();
  });

  it('should return null for invalid commands', () => {
    expect(parseSlashCommand('/invalid')).toBeNull();
    expect(parseSlashCommand('/foo bar')).toBeNull();
  });

  it('should be case insensitive', () => {
    const result = parseSlashCommand('/THEME light');
    expect(result).not.toBeNull();
    expect(result!.command).toBe('theme');
  });

  it('should trim whitespace', () => {
    const result = parseSlashCommand('  /export pptx  ');
    expect(result).not.toBeNull();
    expect(result!.command).toBe('export');
    expect(result!.args).toEqual(['pptx']);
  });

  it('should return null for empty input', () => {
    expect(parseSlashCommand('')).toBeNull();
    expect(parseSlashCommand('   ')).toBeNull();
  });

  it('should return null for bare slash', () => {
    // '/' alone — command becomes '' which is not in VALID_COMMANDS
    expect(parseSlashCommand('/')).toBeNull();
  });
});

describe('getAvailableCommands', () => {
  it('should return all commands with descriptions', () => {
    const commands = getAvailableCommands();
    expect(commands.length).toBeGreaterThanOrEqual(7);

    const names = commands.map((c) => c.command);
    expect(names).toContain('/theme');
    expect(names).toContain('/export');
    expect(names).toContain('/outline');
    expect(names).toContain('/help');
    expect(names).toContain('/auto-approve');
  });

  it('should have descriptions for every command', () => {
    const commands = getAvailableCommands();
    for (const cmd of commands) {
      expect(cmd.description.length).toBeGreaterThan(0);
    }
  });
});
