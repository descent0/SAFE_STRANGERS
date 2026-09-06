

import { io } from "socket.io-client";

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
const SOCKET_CONFIG = {
  transports: ['websocket'],
  timeout: 5000,
}

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(socketUrl, SOCKET_CONFIG);
  }
  

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocketInstance = () => {
  if (!socket) {
    return connectSocket();
  }
  return socket;
};