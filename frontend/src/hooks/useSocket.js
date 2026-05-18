import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import useAppStore from '../store/useAppStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

/**
 * Custom hook to access the authenticated Socket.io client instance
 * Enforces a singleton connection strategy across component mounts.
 */
export const useSocket = () => {
  const { accessToken, isAuthenticated } = useAppStore();
  const socketRef = useRef(null);

  useEffect(() => {
    // If not authenticated or token is missing, terminate any existing socket connection
    if (!isAuthenticated || !accessToken) {
      if (socketInstance) {
        console.log('[useSocket] Terminating unauthenticated socket connection.');
        socketInstance.disconnect();
        socketInstance = null;
      }
      return;
    }

    // Initialize socket connection singleton if not present
    if (!socketInstance) {
      console.log('[useSocket] Establishing secure connection handshake to:', SOCKET_URL);
      
      socketInstance = io(SOCKET_URL, {
        auth: {
          token: accessToken
        },
        transports: ['websocket'],
        reconnectionAttempts: 10,
        reconnectionDelay: 3000,
        autoConnect: true,
      });

      socketInstance.on('connect', () => {
        console.log(`[useSocket] WebSocket connection established successfully! Socket ID: ${socketInstance.id}`);
      });

      socketInstance.on('connect_error', (error) => {
        console.warn(`[useSocket] Connection handshake rejected: ${error.message}`);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log(`[useSocket] WebSocket connection detached. Reason: ${reason}`);
        if (reason === 'io server disconnect') {
          // Reconnect manually if the server kicked us out
          socketInstance.connect();
        }
      });
    }

    socketRef.current = socketInstance;
  }, [accessToken, isAuthenticated]);

  return socketRef.current || socketInstance;
};

export default useSocket;
