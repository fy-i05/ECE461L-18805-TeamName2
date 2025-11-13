// server.js
import express from "express";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";

// --- Path Configuration (MUST be at the top) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Static File Middleware (MUST be before CORS) ---
// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, "dist")));

// --- CORS Configuration ---
// Set up allowed origins
const allowedOrigins = [
  "http://localhost:5173", // For local development
  process.env.FRONTEND_URL, // Your live Heroku frontend URL
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// --- Other Middleware ---
app.use(bodyParser.json());

app.use(
  session({
    name: "ee461l.sid",
    secret: process.env.SESSION_SECRET || "dev-only-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // TRUE in production
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// --- Models ---
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// --- Hardware Model ---
const hardwareSetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // "HWSET1" or "HWSET2"
    capacity: { type: Number, required: true, min: 0 },
    checkedOut: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

const HardwareSet = mongoose.model("HardwareSet", hardwareSetSchema);

// Initialize hardware sets if they don't exist
async function initializeHardware() {
  try {
    const hwSets = await HardwareSet.find();
    if (hwSets.length === 0) {
      await HardwareSet.create([
        { name: "HWSET1", capacity: 250, checkedOut: 20 },
        { name: "HWSET2", capacity: 300, checkedOut: 70 },
      ]);
      console.log(
        "Hardware sets initialized: HWSET1 (capacity: 250), HWSET2 (capacity: 300)"
      );
    } else {
      console.log(`Found ${hwSets.length} hardware set(s) in database`);
      hwSets.forEach((set) => {
        console.log(
          `  - ${set.name}: ${set.capacity - set.checkedOut}/${
            set.capacity
          } available`
        );
      });
    }
  } catch (err) {
    console.error("Error initializing hardware:", err.message);
  }
}

// --- MongoDB Connection ---
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ee461l_portal";
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log(
      `MongoDB connected to: ${MONGODB_URI.replace(/\/\/.*@/, "//***@")}`
    );
    console.log(`Database: ${mongoose.connection.db.databaseName}`);
    // Initialize hardware after successful connection
    await initializeHardware();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    console.error("Make sure MongoDB is running on localhost:27017");
  });

// auth guard (optional example)
function requireAuth(req, _res, next) {
  if (req.session?.user) return next();
  return _res.status(401).json({ error: "Not authenticated" });
}

// --- API Routes ---
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/me", (req, res) => {
  if (!req.session?.user) return res.status(401).json({ user: null });
  const { id, username } = req.session.user;
  res.json({ user: { id, username } });
});

app.post("/api/signup", async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res
        .status(503)
        .json({ error: "Database not connected. Please check MongoDB is running." });
    }

    const { username, password } = req.body || {};
    if (!username || !password)
      return res.status(400).json({ error: "Username and password required" });

    const existing = await User.findOne({ username: username.trim() });
    if (existing)
      return res.status(409).json({ error: "Username already exists" });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const doc = await User.create({ username: username.trim(), passwordHash });

    console.log(`User created: ${doc.username} (ID: ${doc._id})`);
    req.session.user = { id: doc._id.toString(), username: doc.username };
    return res.json({ user: req.session.user });
  } catch (err) {
    console.error("/api/signup error:", err.message);
    if (err.name === "MongoServerError" && err.code === 11000) {
      return res.status(409).json({ error: "Username already exists" });
    }
    return res.status(500).json({ error: err.message || "Signup failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res
        .status(503)
        .json({ error: "Database not connected. Please check MongoDB is running." });
    }

    const { username, password } = req.body || {};
    if (!username || !password)
      return res.status(400).json({ error: "Username and password required" });

    const user = await User.findOne({ username: username.trim() });
    if (!user)
      return res.status(401).json({ error: "Invalid username or password" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok)
      return res.status(401).json({ error: "Invalid username or password" });

    req.session.user = { id: user._id.toString(), username: user.username };
    return res.json({ user: req.session.user });
  } catch (err) {
    console.error("/api/login error:", err.message);
    return res.status(500).json({ error: err.message || "Login failed" });
  }
});

app.post("/api/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("ee461l.sid");
    res.json({ ok: true });
  });
});

// --- Hardware Routes ---
app.get("/api/hardware", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res
        .status(503)
        .json({ error: "Database not connected. Please check MongoDB is running." });
    }

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
    console.error("/api/hardware error:", err.message);
    res.status(500).json({ error: err.message || "Failed to fetch hardware" });
  }
});

app.post("/api/hardware/:name/checkout", requireAuth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res
        .status(503)
        .json({ error: "Database not connected. Please check MongoDB is running." });
    }

    const { name } = req.params;
    const { quantity } = req.body || {};

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be a positive number" });
    }

    const hwSet = await HardwareSet.findOne({ name: name.toUpperCase() });
    if (!hwSet) {
      return res.status(404).json({ error: `Hardware set ${name} not found` });
    }

    const available = hwSet.capacity - hwSet.checkedOut;
    const qty = parseInt(quantity, 10);

    if (qty > available) {
      return res.status(400).json({
        error: `Insufficient hardware. Available: ${available}, Requested: ${qty}`,
        available,
      });
    }

    hwSet.checkedOut += qty;
    await hwSet.save();

    console.log(
      `User ${req.session.user.username} checked out ${qty} units of ${hwSet.name}`
    );
    res.json({
      hardware: {
        name: hwSet.name,
        capacity: hwSet.capacity,
        checkedOut: hwSet.checkedOut,
      },
    });
  } catch (err) {
    console.error("/api/hardware/:name/checkout error:", err.message);
    res.status(500).json({ error: err.message || "Checkout failed" });
  }
});

app.post("/api/hardware/:name/checkin", requireAuth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res
        .status(503)
        .json({ error: "Database not connected. Please check MongoDB is running." });
    }

    const { name } = req.params;
    const { quantity } = req.body || {};

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be a positive number" });
    }

    const hwSet = await HardwareSet.findOne({ name: name.toUpperCase() });
    if (!hwSet) {
      return res.status(404).json({ error: `Hardware set ${name} not found` });
    }

    const qty = parseInt(quantity, 10);

    if (qty > hwSet.checkedOut) {
      return res.status(400).json({
        error: `Cannot check in more than checked out. Currently checked out: ${hwSet.checkedOut}, Requested: ${qty}`,
        checkedOut: hwSet.checkedOut,
      });
    }

    hwSet.checkedOut -= qty;
    await hwSet.save();

    console.log(
      `User ${req.session.user.username} checked in ${qty} units of ${hwSet.name}`
    );
    res.json({
      hardware: {
        name: hwSet.name,
        capacity: hwSet.capacity,
        checkedOut: hwSet.checkedOut,
      },
    });
  } catch (err) {
    console.error("/api/hardware/:name/checkin error:", err.message);
    res.status(500).json({ error: err.message || "Checkin failed" });
  }
});

// example protected route
app.get("/api/portal-summary", requireAuth, (_req, res) => {
  res.json({ message: "Welcome to the EE461L Portal!" });
});


// --- Catch-all Route (MUST be at the end, before listen) ---
// For any other route that’s not an API route, serve index.html
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`EE461L API running on http://localhost:${PORT}`);
});