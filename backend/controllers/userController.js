const User = require("../models/User");
const Trend = require("../models/Trend");
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
      email: user.email,
      preferences: user.preferences,
      aiRemaining: user.aiRemaining
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
      email: user.email,
      preferences: user.preferences,
      aiRemaining: user.aiRemaining
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

const saveTrend = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const trendId = req.params.id;

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    return next(error);
  }

  if (user.savedTrends.map(String).includes(String(trendId))) {
    return res.status(200).json({ message: 'Already saved', isSaved: true });
  }

  // check trend exists
  const trend = await Trend.findById(trendId);
  if (!trend) {
    const error = new Error('Trend not found');
    error.statusCode = 404;
    return next(error);
  }

  user.savedTrends.push(trend._id);
  await user.save();

  // increment savedCount (best-effort)
  await Trend.findByIdAndUpdate(trend._id, { $inc: { savedCount: 1 } }).catch(() => null);

  res.status(200).json({ message: 'Saved', isSaved: true });
});

const unsaveTrend = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const trendId = req.params.id;

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    return next(error);
  }

  const idx = user.savedTrends.map(String).indexOf(String(trendId));
  if (idx === -1) {
    return res.status(200).json({ message: 'Not saved', isSaved: false });
  }

  user.savedTrends.splice(idx, 1);
  await user.save();

  await Trend.findByIdAndUpdate(trendId, { $inc: { savedCount: -1 } }).catch(() => null);

  res.status(200).json({ message: 'Unsaved', isSaved: false });
});

const getSavedTrends = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).lean();
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    return next(error);
  }

  const ids = (user.savedTrends || []).map(String);
  const trends = await Trend.find({ _id: { $in: ids } }).lean();

  // preserve order of saved IDs
  const ordered = ids.map(id => trends.find(t => String(t._id) === id)).filter(Boolean);

  const items = ordered.map(t => ({
    id: t._id,
    title: t.title,
    score: t.score,
    source: t.source,
    category: t.category,
    image: t.image,
    shortAnalysis: t.analysis ? (t.analysis.length > 240 ? t.analysis.slice(0,237)+'...' : t.analysis) : '',
    ml_prediction: t.ml_prediction,
    createdAt: t.createdAt,
    savedCount: t.savedCount || 0
  }));

  res.status(200).json({ items, total: items.length });
});

module.exports = { registerUser, loginUser, updatePreferences, saveTrend, unsaveTrend, getSavedTrends };