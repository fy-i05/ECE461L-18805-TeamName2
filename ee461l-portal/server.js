// server.js
import express from "express";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
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
      secure: false,
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ee461l_portal";
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

// --- Models ---
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// (removed in-memory USERS; now using MongoDB)

// auth guard (optional example)
function requireAuth(req, _res, next) {
  if (req.session?.user) return next();
  return _res.status(401).json({ error: "Not authenticated" });
}

// routes
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/me", (req, res) => {
  if (!req.session?.user) return res.status(401).json({ user: null });
  const { id, username } = req.session.user;
  res.json({ user: { id, username } });
});

app.post("/api/signup", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    const existing = await User.findOne({ username: username.trim() });
    if (existing) return res.status(409).json({ error: "Username already exists" });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const doc = await User.create({ username: username.trim(), passwordHash });

    req.session.user = { id: doc._id.toString(), username: doc.username };
    return res.json({ user: req.session.user });
  } catch (err) {
    console.error("/api/signup error:", err.message);
    return res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    const user = await User.findOne({ username: username.trim() });
    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid username or password" });

    req.session.user = { id: user._id.toString(), username: user.username };
    return res.json({ user: req.session.user });
  } catch (err) {
    console.error("/api/login error:", err.message);
    return res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("ee461l.sid");
    res.json({ ok: true });
  });
});

// example protected route
app.get("/api/portal-summary", requireAuth, (_req, res) => {
  res.json({ message: "Welcome to the EE461L Portal!" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`EE461L API running on http://localhost:${PORT}`);
});
