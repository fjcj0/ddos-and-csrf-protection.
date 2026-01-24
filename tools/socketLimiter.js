const blockedUsers = new Map(); 
const rateLimits = new Map(); 
export function socketRateLimit({ limit, interval, blockTime = 15 * 60 * 1000 }) {
    return (socket, next) => {
        const userKey = socket.handshake.address;
        const now = Date.now();
        if (blockedUsers.has(userKey)) {
            const unblockTime = blockedUsers.get(userKey);
            if (now < unblockTime) {
                socket.emit('error', 'You are temporarily blocked due to rate limiting');
                socket.disconnect(true);
                return;
            } else {
                blockedUsers.delete(userKey);
            }
        }
        if (!rateLimits.has(userKey)) {
            rateLimits.set(userKey, { count: 0, start: now });
        }
        const rate = rateLimits.get(userKey);
        if (now - rate.start > interval) {
            rate.count = 0;
            rate.start = now;
        }
        rate.count += 1;
        if (rate.count > limit) {
            blockedUsers.set(userKey, now + blockTime); 
            rateLimits.delete(userKey); 
            socket.emit('error', 'Rate limit exceeded. You are blocked for 15 minutes.');
            socket.disconnect(true);
            return;
        }
        next();
    };
}