/* ============================================
   纸条 PaperNote — WebSocket 客户端封装
   特性：心跳保活 / 指数退避重连 / 事件订阅 / 消息序号追踪
   ============================================ */

// ---------- 消息信封 ----------
export interface WsEnvelope {
  action: string;   // 动作名
  seq?: number;     // 服务端下发的消息序列号（客户端上行不带）
  data: Record<string, unknown>;
}

// ---------- 消息处理函数类型 ----------
export type MessageHandler = (env: WsEnvelope) => void;

// ---------- WebSocket 客户端 ----------
export class WsClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectDelay = 1000;
  private maxDelay = 16000;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private seq = 0;
  private token = '';
  private manualClose = false;
  private connectionId = 0;

  constructor(url: string) {
    this.url = url;
  }

  /** 建立 WebSocket 连接 */
  connect(token: string): void {
    if (!token) return;
    if (
      this.token === token &&
      (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.manualClose = true;
      this.ws.close();
      this.ws = null;
    }

    this.token = token;
    this.manualClose = false;
    const connectionId = ++this.connectionId;
    this.emit('connecting', { action: 'connecting', data: {} });
    const wsUrl = this.url || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`;
    this.ws = new WebSocket(`${wsUrl}?token=${token}`);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.startHeartbeat();
      this.emit('connected', { action: 'connected', data: {} });
    };

    this.ws.onmessage = (e: MessageEvent) => {
      const env: WsEnvelope = JSON.parse(e.data as string);
      if (env.seq) this.seq = env.seq;
      this.emit(env.action, env);
    };

    this.ws.onclose = () => {
      if (connectionId !== this.connectionId) return;
      this.stopHeartbeat();
      this.emit('disconnected', { action: 'disconnected', data: {} });
      if (!this.manualClose && this.token) {
        this.scheduleReconnect(this.token);
      }
    };

    this.ws.onerror = () => {
      // onclose 会在 onerror 之后触发，由 onclose 统管重连
    };
  }

  /** 发送消息 */
  send(action: string, data: Record<string, unknown> = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, data }));
    } else {
      this.emit('error', { action: 'error', data: { message: 'WebSocket 未连接，消息未发送' } });
    }
  }

  /** 订阅事件 */
  on(action: string, handler: MessageHandler): void {
    if (!this.handlers.has(action)) this.handlers.set(action, []);
    this.handlers.get(action)!.push(handler);
  }

  /** 取消订阅 */
  off(action: string, handler: MessageHandler): void {
    const list = this.handlers.get(action);
    if (list) this.handlers.set(action, list.filter((h) => h !== handler));
  }

  /** 断开连接 */
  disconnect(): void {
    this.manualClose = true;
    this.token = '';
    this.connectionId += 1;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
    this.emit('disconnected', { action: 'disconnected', data: {} });
  }

  /** 获取服务端最后下发的消息序列号 */
  getLastSeq(): number {
    return this.seq;
  }

  // ---------- 内部方法 ----------

  /** 广播事件给所有注册的 handler */
  private emit(action: string, env: WsEnvelope): void {
    this.handlers.get(action)?.forEach((h) => h(env));
  }

  /** 开启心跳（每 30 秒 ping 一次） */
  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      this.send('ping');
    }, 30000);
  }

  /** 停止心跳 */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** 指数退避重连：1s → 2s → 4s → 8s → 16s, max 16s */
  private scheduleReconnect(token: string): void {
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(token);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
    }, this.reconnectDelay);
  }
}

/** 全局单例 WebSocket 客户端 */
export const wsClient = new WsClient(
  import.meta.env.VITE_WS_URL || '',
);
