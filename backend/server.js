const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const cron = require("node-cron");
const { sendDailySummaryEmail } = require("./services/dailySummaryService");
const path = require("path");
// Load environment variables from .env
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const reportRoutes = require("./routes/reports");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const mapRoutes = require("./routes/map");
const chatRoutes = require("./routes/chat");
const geocodingRoutes = require("./routes/geocoding");
const weatherRoutes = require("./routes/weather");

// Import middleware
const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");

const app = express();
const server = http.createServer(app);

// CORS configuration - define before Socket.IO
// Prefer explicit FRONTEND_URL and CORS_ORIGIN envs; fall back to sensible dev defaults
const configuredOrigins = [];
if (process.env.FRONTEND_URL) configuredOrigins.push(process.env.FRONTEND_URL);
if (process.env.CORS_ORIGIN) {
  configuredOrigins.push(
    ...process.env.CORS_ORIGIN.split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  );
}
const corsOrigins = configuredOrigins.length
  ? configuredOrigins
  : process.env.NODE_ENV === "production"
  ? []
  : ["http://localhost:5173", "http://localhost:8080", "http://localhost:8080"];

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  },
});

app.set("io", io); // Make io available in req.app

// Socket.IO event handling
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  // Join admin room if user is admin
  socket.on("join-admin", () => {
    socket.join("admin");
    console.log("👑 Admin joined admin room");
  });

  // Join user room
  socket.on("join-user", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined user room`);
  });

  // Handle report updates
  socket.on("report-update", (data) => {
    console.log("📊 Report update:", data);
    io.emit("report:status", data);
  });

  // Handle new reports
  socket.on("new-report", (data) => {
    console.log("📝 New report:", data);
    io.emit("report:new", data);
  });

  // Handle admin actions
  socket.on("admin-action", (data) => {
    console.log("👑 Admin action:", data);
    io.emit("admin:action", data);
  });

  // Handle status updates
  socket.on("status-update", (data) => {
    console.log("🔄 Status update:", data);
    io.emit("status:update", data);
  });

  // Handle contractor assignment
  socket.on("contractor-assign", (data) => {
    console.log("👷 Contractor assignment:", data);
    io.emit("contractor:assign", data);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

// Make io available globally for controllers
app.set("io", io);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: (() => {
        const isProd = process.env.NODE_ENV === "production";
        const frontendUrl = process.env.FRONTEND_URL; // e.g. https://your-app.vercel.app
        const apiOrigin = process.env.API_ORIGIN || "";
        const base = {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://api.mapbox.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'", "https://accounts.google.com"],
          connectSrc: [
            "'self'",
            "https://accounts.google.com",
            "https://www.googleapis.com",
            "https://api.mapbox.com",
            isProd ? "https://events.mapbox.com" : "",
          ],
          manifestSrc: ["'self'"],
        };

        if (!isProd) {
          // Allow Vite dev server and Socket.IO in development
          base.connectSrc.push(
            "http://localhost:5173",
            "http://localhost:8080",
            `http://localhost:${process.env.PORT || 3001}`,
            "ws://localhost:5173",
            "ws://localhost:8080",
            `ws://localhost:${process.env.PORT || 3001}`
          );
          base.scriptSrc.push("'unsafe-eval'"); // needed by some dev toolchains
        }
        // In production, if FRONTEND_URL/API_ORIGIN provided, allow them
        if (isProd) {
          if (frontendUrl) {
            base.connectSrc.push(frontendUrl.replace(/\/$/, ""));
            base.connectSrc.push(
              frontendUrl.replace(/^http/, "ws").replace(/\/$/, "")
            );
          }
          if (apiOrigin) {
            base.connectSrc.push(apiOrigin.replace(/\/$/, ""));
            base.connectSrc.push(
              apiOrigin.replace(/^http/, "ws").replace(/\/$/, "")
            );
          }
        }

        return base;
      })(),
    },
  })
);

// Rate limiting
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
//   message: {
//     error: 'Too many requests from this IP, please try again later.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use('/api/', limiter); // <-- Commented out for debugging

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (corsOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "NagrikSetu API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/geocode", geocodingRoutes);
app.use("/api/weather", weatherRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.NODE_ENV === "production"
        ? process.env.MONGODB_URI_PROD
        : process.env.MONGODB_URI || "mongodb://localhost:27017/nagriksetu"
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`🚀 NagrikSetu API server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    // Schedule daily summary email at 9 AM every day
    cron.schedule(
      "0 9 * * *",
      async () => {
        console.log("📧 Running daily summary email task...");
        await sendDailySummaryEmail();
      },
      {
        timezone: "UTC",
      }
    );
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log("Shutting down the server due to uncaught exception");
  process.exit(1);
});

startServer();

module.exports = { app, io };
