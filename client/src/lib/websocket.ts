import { queryClient } from "./queryClient";

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isConnecting = false;

export function connectWebSocket() {
  if (ws || isConnecting) {
    return;
  }

  isConnecting = true;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port}/ws`;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      isConnecting = false;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      isConnecting = false;
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      ws = null;
      isConnecting = false;
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      reconnectTimeout = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };
  } catch (error) {
    console.error("Failed to create WebSocket:", error);
    isConnecting = false;
  }
}

function handleWebSocketMessage(message: { type: string; data: any }) {
  switch (message.type) {
    case 'initial_sync':
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      break;

    case 'produto_created':
    case 'produto_updated':
    case 'produto_deleted':
    case 'produtos_updated':
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
      break;

    case 'venda_created':
      queryClient.invalidateQueries({ queryKey: ["/api/vendas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/produtos"] });
      break;

    case 'config_updated':
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      break;

    default:
      console.log("Unknown message type:", message.type);
  }
}

export function disconnectWebSocket() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  isConnecting = false;
}
