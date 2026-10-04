/**
 * Helpers that remove Co-authored-by trailers from git commit messages and
 * from the bash commands agents use to create them.
 *
 * opencode has no config key for this. The model writes the trailer into
 * `git commit -m`, so a project plugin has to rewrite the command (or refuse
 * it) before the tool runs.
 */

const TRAILER_LINE = /^co-authored-by:/i;

/** True when a single line is a Co-authored-by trailer. */
export function isCoauthorTrailerLine(line) {
  return TRAILER_LINE.test(line);
}

/**
 * Drop every Co-authored-by line from a commit message body.
 * Returns the cleaned text and whether anything was removed.
 */
export function stripCoauthorFromMessage(message) {
  if (typeof message !== 'string' || message === '') {
    return { message, stripped: false };
  }

  const originalEndsWithNewline = message.endsWith('\n');
  const lines = message.split('\n');
  const kept = lines.filter((line) => !isCoauthorTrailerLine(line));
  const stripped = kept.length !== lines.length;

  let next = kept.join('\n');
  // A trailer usually sits after a blank line; removing it can leave two.
  next = next.replace(/\n{3,}/g, '\n\n');
  // Collapse blank lines a removed trailer left at the end.
  if (originalEndsWithNewline) {
    next = next.replace(/\n+$/, '\n');
  } else {
    next = next.replace(/\n+$/, '');
  }

  return { message: next, stripped };
}

function findClosingQuote(command, start, quote) {
  let i = start;
  if (quote === '"') {
    while (i < command.length) {
      if (command[i] === '\\' && i + 1 < command.length) {
        i += 2;
        continue;
      }
      if (command[i] === '"') return i;
      i += 1;
    }
    return -1;
  }
  while (i < command.length && command[i] !== "'") {
    i += 1;
  }
  return i < command.length ? i : -1;
}

function rewriteFlagBodies(command, flag, quote) {
  let result = '';
  let i = 0;
  let stripped = false;

  for (;;) {
    const idx = command.indexOf(flag, i);
    if (idx === -1) {
      result += command.slice(i);
      break;
    }

    result += command.slice(i, idx + flag.length);
    const bodyStart = idx + flag.length;
    const close = findClosingQuote(command, bodyStart, quote);
    if (close === -1) {
      result += command.slice(bodyStart);
      break;
    }

    const body = command.slice(bodyStart, close);
    // Agents write `\n` inside double-quoted -m strings; treat those as newlines
    // for trailer detection, then put the escapes back if the body used them.
    const usedEscapes = body.includes('\\n');
    const asText = usedEscapes ? body.replace(/\\n/g, '\n') : body;
    const cleaned = stripCoauthorFromMessage(asText);
    let outBody = cleaned.message;
    if (usedEscapes) {
      outBody = outBody.replace(/\n/g, '\\n');
    }
    if (cleaned.stripped) stripped = true;
    result += outBody + command[close];
    i = close + 1;
  }

  return { command: result, stripped };
}

/**
 * Rewrite a bash command so git commit message flags no longer carry a
 * Co-authored-by trailer. Only `-m` arguments are rewritten.
 */
export function rewriteGitCommitCommand(command) {
  if (typeof command !== 'string' || command === '') {
    return { command, stripped: false };
  }

  if (!/\bgit\b[\s\S]*\bcommit\b/.test(command)) {
    return { command, stripped: false };
  }

  let next = command;
  let stripped = false;

  const double = rewriteFlagBodies(next, '-m "', '"');
  next = double.command;
  stripped = stripped || double.stripped;

  const single = rewriteFlagBodies(next, "-m '", "'");
  next = single.command;
  stripped = stripped || single.stripped;

  // Standalone trailer messages: git commit -m "subject" -m "Co-authored-by: ..."
  next = next.replace(/(\s+-m\s+)(["'])co-authored-by:[^"']*\2/gi, () => {
    stripped = true;
    return '';
  });

  if (stripped) {
    next = next.replace(/[ \t]{2,}/g, ' ').trim();
  }

  return { command: next, stripped };
}

/** True when a bash command would create a commit carrying a Co-authored-by trailer. */
export function commandHasCoauthor(command) {
  if (typeof command !== 'string') return false;
  if (!/\bgit\b[\s\S]*\bcommit\b/.test(command)) return false;
  return /co-authored-by:/i.test(command);
}
