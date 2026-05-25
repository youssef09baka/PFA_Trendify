require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const trendRoutes = require("./routes/trendRoutes");
const feedRoutes = require("./routes/feedRoutes");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFoundMiddleware");
const errorHandler = require("./middleware/errorMiddleware");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
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
