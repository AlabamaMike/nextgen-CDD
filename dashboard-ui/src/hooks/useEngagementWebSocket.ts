import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';


interface UseEngagementWebSocketOptions {
    engagementId?: string;
    token?: string;
    enabled?: boolean;
}

export function useEngagementWebSocket({
    engagementId,
    token,
    enabled = true,
}: UseEngagementWebSocketOptions) {
    const queryClient = useQueryClient();
    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);

    useEffect(() => {
        if (!enabled || !engagementId || !token) {
            return;
        }

        // Close existing connection if any
        if (socketRef.current) {
            socketRef.current.close();
        }

        // Construct WebSocket URL
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBaseUrl}/engagements/${engagementId}/events?token=${token}`;

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('[WebSocket] Connected');
            setIsConnected(true);
        };

        ws.onclose = () => {
            console.log('[WebSocket] Disconnected');
            setIsConnected(false);
            socketRef.current = null;
        };

        ws.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                setLastMessage(message);

                if (message.type === 'event' && message.payload) {
                    const payload = message.payload;

                    // Invalidate queries based on event type
                    // 'hypothesis.created', 'hypothesis.updated', 'evidence.new', etc.

                    if (payload.type.startsWith('hypothesis.')) {
                        queryClient.invalidateQueries({ queryKey: ['hypothesis-tree', engagementId] });
                        queryClient.invalidateQueries({ queryKey: ['hypotheses', engagementId] });
                    }

                    if (payload.type.startsWith('evidence.')) {
                        queryClient.invalidateQueries({ queryKey: ['evidence', engagementId] });
                        queryClient.invalidateQueries({ queryKey: ['evidence-stats', engagementId] });
                    }

                    if (payload.type === 'research.progress') {
                        // Maybe update a specific job status, but mostly we care about data updates for now
                    }
                }

            } catch (err) {
                console.error('[WebSocket] Failed to parse message:', err);
            }
        };

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [engagementId, token, enabled, queryClient]);

    return { isConnected, lastMessage };
}
