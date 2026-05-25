const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../middleware/asyncHandler");
const { JWT_EXPIRATION, JWT_SECRET } = require("../config/config");

const sanitizeString = (value) => String(value || "").trim();
const validateEmail = (email) => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const validateName = (name) => typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 50;
const normalizePreferences = (preferences) => preferences
  .filter((item) => typeof item === "string")
  .map((item) => sanitizeString(item).slice(0, 50))
  .filter(Boolean)
  .slice(0, 20);

const registerUser = asyncHandler(async (req, res, next) => {
  const name = sanitizeString(req.body.name);
  const email = sanitizeString(req.body.email).toLowerCase();
  const password = String(req.body.password || "");

  if (!validateName(name) || !validateEmail(email) || password.length < 8 || password.length > 128) {
    const error = new Error("Invalid registration data");
    error.statusCode = 400;
    return next(error);
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    const error = new Error("User already exists");
    error.statusCode = 409;
    return next(error);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword
  });

  res.status(201).json({
    message: "User created",
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  });
});

const loginUser = asyncHandler(async (req, res, next) => {
  const email = sanitizeString(req.body.email).toLowerCase();
  const password = String(req.body.password || "");

  if (!validateEmail(email) || password.length < 8 || password.length > 128) {
    const error = new Error("Invalid email or password");
    error.statusCode = 400;
    return next(error);
  }

  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    return next(error);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    return next(error);
  }

  res.status(200).json({
    message: "Login successful",
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  });
});

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION
  });
};

const updatePreferences = asyncHandler(async (req, res, next) => {
  const preferences = req.body.preferences;

  if (!Array.isArray(preferences)) {
    const error = new Error("Preferences must be an array");
    error.statusCode = 400;
    return next(error);
  }

  const sanitizedPreferences = normalizePreferences(preferences);
  if (sanitizedPreferences.length === 0) {
    const error = new Error("Preferences must contain at least one valid item");
    error.statusCode = 400;
    return next(error);
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }

  user.preferences = sanitizedPreferences;
  const updatedUser = await user.save();

  res.status(200).json({
    message: "Preferences updated",
    preferences: updatedUser.preferences
  });
});

module.exports = { registerUser, loginUser, updatePreferences };