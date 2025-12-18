class SocketService {
    private socket: WebSocket | null = null;
    private listeners: ((data: any) => void)[] = [];

    connect() {
        // Docker এর বাইরে ব্রাউজার থেকে আমরা localhost:8000 এক্সেস করি
        this.socket = new WebSocket('ws://localhost:8000/ws/feed');

        this.socket.onopen = () => console.log("✅ Stream Connected");

        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'TICKER') {
                this.listeners.forEach(cb => cb(message.data));
            }
        };

        this.socket.onclose = () => {
            console.log("⚠️ Stream Disconnected. Reconnecting...");
            setTimeout(() => this.connect(), 3000);
        };
    }

    subscribe(callback: (data: any) => void) {
        this.listeners.push(callback);
    }
}

export const socketService = new SocketService();
