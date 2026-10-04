import { describe, it, expect } from 'vitest';

import {
  isCoauthorTrailerLine,
  stripCoauthorFromMessage,
  rewriteGitCommitCommand,
  commandHasCoauthor,
} from './strip-coauthor.js';

describe('isCoauthorTrailerLine', () => {
  it('matches Co-authored-by in either case', () => {
    expect(isCoauthorTrailerLine('Co-authored-by: opencode <opencode@openai.com>')).toBe(true);
    expect(isCoauthorTrailerLine('Co-Authored-By: Claude <noreply@anthropic.com>')).toBe(true);
    expect(isCoauthorTrailerLine('co-authored-by: opencode <opencode@openai.com>')).toBe(true);
  });

  it('does not match a normal body line', () => {
    expect(isCoauthorTrailerLine('feat(handbook): print the book')).toBe(false);
    expect(isCoauthorTrailerLine('Closes #420')).toBe(false);
  });
});

describe('stripCoauthorFromMessage', () => {
  it('removes a trailing Co-authored-by line', () => {
    const message = 'feat(party): medium roster cards (#369)\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\n';
    const result = stripCoauthorFromMessage(message);

    expect(result.stripped).toBe(true);
    expect(result.message).toBe('feat(party): medium roster cards (#369)\n');
  });

  it('removes a Co-Authored-By line in the middle without collapsing body lines', () => {
    const message = 'subject\n\nCo-Authored-By: opencode <opencode@openai.com>\n\nCloses #420\n';
    const result = stripCoauthorFromMessage(message);

    expect(result.stripped).toBe(true);
    expect(result.message).toBe('subject\n\nCloses #420\n');
  });

  it('leaves a message without trailers untouched', () => {
    const message = 'fix(cards): stop the section menu\n';
    const result = stripCoauthorFromMessage(message);

    expect(result.stripped).toBe(false);
    expect(result.message).toBe(message);
  });

  it('returns non-strings unchanged', () => {
    expect(stripCoauthorFromMessage(undefined)).toEqual({ message: undefined, stripped: false });
    expect(stripCoauthorFromMessage('')).toEqual({ message: '', stripped: false });
  });
});

describe('rewriteGitCommitCommand', () => {
  it('strips a trailer from a double-quoted -m', () => {
    const command =
      'git commit -m "feat(handbook): print the book (#426)\\n\\nCo-authored-by: opencode <opencode@openai.com>"';
    const result = rewriteGitCommitCommand(command);

    expect(result.stripped).toBe(true);
    expect(result.command).toContain('feat(handbook): print the book (#426)');
    expect(result.command).not.toMatch(/co-authored-by/i);
  });

  it('strips a trailer from a single-quoted -m', () => {
    const command =
      "git commit -m 'feat(party): medium roster cards\n\nCo-authored-by: Claude Opus 4.8 (1M context) <noreply@anthropic.com>'";
    const result = rewriteGitCommitCommand(command);

    expect(result.stripped).toBe(true);
    expect(result.command).not.toMatch(/co-authored-by/i);
  });

  it('drops a standalone trailer -m flag', () => {
    const command = 'git commit -m "fix(cards): truncate the name" -m "Co-authored-by: opencode <opencode@openai.com>"';
    const result = rewriteGitCommitCommand(command);

    expect(result.stripped).toBe(true);
    expect(result.command).toContain('fix(cards): truncate the name');
    expect(result.command).not.toMatch(/co-authored-by/i);
  });

  it('leaves a clean git commit alone', () => {
    const command = 'git commit -m "fix(docs): make the README guards fail"';
    const result = rewriteGitCommitCommand(command);

    expect(result.stripped).toBe(false);
    expect(result.command).toBe(command);
  });

  it('ignores commands that are not git commit', () => {
    const command = 'git status -sb && echo "Co-authored-by: opencode <opencode@openai.com>"';
    const result = rewriteGitCommitCommand(command);

    expect(result.stripped).toBe(false);
    expect(result.command).toBe(command);
  });

  it('ignores non-bash-looking strings without a commit', () => {
    expect(rewriteGitCommitCommand('ls -la')).toEqual({ command: 'ls -la', stripped: false });
    expect(rewriteGitCommitCommand('')).toEqual({ command: '', stripped: false });
  });
});

describe('commandHasCoauthor', () => {
  it('detects a trailer inside a git commit command', () => {
    expect(
      commandHasCoauthor('git commit -m "x" -m "Co-authored-by: opencode <opencode@openai.com>"'),
    ).toBe(true);
  });

  it('is false for clean commits and non-commit commands', () => {
    expect(commandHasCoauthor('git commit -m "fix(docs): README guards"')).toBe(false);
    expect(commandHasCoauthor('git log --grep=Co-authored-by')).toBe(false);
  });
});
