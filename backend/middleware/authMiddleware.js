const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../config/config");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    const error = new Error("Not authorized, no token provided");
    error.statusCode = 401;
    return next(error);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.id) {
      const error = new Error("Invalid authentication token");
      error.statusCode = 401;
      return next(error);
    }

    req.user = await User.findById(decoded.id).select("-password -__v");

    if (!req.user) {
      const error = new Error("Not authorized, user not found");
      error.statusCode = 401;
      return next(error);
    }

    return next();
  } catch (err) {
    const error = new Error("Not authorized, token invalid or expired");
    error.statusCode = 401;
    return next(error);
  }
};

module.exports = { protect };