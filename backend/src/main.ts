import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';
import http from 'http';
import v1Router from "@/router/v1.js";
import { initializeSocketService } from "@/services/socket.service.js";
import { CreditcoinIndexerService } from "@/features/creditcoin/creditcoin-indexer.service.js";
import { CREDITCOIN_CONFIG } from "@/features/creditcoin/creditcoin.config.js";

dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files
app.use(express.static('public'));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const socketService = initializeSocketService(server);

// Routes
app.use('/api/v1', v1Router);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Sanad Protocol API',
    version: '1.0.0',
    network: CREDITCOIN_CONFIG.chainName,
    chainId: CREDITCOIN_CONFIG.chainId,
    status: 'ACTIVE',
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
});

const PORT = process.env.PORT || 8000;

// Start Creditcoin EVM Event Indexer & Server
try {
  const indexer = new CreditcoinIndexerService();
  indexer.startListening();
} catch (indexerErr) {
  console.warn('[Indexer] Could not start indexer at boot:', indexerErr);
}

server.listen(PORT, () => {
  console.log(`\n================================================================`);
  console.log(`Sanad Protocol CC3 Backend is live on port ${PORT}`);
  console.log(`Network: ${CREDITCOIN_CONFIG.chainName} (Chain ID: ${CREDITCOIN_CONFIG.chainId})`);
  console.log(`Explorer: ${CREDITCOIN_CONFIG.explorerUrl}`);
  console.log(`Contracts:`);
  console.log(`  - SAGToken:           ${CREDITCOIN_CONFIG.contracts.sagTokenAddress}`);
  console.log(`  - SanadLiquidityPool: ${CREDITCOIN_CONFIG.contracts.liquidityPoolAddress}`);
  console.log(`================================================================\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});