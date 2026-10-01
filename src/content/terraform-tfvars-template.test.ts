import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '../..');
const terraformDir = join(repoRoot, 'terraform');
const templatePath = 'terraform/terraform.tfvars.example';
const template = readFileSync(join(repoRoot, templatePath), 'utf8');
const variablesTf = readFileSync(join(terraformDir, 'variables.tf'), 'utf8');
const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');

function runGit(args: string[]) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
}

/** Git's own answer to "is this path ignored?", not a re-parse of the patterns. */
function isIgnored(path: string) {
  try {
    runGit(['check-ignore', '--quiet', '--no-index', path]);
    return true;
  } catch {
    return false;
  }
}

/** Every `variable` block in the configuration, keyed by name, with its default. */
function declaredVariables() {
  const variables = new Map<string, string | null>();

  for (const [, name, body] of variablesTf.matchAll(/^variable "([^"]+)" \{([\s\S]*?)^\}/gm)) {
    const literal = body.match(/^\s*default\s*=\s*"([^"]*)"/m);
    variables.set(name, literal ? literal[1] : null);
  }

  return variables;
}

function templateAssignments() {
  const assignments = new Map<string, string>();

  for (const line of template.split('\n')) {
    const match = line.match(/^([a-z0-9_]+)\s*=\s*"(.*)"\s*$/);
    if (match !== null) {
      assignments.set(match[1], match[2]);
    }
  }

  return assignments;
}

describe('Terraform tfvars template', () => {
  it('is tracked by git, so a fresh clone has it', () => {
    expect(existsSync(join(repoRoot, templatePath))).toBe(true);
    expect(runGit(['ls-files', '--error-unmatch', templatePath]).trim()).toBe(templatePath);
  });

  it('is not ignored, while the real variable file and its backups still are', () => {
    expect(isIgnored(templatePath)).toBe(false);

    for (const ignored of [
      'terraform/terraform.tfvars',
      'terraform/terraform.tfvars.backup',
      'terraform/terraform.tfvars.example.bak',
    ]) {
      expect(isIgnored(ignored)).toBe(true);
    }
  });

  it('assigns every variable the configuration declares', () => {
    const declared = declaredVariables();
    expect(declared.size).toBeGreaterThan(0);

    expect([...templateAssignments().keys()].sort()).toEqual([...declared.keys()].sort());
  });

  it('holds placeholders and committed defaults only, never real identifiers', () => {
    const declared = declaredVariables();

    for (const [name, value] of templateAssignments()) {
      if (declared.get(name) === value) {
        continue;
      }

      expect(value, `${name} is neither a placeholder nor the committed default`).toMatch(
        /^(your-[\w-]+|[\w.+-]*@example\.(com|net|org))$/
      );
    }

    expect(template).not.toContain('sdelrio');
  });

  it('is the copy step the README points operators at', () => {
    expect(readme).toContain(`[${templatePath}](${templatePath})`);
    expect(readme).toMatch(/[Cc]opy[^.]*terraform\/terraform\.tfvars/);
  });
});