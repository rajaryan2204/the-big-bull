// THE BIG BULL - Resilient Client-Side Socket.IO Client
import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export function getSocketClient(token?: string | null, clientType?: "board" | "admin" | "team"): Socket {
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  // Re-instantiate if token or clientType changed
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  socketInstance = io({
    path: "/socket.io",
    auth: {
      token: token || "",
      clientType: clientType || "team",
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  return socketInstance;
}
