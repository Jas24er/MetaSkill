export type StrictTokenizeResult =
  | { ok: true; argv: string[] }
  | { ok: false; error: string };

const FORBIDDEN_UNQUOTED_PATTERNS = [
  "&&",
  "||",
  "|",
  ";",
  "&",
  ">",
  "<",
  "`",
  "$(",
  "\r",
  "\n",
  "\0",
];

/**
 * Splits a command string into an explicit `argv` array without using a shell.
 * Rejects shell chaining, pipes, redirections, command substitutions, and unclosed quotes.
 */
export function tokenizeCommandStrict(commandLine: string): StrictTokenizeResult {
  const trimmed = commandLine.trim();
  if (!trimmed) {
    return { ok: false, error: "Empty command check." };
  }

  for (const token of FORBIDDEN_UNQUOTED_PATTERNS) {
    if (token === "\r" || token === "\n" || token === "\0") {
      if (trimmed.includes(token)) {
        return { ok: false, error: "Multiline or control characters are not allowed in command checks." };
      }
    }
  }

  const argv: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let tokenStarted = false;

  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i]!;
    const next = trimmed[i + 1] ?? "";

    if (quote === "'") {
      if (ch === "'") {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (quote === '"') {
      if (ch === "`" || (ch === "$" && next === "(")) {
        return { ok: false, error: `Command substitution '${ch}${ch === "$" ? "(" : ""}' is forbidden.` };
      }
      if (ch === "\\" && (next === '"' || next === "\\")) {
        current += next;
        i += 1;
        continue;
      }
      if (ch === '"') {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    // Unquoted character
    if (
      ch === "|" ||
      ch === ";" ||
      ch === "&" ||
      ch === ">" ||
      ch === "<" ||
      ch === "`" ||
      (ch === "$" && next === "(")
    ) {
      return {
        ok: false,
        error: `Shell operator '${ch}${ch === "$" ? "(" : ""}' is forbidden in contract checks; declare each command separately.`,
      };
    }

    if (/\s/.test(ch)) {
      if (tokenStarted) {
        argv.push(current);
        current = "";
        tokenStarted = false;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      tokenStarted = true;
      continue;
    }

    current += ch;
    tokenStarted = true;
  }

  if (quote !== null) {
    return { ok: false, error: `Unclosed ${quote} quote in command check.` };
  }

  if (tokenStarted) {
    argv.push(current);
  }

  if (argv.length === 0 || !argv[0]) {
    return { ok: false, error: "Empty executable name." };
  }

  return { ok: true, argv };
}
