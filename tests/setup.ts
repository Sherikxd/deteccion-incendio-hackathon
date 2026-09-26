import { afterEach, vi } from 'vitest';

// happy-dom no implementa Element.scrollTo: varios feeds hacen scroll al montar.
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollTo !== 'function') {
  Element.prototype.scrollTo = function scrollTo() {};
}

// Fallback de copiado al portapapeles (copyToClipboard) necesita execCommand.
if (typeof document !== 'undefined' && typeof document.execCommand !== 'function') {
  document.execCommand = () => true;
}

// Cada test que necesite EventSource/fetch/WebSocket los stubbea con vi.stubGlobal;
// aquí sólo garantizamos que no queden restos de un test anterior.
afterEach(() => {
  vi.unstubAllGlobals();
});
