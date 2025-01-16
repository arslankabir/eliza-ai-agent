process.env.NODE_OPTIONS = '--no-warnings'

import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import ElizaChatInterface from './eliza_chat.js';

class ElizaChatAPI {
    constructor() {
        this.app = express();
        
        // Comprehensive CORS configuration
        const corsOptions = {
            origin: [
                'http://localhost:5173',  // Vite dev server
                'http://127.0.0.1:5173',
                'http://localhost:3000',
                'http://127.0.0.1:3000'
            ],
            methods: ['GET', 'POST', 'OPTIONS', 'WEBSOCKET'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
            credentials: true,
            optionsSuccessStatus: 200
        };

        this.app.use(cors(corsOptions));

        this.server = http.createServer(this.app);
        this.wss = new WebSocketServer({ 
            server: this.server,
            clientTracking: true,
            verifyClient: (info, done) => {
                const origin = info.req.headers.origin || info.origin;
                const allowedOrigins = [
                    'http://localhost:5173',
                    'http://127.0.0.1:5173',
                    'http://localhost:3000',
                    'http://127.0.0.1:3000'
                ];

                const isAllowedOrigin = allowedOrigins.some(
                    allowed => origin && origin.includes(allowed)
                );

                console.log('WebSocket Connection Verification:', {
                    origin,
                    isAllowed: isAllowedOrigin
                });

                done(isAllowedOrigin);
            }
        });
        
        this.elizaChat = null;
    }

    // New async initialization method
    async initialize() {
        this.elizaChat = new ElizaChatInterface();
        await this.elizaChat.start(); // Default mode is terminal, but it won't block
        console.log("Initializing Eliza Chat API...");
    }

    initializeRoutes() {
        this.app.use(express.json());

        // Preflight route for CORS
        this.app.options('*', cors());

        // HTTP endpoint for chat
        this.app.post('/chat', async (req, res) => {
            try {
                const { message } = req.body;
                const response = await this.elizaChat.handleInput(message);
                res.json({ response });
            } catch (error) {
                console.error('Error handling HTTP request:', error);
                res.status(500).json({ error: "I apologize, but I encountered an error. Please try again." });
            }
        });

        // WebSocket connection handling
        this.wss.on('connection', (ws, req) => {
            const clientAddress = req.socket.remoteAddress;
            const clientPort = req.socket.remotePort;
            const origin = req.headers.origin;

            console.log('WebSocket Client Connection Details:', {
                timestamp: new Date().toISOString(),
                remoteAddress: clientAddress,
                remotePort: clientPort,
                origin: origin,
                headers: req.headers
            });
            
            // Unique client identifier
            const clientId = `${clientAddress}:${clientPort}`;
            
            ws.on('message', async (message) => {
                try {
                    const messageStr = message.toString();
                    console.log(`Message from client ${clientId}:`, {
                        timestamp: new Date().toISOString(),
                        message: messageStr
                    });

                    const response = await this.elizaChat.handleInput(messageStr);
                    console.log(`Response to client ${clientId}:`, {
                        timestamp: new Date().toISOString(),
                        response: response || 'No response generated'
                    });

                    // Ensure response is always sent
                    ws.send(JSON.stringify({ 
                        response: response || "I'm unable to generate a response right now." 
                    }));
                } catch (error) {
                    console.error(`Error handling message for client ${clientId}:`, {
                        timestamp: new Date().toISOString(),
                        error: {
                            name: error.name,
                            message: error.message,
                            stack: error.stack
                        }
                    });

                    ws.send(JSON.stringify({ 
                        response: "I apologize, but I encountered an error. Please try again." 
                    }));
                }
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, {
                    timestamp: new Date().toISOString(),
                    error: {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    }
                });
            });

            ws.on('close', (code, reason) => {
                console.log(`WebSocket client ${clientId} disconnected`, {
                    timestamp: new Date().toISOString(),
                    code: code,
                    reason: reason.toString()
                });
            });
        });

        // Additional error handling for WebSocket server
        this.wss.on('error', (error) => {
            console.error('WebSocket Server Error:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        });
    }

    async start(port = 3000) {
        // Initialize ElizaChatInterface before starting routes
        await this.initialize();
        
        this.initializeRoutes();
        
        // Enhanced server startup logging
        this.server.on('error', (error) => {
            console.error('Server startup error:', {
                name: error.name,
                message: error.message,
                code: error.code
            });
        });

        this.server.listen(port, '0.0.0.0', () => {
            console.log(`Eliza Chat API running on port ${port}`);
            console.log('Listening on all network interfaces');
            console.log('Server details:', this.server.address());
        });
    }
}

// Start the API asynchronously
async function startChatAPI() {
    const chatAPI = new ElizaChatAPI();
    await chatAPI.start();
}

startChatAPI().catch(console.error);

export default ElizaChatAPI;
