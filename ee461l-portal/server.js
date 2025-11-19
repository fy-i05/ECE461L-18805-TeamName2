// server.js
// -----------------------------------------
// This file is the backend server for the EE461L HaaS Portal.
// It handles:
//  - User accounts (signup/login/logout) using sessions
//  - Hardware resource storage, checkout, and checkin
//  - MongoDB for persistence
//  - API routes that the React frontend calls
// -----------------------------------------

import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const app = express();

// -----------------------------------------
// CORS — Allows frontend at localhost:5173 to talk to this backend
// Required for cookies/session to work during development
// -----------------------------------------
app.use(
  cors({
    origin: "http://localhost:5173", // frontend location
    credentials: true,               // allow cookies (needed for session auth)
  })
);

app.use(bodyParser.json());

// -----------------------------------------
// Session Middleware — Stores login sessions server-side
// This replaces the need for manual JWT tokens.
// When the user logs in, req.session.user is set.
// On future requests, backend checks session to authenticate.
// -----------------------------------------
app.use(
  session({
    name: "ee461l.sid",                        // name of session cookie
    secret: process.env.SESSION_SECRET || "dev-only-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,   // JS cannot access cookie (security)
      sameSite: "lax",  // allows local dev
      secure: false,    // OK for localhost
      maxAge: 1000 * 60 * 60 * 8, // 8 hours session
    },
  })
);

// ============================================================================
//                     MONGODB SCHEMAS & MODELS
// ============================================================================

// -----------------------
// USER MODEL
// Stores username + hashed password (never plain text)
// SN1: Create and manage user accounts
// -----------------------
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true }, // bcrypt hash
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// -----------------------
// HARDWARE MODEL
// Stores capacity + number currently checked out
// SN2: View hardware status
// SN3: Request hardware
// SN4: Checkout & manage resources
// SN5: Check-in hardware
// -----------------------
const hardwareSetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // "HWSET1" / "HWSET2"
    capacity: { type: Number, required: true, min: 0 },
    checkedOut: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const HardwareSet = mongoose.model("HardwareSet", hardwareSetSchema);

// -----------------------------------------
// initializeHardware()
// Runs on server startup.
// If hardware sets don’t exist in the DB, this function seeds them.
// Supports stakeholder need: global hardware capacity storage
// -----------------------------------------
async function initializeHardware() {
  try {
    const hwSets = await HardwareSet.find();
    if (hwSets.length === 0) {
      // Creates the default hardware sets
      await HardwareSet.create([
        { name: "HWSET1", capacity: 250, checkedOut: 20 },
        { name: "HWSET2", capacity: 300, checkedOut: 70 },
      ]);
      console.log("Hardware sets initialized: HWSET1 (250), HWSET2 (300)");
    } else {
      console.log(`Found ${hwSets.length} hardware set(s) in database`);
    }
  } catch (err) {
    console.error("Error initializing hardware:", err.message);
  }
}

// ============================================================================
//                           DATABASE CONNECTION
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("ERROR: Missing MongoDB URI in .env");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("MongoDB connected.");
    await initializeHardware(); // Seed hardware sets if needed
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });

// ============================================================================
//                           AUTH GUARD (Middleware)
// Use requireAuth on routes that need the user to be logged in.
// ============================================================================

function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

// ============================================================================
//                        ROUTES: BASIC AND AUTH
// ============================================================================

// Health check route for debugging
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Returns the currently logged-in user, if any
app.get("/api/me", (req, res) => {
  if (!req.session?.user) return res.status(401).json({ user: null });
  const { id, username } = req.session.user;
  res.json({ user: { id, username } });
});

// -----------------------
// SIGNUP
// Creates new user + stores bcrypt hash
// -----------------------
app.post("/api/signup", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Missing fields" });

    // Ensure unique username
    const existing = await User.findOne({ username: username.trim() });
    if (existing) return res.status(409).json({ error: "Username already exists" });

    const passwordHash = await bcrypt.hash(String(password), 10); // hashing password
    const doc = await User.create({ username: username.trim(), passwordHash });

    // Start session
    req.session.user = { id: doc._id.toString(), username: doc.username };
    return res.json({ user: req.session.user });
  } catch (err) {
    return res.status(500).json({ error: "Signup failed" });
  }
});

