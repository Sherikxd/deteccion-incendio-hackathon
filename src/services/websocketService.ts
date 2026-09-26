export type StreamChannel = 'all' | 'telemetry' | 'incidents' | 'analysis' | 'alerts' | 'system';

export interface WebSocketMessage {
  channel: StreamChannel;
  type: string;
  timestamp: string;
  data?: any;
  [key: string]: any;
}

export type MessageListener = (msg: WebSocketMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageListener> = new Set();
  private statusListeners: Set<(connected: boolean, latencyMs?: number) => void> = new Set();
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private pingStartTime: number = 0;
  private isConnected: boolean = false;
  private subscribedChannels: StreamChannel[] = ['all'];
  // Messages sent while the socket is still CONNECTING are queued and flushed on open,
  // otherwise ws.send() silently drops them (readyState !== OPEN).
  private outboundQueue: string[] = [];
  // Distinguishes a deliberate disconnect() from a network drop, so the auto-reconnect
  // loop does not resurrect a socket the user/app intentionally closed.
  private manuallyClosed: boolean = false;

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.manuallyClosed = false;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyStatus(true);
        this.startPing();
        // Subscribe to configured channels
        this.send({
          type: 'subscribe',
          channels: this.subscribedChannels
        });
        // Flush anything that was queued while the handshake was in progress
        this.flushOutboundQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed: WebSocketMessage = JSON.parse(event.data);
          if (parsed.type === 'pong') {
            const latency = Date.now() - this.pingStartTime;
            this.notifyStatus(true, latency);
          }
          this.listeners.forEach((listener) => listener(parsed));
        } catch (e) {
          console.error('Error parsing WebSocket message', e);
        }
      };

      this.ws.onclose = () => {
        this.cleanup();
        // Anything still queued was never flushed: the handshake failed, so don't
        // replay stale frames on a future reconnect.
        this.outboundQueue = [];
        if (this.manuallyClosed) return;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket client error', err);
        this.cleanup();
      };
    } catch (e) {
      console.error('Failed to create WebSocket', e);
      this.scheduleReconnect();
    }
  }

  private cleanup() {
    this.isConnected = false;
    this.notifyStatus(false);
    if (this.pingInterval) clearInterval(this.pingInterval);
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  private startPing() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.pingStartTime = Date.now();
        this.send({ type: 'ping' });
      }
    }, 10000);
  }

  public send(data: any): boolean {
    const json = JSON.stringify(data);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(json);
      return true;
    }
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      this.outboundQueue.push(json);
      return true;
    }
    return false;
  }

  private flushOutboundQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const pending = this.outboundQueue.splice(0, this.outboundQueue.length);
    pending.forEach((json) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(json);
      }
    });
  }

  public isConnectedNow(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  public setSubscribedChannels(channels: StreamChannel[]) {
    this.subscribedChannels = channels;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'subscribe',
        channels
      });
    }
  }

  public requestAiStream(prompt: string, model: string = 'anthropic/claude-3.5-sonnet') {
    return this.send({
      type: 'request_ai_stream',
      model,
      prompt
    });
  }

  public publishTelemetry(sensor: any) {
    return this.send({
      type: 'publish_telemetry',
      sensor
    });
  }

  public addMessageListener(listener: MessageListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public addStatusListener(listener: (connected: boolean, latencyMs?: number) => void) {
    this.statusListeners.add(listener);
    listener(this.isConnected);
    return () => this.statusListeners.delete(listener);
  }

  private notifyStatus(connected: boolean, latencyMs?: number) {
    this.statusListeners.forEach((l) => l(connected, latencyMs));
  }

  public disconnect() {
    this.manuallyClosed = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.outboundQueue = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
  }
}

export const wsClient = new WebSocketClient();
