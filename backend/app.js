const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const trendRoutes = require("./routes/trendRoutes");
const feedRoutes = require("./routes/feedRoutes");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFoundMiddleware");
const errorHandler = require("./middleware/errorMiddleware");
const { FRONTEND_URL } = require("./config/config");

connectDB();

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(mongoSanitize());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 600),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});

const corsOptions = {
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(generalLimiter);
app.use(requestLogger);

app.use("/api/users", userRoutes);
app.use("/api/trends", trendRoutes);
app.use("/api/feed", feedRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Backend running" });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