// -----------------------
// LOGIN
// Verifies password using bcrypt + sets session cookie
// -----------------------
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Missing fields" });

    const user = await User.findOne({ username: username.trim() });
    if (!user) return res.status(401).json({ error: "Invalid username/password" });

    // Compare password hash
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid username/password" });

    // Login successful → create session
    req.session.user = { id: user._id.toString(), username: user.username };
    return res.json({ user: req.session.user });
  } catch (err) {
    return res.status(500).json({ error: "Login failed" });
  }
});

// -----------------------
// LOGOUT → destroys session
// -----------------------
app.post("/api/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("ee461l.sid");
    res.json({ ok: true });
  });
});

// ============================================================================
//                         HARDWARE ROUTES (Core of Project)
// ============================================================================

// -----------------------
// GET /api/hardware
// Returns:
// {
//   HWSET1: { capacity, checkedOut },
//   HWSET2: { capacity, checkedOut }
// }
// -----------------------
app.get("/api/hardware", async (req, res) => {
  try {
    const hardwareSets = await HardwareSet.find().sort({ name: 1 });

    const hardware = {};
    hardwareSets.forEach((set) => {
      hardware[set.name] = {
        capacity: set.capacity,
        checkedOut: set.checkedOut,
      };
    });

    res.json({ hardware });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hardware" });
  }
});

// -----------------------
// POST /api/hardware/:name/checkout
// This updates checkedOut count in DB.
// Enforces business rules:
//  - Cannot checkout more than available
// SN3 + SN4
// -----------------------
app.post("/api/hardware/:name/checkout", requireAuth, async (req, res) => {
  try {
    const { name } = req.params;
    const { quantity } = req.body || {};

    const hwSet = await HardwareSet.findOne({ name: name.toUpperCase() });
    if (!hwSet) return res.status(404).json({ error: "Hardware not found" });

    const available = hwSet.capacity - hwSet.checkedOut;
    const qty = parseInt(quantity, 10);

    if (qty > available) {
      return res.status(400).json({
        error: `Insufficient hardware. Available: ${available}`,
        available,
      });
    }

    // Apply checkout
    hwSet.checkedOut += qty;
    await hwSet.save();

    res.json({
      hardware: {
        name: hwSet.name,
        capacity: hwSet.capacity,
        checkedOut: hwSet.checkedOut,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Checkout failed" });
  }
});

// -----------------------
// POST /api/hardware/:name/checkin
// Reduces checkedOut count.
// Enforces:
//  - Cannot check in more than currently checked out.
// SN5
// -----------------------
app.post("/api/hardware/:name/checkin", requireAuth, async (req, res) => {
  try {
    const { name } = req.params;
    const { quantity } = req.body || {};

    const hwSet = await HardwareSet.findOne({ name: name.toUpperCase() });
    if (!hwSet) return res.status(404).json({ error: "Not found" });

    const qty = parseInt(quantity, 10);

    if (qty > hwSet.checkedOut) {
      return res.status(400).json({
        error: `Cannot check in more than checked out.`,
        checkedOut: hwSet.checkedOut,
      });
    }

    hwSet.checkedOut -= qty;
    await hwSet.save();

    res.json({
      hardware: {
        name: hwSet.name,
        capacity: hwSet.capacity,
        checkedOut: hwSet.checkedOut,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Checkin failed" });
  }
});

// Protected example: Dashboard summary
app.get("/api/portal-summary", requireAuth, (_req, res) => {
  res.json({ message: "Welcome to the EE461L Portal!" });
});

// ============================================================================
//                              START SERVER
// ============================================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`EE461L API running on http://localhost:${PORT}`);
});