import cookieParser from 'cookie-parser';
import 'dotenv/config';
import express from "express";
import http from "http";
import { Server } from "socket.io";
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import { rateLimiter, speedLimiter, browserOnly } from './tools/DDosProtection.js';
import { socketRateLimit } from './tools/socketLimiter.js';
import generateCsrfToken from './tools/csrf.js';
import csrfProtection from './middleware/csrfProtection.js';
const app = express();
app.use(cookieParser(process.env.COOKIE_SECRET));
morgan.token('client-ip', (request) => {
    return request.ip || request.connection.remoteAddress;
});
app.use(morgan('➜ :method :url :status :response-time ms - :res[content-length] - :client-ip'));
app.use(helmet());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(browserOnly);
app.use(rateLimiter);
app.use(speedLimiter);
app.use((request, response, next) => {
    if (request.path === "/api/cron" || request.path === "/api/csrf-token") {
        return next();
    }
    return csrfProtection(request, response, next);
});
app.get("/api/csrf-token", (request, response) => {
    const csrfToken = generateCsrfToken();
    response.cookie("csrfToken", csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
    });
    response.status(201).json({ csrfToken });
});
app.get('/api/cron', (request, response) => {
    return response.status(200).json({
        success: true,
        message: 'cron job started....'
    });
});
if (process.env.NODE_ENV !== 'development') {
    job.start();
}
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: `http://localhost:5173`,
        credentials: true
    },
    pingTimeout: 20000,
    pingInterval: 25000
});
io.on("connection", (socket) => {
    socket.use(
        socketRateLimit({
            limit: 5,
            interval: 3000,
        })
    );
    console.log("Socket ID: ", socket.id);
    socket.on("disconnect", () => {
        console.log("User disconnected: ", socket.id);
    });
});
server.listen(process.env.PORT, () => {
    console.log(`➜ Server running at http://localhost:${process.env.PORT}`);
});