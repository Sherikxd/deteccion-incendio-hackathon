// @vitest-environment node
/**
 * Comprueba que TODOS los snippets de código mostrados en la UI compilan de verdad
 * (Python, TypeScript, Golang, Node.js y navegador): son copiados por el usuario,
 * así que un snippet "de mentira" es un bug de producción.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  OPENROUTER_INTEGRATION_CODE_PY,
  OPENROUTER_INTEGRATION_CODE_TS
} from '../src/prompts/masterFirePrompt';
import { getCodeSnippet } from '../src/components/StreamApiDocumentation';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = '/tmp/opencode/snippets';
const STREAM = 'http://localhost:3000/stream';
const WS = 'ws://localhost:3000/stream';
const TS_SNIPPET_PATH = path.join(ROOT, 'src/__snippet_check.ts');

const compileDetail = (cmd: string, cwd?: string): string => {
  try {
    execSync(cmd, { cwd, stdio: 'pipe' });
    return '';
  } catch (e: any) {
    return `${e.stdout || ''}${e.stderr || ''}`.toString().slice(0, 1500);
  }
};

describe('snippets copiables de la UI', () => {
  it('Python (masterFirePrompt) compila', () => {
    mkdirSync(TMP, { recursive: true });
    writeFileSync(path.join(TMP, 'backend_snippet.py'), OPENROUTER_INTEGRATION_CODE_PY);
    expect(compileDetail('python3 -m py_compile backend_snippet.py', TMP)).toBe('');
  }, 60000);

  it('TypeScript (masterFirePrompt) compila dentro del proyecto', () => {
    writeFileSync(TS_SNIPPET_PATH, OPENROUTER_INTEGRATION_CODE_TS);
    try {
      expect(compileDetail('npx tsc --noEmit', ROOT)).toBe('');
    } finally {
      rmSync(TS_SNIPPET_PATH, { force: true });
    }
  }, 90000);

  it('Golang (StreamApiDocumentation) compila', () => {
    const goDir = path.join(TMP, 'go');
    mkdirSync(goDir, { recursive: true });
    writeFileSync(path.join(goDir, 'main.go'), getCodeSnippet('golang', STREAM, WS));
    writeFileSync(path.join(goDir, 'go.mod'), 'module snippetcheck\n\ngo 1.21\n');
    expect(compileDetail('go build ./...', goDir)).toBe('');
  }, 90000);

  it('Node.js (StreamApiDocumentation) es JS válido', () => {
    mkdirSync(TMP, { recursive: true });
    writeFileSync(path.join(TMP, 'node.mjs'), getCodeSnippet('nodejs', STREAM, WS));
    expect(compileDetail('node --check node.mjs', TMP)).toBe('');
  }, 60000);

  it('Snippet de navegador (StreamApiDocumentation) es JS válido', () => {
    mkdirSync(TMP, { recursive: true });
    writeFileSync(path.join(TMP, 'browser.mjs'), getCodeSnippet('javascript', STREAM, WS));
    expect(compileDetail('node --check browser.mjs', TMP)).toBe('');
  }, 60000);

  it('Python (StreamApiDocumentation) compila', () => {
    mkdirSync(TMP, { recursive: true });
    writeFileSync(path.join(TMP, 'docs.py'), getCodeSnippet('python', STREAM, WS));
    expect(compileDetail('python3 -m py_compile docs.py', TMP)).toBe('');
  }, 60000);
});
