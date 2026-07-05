

import { io } from "socket.io-client";
const SOCKET_CONFIG = {
  transports: ['websocket'],
  timeout: 5000,
}

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL,SOCKET_CONFIG);
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