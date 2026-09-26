import { describe, expect, it } from 'vitest';
import { MOCK_INCIDENTS } from '../src/data/mockIncidents';
import {
  OPENROUTER_INTEGRATION_CODE_PY,
  OPENROUTER_INTEGRATION_CODE_TS,
  SYSTEM_PROMPT_WILDFIRE,
  USER_PROMPT_TEMPLATE,
  buildUserPrompt
} from '../src/prompts/masterFirePrompt';

const incident = MOCK_INCIDENTS.find((i) => i.hotspots.length > 0) || MOCK_INCIDENTS[0];

const meteo = {
  windSpeedKmh: 32,
  windDirectionCardinal: 'WNW',
  windDirectionDegrees: 292.5,
  ambientTemperatureC: 34.2,
  relativeHumidityPercent: 18
};

describe('buildUserPrompt', () => {
  it('sustituye los cuatro marcadores de USER_PROMPT_TEMPLATE', () => {
    const prompt = buildUserPrompt(incident, meteo);
    expect(prompt).not.toMatch(/\{\{[A-Z_]+\}\}/);
    for (const marker of ['FIRMS_PAYLOAD', 'IOT_PAYLOAD', 'COPERNICUS_PAYLOAD', 'METEO_PAYLOAD']) {
      expect(USER_PROMPT_TEMPLATE).toContain(`{{${marker}}}`);
    }
  });

  it('inyecta los payloads reales del incidente y la meteo', () => {
    const prompt = buildUserPrompt(incident, meteo);
    expect(prompt).toContain(JSON.stringify(incident.hotspots, null, 2));
    expect(prompt).toContain(JSON.stringify(incident.sensors, null, 2));
    expect(prompt).toContain(JSON.stringify(incident.copernicus, null, 2));
    expect(prompt).toContain('windDirectionCardinal');
    expect(prompt).toContain('WNW');
  });

  it('no modifica la plantilla original (es inmutable)', () => {
    buildUserPrompt(incident, meteo);
    expect(USER_PROMPT_TEMPLATE).toContain('{{METEO_PAYLOAD}}');
  });
});

describe('SYSTEM_PROMPT_WILDFIRE', () => {
  it('declara identidad, fuentes y salida JSON estricta', () => {
    expect(SYSTEM_PROMPT_WILDFIRE).toContain('NatureIntelligence-AI');
    expect(SYSTEM_PROMPT_WILDFIRE).toContain('FIRMS');
    expect(SYSTEM_PROMPT_WILDFIRE).toMatch(/JSON/i);
  });
});

describe('snippets de integración', () => {
  // Líneas de código reales (sin comentarios): lo que un copia-pega ejecuta.
  const tsCode = OPENROUTER_INTEGRATION_CODE_TS.split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
  const pyCode = OPENROUTER_INTEGRATION_CODE_PY.split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');

  it('el snippet TS importa SYSTEM_PROMPT_WILDFIRE y valida el status de OpenRouter', () => {
    expect(OPENROUTER_INTEGRATION_CODE_TS).toContain(
      "import { SYSTEM_PROMPT_WILDFIRE } from './prompts/masterFirePrompt'"
    );
    expect(OPENROUTER_INTEGRATION_CODE_TS).toContain('if (!openRouterResponse.ok)');
    // response_format no es compatible con todos los proveedores de OpenRouter
    expect(tsCode).not.toContain('response_format');
  });

  it('el snippet Python define SYSTEM_PROMPT_WILDFIRE y usa max_tokens', () => {
    expect(OPENROUTER_INTEGRATION_CODE_PY).toContain(
      "SYSTEM_PROMPT_WILDFIRE = open('system_prompt.txt', encoding='utf-8').read()"
    );
    expect(OPENROUTER_INTEGRATION_CODE_PY).toContain('max_tokens');
    expect(pyCode).not.toContain('response_format');
  });
});
