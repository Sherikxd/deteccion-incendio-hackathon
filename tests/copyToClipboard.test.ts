import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyTextToClipboard } from '../src/utils/copyToClipboard';

/** Reemplaza document.execCommand (happy-dom no lo implementa) y lo restaura. */
function stubExecCommand(impl: () => boolean) {
  const hadOwn = Object.prototype.hasOwnProperty.call(document, 'execCommand');
  const original = (document as any).execCommand;
  Object.defineProperty(document, 'execCommand', {
    value: impl,
    configurable: true,
    writable: true
  });
  return () => {
    if (hadOwn) {
      (document as any).execCommand = original;
    } else {
      delete (document as any).execCommand;
    }
  };
}

describe('copyTextToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('usa navigator.clipboard en contexto seguro', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

    await expect(copyTextToClipboard('hola')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hola');
    expect(document.querySelectorAll('textarea').length).toBe(0);
  });

  it('cae al textarea + execCommand cuando no hay clipboard (HTTP en LAN)', async () => {
    vi.stubGlobal('navigator', { clipboard: undefined });
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    const execCommand = vi.fn().mockReturnValue(true);
    const restore = stubExecCommand(execCommand);

    const result = await copyTextToClipboard('sin https');
    restore();

    expect(result).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    // el textarea temporal no puede quedarse huérfano en el DOM
    expect(document.querySelectorAll('textarea').length).toBe(0);
  });

  it('devuelve false si el fallback también falla', async () => {
    vi.stubGlobal('navigator', { clipboard: undefined });
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    const restore = stubExecCommand(() => {
      throw new Error('not supported');
    });

    const result = await copyTextToClipboard('x');
    restore();

    expect(result).toBe(false);
  });

  it('devuelve false si writeText rechaza y el fallback falla', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: () => Promise.reject(new Error('denied')) }
    });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    const restore = stubExecCommand(() => {
      throw new Error('not supported');
    });

    const result = await copyTextToClipboard('y');
    restore();

    expect(result).toBe(false);
  });
});
