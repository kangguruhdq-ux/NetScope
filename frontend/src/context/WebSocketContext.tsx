import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface TelemetryUpdate {
  device_id: number;
  name?: string;
  status: string;
  latency_ms?: number | null;
  packet_loss_pct: number;
  cpu_usage_pct?: number | null;
  memory_usage_pct?: number | null;
  rx_bps: number;
  tx_bps: number;
  uptime_seconds?: number;
  last_seen?: string;
}

type WebSocketMessageHandler = (type: string, data: any) => void;

interface WebSocketContextType {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  lastTelemetry: TelemetryUpdate | null;
  registerHandler: (handler: WebSocketMessageHandler) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [lastTelemetry, setLastTelemetry] = useState<TelemetryUpdate | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<WebSocketMessageHandler>>(new Set());
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);

  const registerHandler = useCallback((handler: WebSocketMessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const connect = useCallback(() => {
    if (!token) return;

    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/ws/telemetry?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempt(0);

        // Keep-alive heartbeat ping every 15 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'METRIC_UPDATE') {
            setLastTelemetry(message.data);
          }
          // Notify registered handlers
          handlersRef.current.forEach((handler) => handler(message.type, message.data));
        } catch (_) {}
      };

      ws.onclose = (e) => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // If not closed intentionally and user is still authenticated, exponential backoff
        if (token && e.code !== 1008) {
          setIsReconnecting(true);
          setReconnectAttempt((prev) => {
            const nextAttempt = prev + 1;
            const delay = Math.min(30000, 1000 * Math.pow(1.8, nextAttempt));
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
            return nextAttempt;
          });
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (_) {
      setIsConnected(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      connect();
    } else {
      if (socketRef.current) {
        socketRef.current.close();
      }
      setIsConnected(false);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [token, connect]);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        isReconnecting,
        reconnectAttempt,
        lastTelemetry,
        registerHandler,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
