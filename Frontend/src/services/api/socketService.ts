class SocketService {
    private socket: WebSocket | null = null;
    private listeners: ((data: any) => void)[] = [];
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isExplicitDisconnect = false;

    connect(url: string = 'ws://localhost:8000/ws/feed') {
        if (this.socket?.readyState === WebSocket.OPEN) return;

        this.isExplicitDisconnect = false;
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log("✅ Stream Connected");
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                // সব মেসেজ লিসেনারদের কাছে পাঠানো হবে, যাতে তারা টাইপ চেক করে কাজ করতে পারে
                this.listeners.forEach(cb => cb(message));
            } catch (e) {
                console.error("Socket message parse error", e);
            }
        };

        this.socket.onclose = () => {
            if (!this.isExplicitDisconnect) {
                console.log("⚠️ Stream Disconnected. Reconnecting...");
                this.reconnectTimer = setTimeout(() => this.connect(url), 3000);
            }
        };

        this.socket.onerror = (err) => {
            console.error("❌ Socket Error:", err);
            this.socket?.close();
        };
    }

    send(data: any) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn("Socket not open, cannot send:", data);
        }
    }

    disconnect() {
        this.isExplicitDisconnect = true;
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    subscribe(callback: (data: any) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }
}

export const socketService = new SocketService();
