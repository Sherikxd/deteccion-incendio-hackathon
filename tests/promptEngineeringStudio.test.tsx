import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PromptEngineeringStudio } from '../src/components/PromptEngineeringStudio';
import { MOCK_INCIDENTS } from '../src/data/mockIncidents';
import { buildUserPrompt } from '../src/prompts/masterFirePrompt';

const incident = MOCK_INCIDENTS.find((i) => i.hotspots.length > 0) || MOCK_INCIDENTS[0];

describe('PromptEngineeringStudio', () => {
  afterEach(cleanup);

  const renderStudio = () => render(<PromptEngineeringStudio currentIncident={incident} />);

  it('renderiza el system prompt maestro y las 3 reglas opcionales activas', () => {
    const { container } = renderStudio();

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes.every((c) => c.checked)).toBe(true);

    const pre = container.querySelector('pre')!;
    expect(pre.textContent).toContain('NatureIntelligence-AI');
    expect(pre.textContent).toContain('ZONIFICACIÓN AGRÍCOLA');
    expect(pre.textContent).toContain('FORMATO CAP / SMS');
    expect(screen.getByText(/3 de 3 activas/)).toBeDefined();
  });

  it('desactivar un toggle quita su bloque del prompt efectivo (antes estaban muertos)', () => {
    const { container } = renderStudio();

    fireEvent.click(screen.getByText('Zonificación agrícola (caña)'));

    const pre = container.querySelector('pre')!;
    expect(pre.textContent).not.toContain('ZONIFICACIÓN AGRÍCOLA');
    // el resto de reglas siguen
    expect(pre.textContent).toContain('POLÍGONO INDUSTRIAL CONOCIDO');
    expect(pre.textContent).toContain('FORMATO CAP / SMS');
    expect(screen.getByText(/2 de 3 activas/)).toBeDefined();
    expect(pre.textContent).toContain('NatureIntelligence-AI'); // el base nunca se cae
  });

  it('el payload de usuario inyectado sale de buildUserPrompt sin marcadores', () => {
    const { container } = renderStudio();

    fireEvent.click(screen.getByText('User Payload Inyectado'));

    const pre = container.querySelector('pre')!;
    expect(pre.textContent).not.toContain('{{');
    // el título vive en el encabezado de la pestaña, el payload sale de buildUserPrompt
    expect(screen.getByText(incident.title)).toBeDefined();
    expect(pre.textContent).toContain('windDirectionCardinal');
    expect(pre.textContent).toContain(JSON.stringify(incident.hotspots, null, 2));
  });

  it('el payload inyectado no puede divergir de buildUserPrompt', () => {
    const { container } = renderStudio();
    fireEvent.click(screen.getByText('User Payload Inyectado'));

    const expected = buildUserPrompt(incident, {
      windSpeedKmh: incident.sensors[0]?.metrics.windSpeedKmh ?? 25,
      windDirectionCardinal: incident.sensors[0]?.metrics.windDirectionCardinal ?? 'SW',
      windDirectionDegrees: incident.sensors[0]?.metrics.windDirectionDeg ?? 220,
      ambientTemperatureC: incident.sensors[0]?.metrics.tempC ?? 32,
      relativeHumidityPercent: incident.sensors[0]?.metrics.humidityPercent ?? 15
    });

    expect(container.querySelector('pre')!.textContent).toBe(expected);
    expect(expected).not.toContain('{{');
  });

  it('el botón de copiar da feedback real cuando el portapapeles funciona', async () => {
    renderStudio();

    fireEvent.click(screen.getByText('Copiar System Prompt'));

    await waitFor(() =>
      expect(screen.getByText('¡Copiado al Portapapeles!')).toBeDefined()
    );
  });

  it('muestra los snippets TS y Python en sus pestañas', () => {
    renderStudio();

    fireEvent.click(screen.getByText('Integración Node.js (Proxy)'));
    expect(document.body.textContent).toContain('openRouterResponse.ok');

    fireEvent.click(screen.getByText('Script Python'));
    expect(document.body.textContent).toContain('max_tokens');
    expect(document.body.textContent).toContain('SYSTEM_PROMPT_WILDFIRE');
  });
});
