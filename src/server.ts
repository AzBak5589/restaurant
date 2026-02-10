import http from "http";
import { Server as SocketIOServer } from "socket.io";
import createApp from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { redis } from "./config/redis";
import logger from "./config/logger";
import { initializeSocket } from "./config/socket";

const app = createApp();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: env.NODE_ENV === "development" ? true : env.CORS_ORIGIN.split(","),
    credentials: true,
  },
});

initializeSocket(io);

io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on("join:restaurant", (restaurantId: string) => {
    socket.join(`restaurant:${restaurantId}`);
    logger.info(`Socket ${socket.id} joined restaurant:${restaurantId}`);
  });

  socket.on("leave:restaurant", (restaurantId: string) => {
    socket.leave(`restaurant:${restaurantId}`);
    logger.info(`Socket ${socket.id} left restaurant:${restaurantId}`);
  });

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    await connectDatabase();

    server.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 API: http://localhost:${env.PORT}/api/v1`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  logger.info("Shutting down gracefully...");

  server.close(async () => {
    await disconnectDatabase();
    await redis.quit();
    logger.info("Server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

startServer();
