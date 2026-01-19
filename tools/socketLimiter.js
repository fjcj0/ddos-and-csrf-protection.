export function socketRateLimit({ limit, interval }) {
    return (socket, next) => {
        const now = Date.now();
        if (!socket.data.rateLimit) {
            socket.data.rateLimit = {
                count: 0,
                start: now,
            };
        }
        const rate = socket.data.rateLimit;
        if (now - rate.start > interval) {
            rate.count = 0;
            rate.start = now;
        }
        rate.count += 1;
        if (rate.count > limit) {
            socket.emit('error', 'Rate limit exceeded');
            socket.disconnect(true);
            return;
        }
        next();
    };
}