import React, { useState } from 'react';
import { WhatsAppDispatchMessage } from '../types/fire';
import { INITIAL_WHATSAPP_DISPATCHES } from '../data/advancedSensors';
import {
  MessageSquare,
  Send,
  Check,
  CheckCheck,
  Flame,
  Radio,
  MapPin,
  ExternalLink,
  ShieldAlert,
  PhoneCall,
  BellRing,
  RotateCcw,
  Sparkles,
  Users
} from 'lucide-react';

export const WhatsAppBotDispatcher: React.FC = () => {
  const [messages, setMessages] = useState<WhatsAppDispatchMessage[]>(INITIAL_WHATSAPP_DISPATCHES);
  const [selectedGroup, setSelectedGroup] = useState<string>('Central X-1 Bomberos Cali');
  const [customSector, setCustomSector] = useState<string>('Cerro de las Tres Cruces & Bataclán');
  const [customRisk, setCustomRisk] = useState<'CRITICAL' | 'HIGH' | 'MODERATE'>('CRITICAL');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSendWhatsAppAlert = async () => {
    setIsSending(true);

    const newMsg: WhatsAppDispatchMessage = {
      id: `wa-msg-${Date.now()}`,
      recipientGroup: selectedGroup,
      recipientPhone:
        selectedGroup === 'Central X-1 Bomberos Cali'
          ? '+57 315 222 1119 (Oficiales de Guardia)'
          : '+57 318 555 4321 (Líderes Comunitarios)',
      timestamp: 'Ahora mismo',
      status: 'DELIVERED',
      alertId: `ALR-CALI-2026-${Math.floor(Math.random() * 900 + 100)}`,
      sector: customSector,
      riskLevel: customRisk,
      headline: `Alerta Táctica Automatizada: Detección activa en ${customSector}. Viento del Pacífico acelerando propagación.`,
      googleMapsUrl: 'https://maps.google.com/?q=3.4682,-76.5415',
      windSpeed: 32,
      windDir: 'WNW',
      unitsDispatched: ['Máquina 4 (Central)', 'Máquina 7 (Norte)', 'Forestal 1']
    };

    try {
      await fetch('/api/whatsapp/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg)
      });

      setMessages((prev) => [newMsg, ...prev]);
      setToastMessage(`¡Mensaje de WhatsApp despachado a ${selectedGroup}!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e) {
      console.error(e);
      // Fallback local append
      setMessages((prev) => [newMsg, ...prev]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base font-mono text-white">
                  Bot Automatizado de WhatsApp (Despacho Táctico Bomberos Cali)
                </h3>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
                  API Meta Cloud / Twilio Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Notificación instantánea a grupos de WhatsApp de Bomberos Cali (Central X-1), brigadas comunitarias de ladera y guardaparques.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Dispatch Controls */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs font-mono">
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Destinatario / Grupo:</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs text-white"
            >
              <option value="Central X-1 Bomberos Cali">Central X-1 Bomberos Cali</option>
              <option value="Brigada Comunitaria Ladera Siloé / Bataclán">Brigada Ladera Siloé / Bataclán</option>
              <option value="Guardaparques PNN Farallones">Guardaparques PNN Farallones</option>
              <option value="Comité DAGRD Alcaldía de Cali">Comité DAGRD Alcaldía</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Sector de Emergencia:</label>
            <input
              type="text"
              value={customSector}
              onChange={(e) => setCustomSector(e.target.value)}
              className="w-full bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs text-white"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Nivel de Prioridad:</label>
            <select
              value={customRisk}
              onChange={(e: any) => setCustomRisk(e.target.value)}
              className="w-full bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs text-amber-300"
            >
              <option value="CRITICAL">CRITICAL (Código Rojo)</option>
              <option value="HIGH">HIGH (Código Naranja)</option>
              <option value="MODERATE">MODERATE (Código Amarillo)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSendWhatsAppAlert}
              disabled={isSending}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow active:scale-95 disabled:opacity-50"
            >
              {isSending ? (
                <span>Despachando...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-700 rounded-xl text-emerald-200 text-xs flex items-center gap-2 shadow-xl animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Realistic WhatsApp Chat Emulator */}
      <div className="max-w-2xl mx-auto bg-[#0b141a] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        {/* WhatsApp Top Bar */}
        <div className="bg-[#202c33] px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white shadow">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-slate-100">
                  PyroWatch Valle • Despacho Bomberos Cali
                </span>
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[9px] font-bold">
                  ✓
                </span>
              </div>
              <p className="text-[11px] text-emerald-400">
                Bot Automatizado en Línea • Notificaciones Oficiales
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono bg-[#111b21] px-2.5 py-1 rounded text-slate-400 border border-slate-700">
            {messages.length} Despachos
          </div>
        </div>

        {/* WhatsApp Messages Feed */}
        <div
          className="p-4 space-y-3 min-h-[380px] max-h-[500px] overflow-y-auto"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(16, 185, 129, 0.03) 0%, rgba(11, 20, 26, 0.95) 100%)'
          }}
        >
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col items-start max-w-[90%] md:max-w-[80%]">
              <div className="bg-[#005c4b] text-slate-100 rounded-xl p-3.5 shadow-lg border border-emerald-600/30 space-y-2">
                {/* Header inside bubble */}
                <div className="flex items-center justify-between gap-2 border-b border-emerald-600/40 pb-1.5 text-xs font-mono">
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span>ALERTA {msg.riskLevel} BOMBEROS CALI</span>
                  </span>
                  <span className="text-[10px] text-emerald-200">{msg.alertId}</span>
                </div>

                {/* Message Body */}
                <div className="text-xs leading-relaxed space-y-1.5 font-sans">
                  <div>
                    <strong>📍 Sector:</strong> {msg.sector}
                  </div>
                  <div>
                    <strong>🔥 Situación:</strong> {msg.headline}
                  </div>
                  <div>
                    <strong>💨 Viento:</strong> {msg.windSpeed} km/h ({msg.windDir}) del Pacífico
                  </div>
                  {msg.unitsDispatched && (
                    <div>
                      <strong>🚒 Unidades Asignadas:</strong> {msg.unitsDispatched.join(', ')}
                    </div>
                  )}
                </div>

                {/* Action Buttons Mockup inside WhatsApp */}
                <div className="pt-2 border-t border-emerald-600/40 grid grid-cols-2 gap-1.5 text-center text-[11px] font-semibold">
                  <a
                    href={msg.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded bg-emerald-800/80 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 transition"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Ver en Google Maps</span>
                  </a>
                  <button
                    onClick={() => alert(`Confirmación de recepción transmitida a Central X-1 para ${msg.alertId}`)}
                    className="p-1.5 rounded bg-emerald-800/80 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 transition"
                  >
                    <span>🚒 Confirmar Móvil</span>
                  </button>
                </div>

                {/* Bubble Timestamp and Status */}
                <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/80 pt-1">
                  <span>{msg.timestamp}</span>
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
