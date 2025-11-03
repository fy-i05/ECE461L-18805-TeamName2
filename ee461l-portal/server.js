// server.js
import express from "express";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser";

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
    secret: "dev-only-change-me",
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

// demo users (adjust as you like)
const USERS = [
  { id: "u1", email: "student@utexas.edu", name: "Student", password: "password123" },
];

// auth guard (optional example)
function requireAuth(req, _res, next) {
  if (req.session?.user) return next();
  return _res.status(401).json({ error: "Not authenticated" });
}

// routes
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/me", (req, res) => {
  if (!req.session?.user) return res.status(401).json({ user: null });
  const { id, email, name } = req.session.user;
  res.json({ user: { id, email, name } });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = USERS.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || user.password !== password) return res.status(401).json({ error: "Invalid email or password" });

  req.session.user = { id: user.id, email: user.email, name: user.name };
  res.json({ user: req.session.user });
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
