// App.jsx
// ============================================================================
// This is the ROOT of the React frontend for the EE461L HaaS Portal.
//
// It manages:
//   • Authentication state (login, signup, logout)
//   • Project storage (localStorage only, not DB)
//   • Loading hardware data from the backend
//   • Opening project views (DashboardView <-> ProjectView)
//   • All API calls for login/logout/hardware actions
//
// This entire file is what the exam questions will reference whenever you need to:
//   • Track history of checkouts
//   • Track duration of checkouts
//   • Add charging / auto-checkin timers
//
// All of those modifications would be added here + server.js.
// ============================================================================

import React, { useMemo, useState, useEffect, Suspense } from "react";

// Lazy-load Projects list view (improves performance)
const Projects = React.lazy(() => import("./Projects"));

// -----------------------------------------------------------------------------
// API Helpers — These wrap fetch() calls to the backend.
// Used in: Login, Signup, Hardware Checkout, Checkin, etc.
// -----------------------------------------------------------------------------

const API_BASE = "http://localhost:3001"; // backend URL

// ------------------ LOGIN API ------------------
async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    credentials: "include", // sends session cookie
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: email, password }),
  });
  if (!res.ok) throw new Error("Invalid email or password");
  const { user } = await res.json();
  return user;
}

// ------------------ SESSION CHECK ------------------
async function apiMe() {
  const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
  if (!res.ok) return null;
  const { user } = await res.json();
  return user;
}

// ------------------ LOGOUT ------------------
async function apiLogout() {
  await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
}

// ------------------ SIGNUP ------------------
async function apiSignup(username, password) {
  const res = await fetch(`${API_BASE}/api/signup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    let msg = "Signup failed";
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }

  const { user } = await res.json();
  return user;
}

// -----------------------------------------------------------------------------
// HARDWARE APIs — These correspond to server.js hardware routes
// -----------------------------------------------------------------------------

async function apiGetHardware() {
  const res = await fetch(`${API_BASE}/api/hardware`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch hardware");
  const { hardware } = await res.json();
  return hardware;
}

async function apiCheckoutHardware(name, quantity) {
  const res = await fetch(`${API_BASE}/api/hardware/${name}/checkout`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });

  if (!res.ok) {
    let msg = "Checkout failed";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }

  const { hardware } = await res.json();
  return hardware;
}

async function apiCheckinHardware(name, quantity) {
  const res = await fetch(`${API_BASE}/api/hardware/${name}/checkin`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });

  if (!res.ok) {
    let msg = "Checkin failed";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }

  const { hardware } = await res.json();
  return hardware;
}

// -----------------------------------------------------------------------------
// LocalStorage Helpers — Only projects are stored here.
// Users + hardware come from MongoDB.
// -----------------------------------------------------------------------------

const LS_KEYS = {
  PROJECTS: "ee461_projects",
};

const DEFAULT_PROJECTS = [
  { id: "JK3002", name: "Example Project", description: "This is an example Project.", members: [] },
];

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// -----------------------------------------------------------------------------
// Small UI Utility Components (Card, Label, Input, Button)
// These are stylistic wrappers.
// -----------------------------------------------------------------------------

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white/90 rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;
}

function Input(props) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-blue-500 bg-white text-gray-900 " +
        (props.className || "")
      }
    />
  );
}

function Button({ children, variant = "primary", ...rest }) {
  const base = "px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : variant === "secondary"
      ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
      : "bg-transparent text-gray-700 hover:bg-gray-100";
  return (
    <button {...rest} className={`${base} ${styles} ${rest.className || ""}`}>
      {children}
    </button>
  );
}

// ============================================================================
// LOGIN VIEW — Called when no user is logged in
// ============================================================================
function LoginView({ onLogin, onSignup }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Simple login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-2 text-center">461 Portal</h1>

        <div className="space-y-5">
          <div>
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <Button
            className="w-full"
            onClick={() => {
              if (!username || !password) return alert("Enter username and password");
              onLogin({ username, password });
            }}
          >
            Sign In
          </Button>

          <div className="text-center text-sm">
            Don't have an account?{" "}
            <button
              className="underline"
              onClick={() => {
                if (!username || !password) return alert("Enter username and password");
                onSignup(username, password);
              }}
            >
              Sign up
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// DASHBOARD VIEW — Shown after login, BEFORE opening a project.
// Displays:
//   • Open Project
//   • Hardware Global Status
//   • Join by ID
//   • Create Project
//   • Your Projects list
// ============================================================================
function DashboardView({ user, projects, onOpenProject, onCreateProject, onJoinById, onLogout, hw }) {
  const myProjects = useMemo(
    () => projects.filter((p) => p.members?.includes(user.username)),
    [projects, user.username]
  );

  // UI state
  const [selectedId, setSelectedId] = useState(myProjects[0]?.id || "");
  const [newProj, setNewProj] = useState({ name: "", id: "", description: "" });
  const [joinId, setJoinId] = useState("");

  // Renders dropdown for "Open Project"
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between">
          <h1 className="text-xl font-bold">461 Portal</h1>
          <div className="flex items-center gap-3">
            <div className="text-sm">Welcome, <b>{user.username}</b></div>
            <Button variant="secondary" onClick={onLogout}>Log out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid gap-6 md:grid-cols-5">
        
        {/* Open Existing Project */}
        <Card className="p-6 md:col-span-3">
          <h2 className="text-lg font-semibold mb-4">Open Project</h2>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {myProjects.length === 0 ? (
              <option>No projects yet</option>
            ) : (
              myProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.id}
                </option>
              ))
            )}
          </select>
          <Button className="mt-4 w-full" onClick={() => selectedId && onOpenProject(selectedId)}>
            Open Project
          </Button>
        </Card>

        {/* Global Hardware Status */}
        <Card className="p-6 md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Hardware Status</h2>
          <HWQuickStatus hw={hw} />
        </Card>

        {/* Join Project by ID */}
        <Card className="p-6 md:col-span-5">
          <h2 className="text-lg font-semibold mb-4">Join Existing Project</h2>
          <div className="flex gap-3">
            <Input placeholder="Project ID" value={joinId} onChange={(e) => setJoinId(e.target.value)} />
            <Button onClick={() => joinId && onJoinById(joinId)}>Join</Button>
          </div>
        </Card>

        {/* Create Project */}
        <Card className="p-6 md:col-span-5">
          <h2 className="text-lg font-semibold mb-4">New Project</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Project Name</Label>
              <Input value={newProj.name} onChange={(e) => setNewProj({ ...newProj, name: e.target.value })} />
            </div>
            <div>
              <Label>Project ID</Label>
              <Input value={newProj.id} onChange={(e) => setNewProj({ ...newProj, id: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Description</Label>
              <Input value={newProj.description} onChange={(e) => setNewProj({ ...newProj, description: e.target.value })} />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              onClick={() => {
                if (!newProj.name || !newProj.id) return alert("Enter name and ID");
                onCreateProject(newProj);
                setNewProj({ name: "", id: "", description: "" });
              }}
            >
              Create Project
            </Button>
            <Button variant="secondary" onClick={() => setNewProj({ name: "", id: "", description: "" })}>
              Clear
            </Button>
          </div>
        </Card>

        {/* Your Projects */}
        <Card className="p-6 md:col-span-5">
          <h2 className="text-lg font-semibold mb-4">Your Projects</h2>
          <Suspense fallback={<div className="text-sm">Loading Projects…</div>}>
            <Projects projects={myProjects} hw={hw} />
          </Suspense>
        </Card>

      </main>
    </div>
  );
}

// ============================================================================
// Hardware Quick Status — Shown on Dashboard
// ============================================================================
function HWQuickStatus({ hw }) {
  if (!hw) return <div className="text-sm text-gray-500">Loading...</div>;

  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(hw).map(([k, v]) => {
        const available = v.capacity - v.checkedOut;
        const pct = Math.round((available / v.capacity) * 100);
        return (
          <div key={k} className="p-4 border rounded-xl">
            <div className="text-sm text-gray-500">{k}</div>
            <div className="text-2xl font-bold">
              {available} / {v.capacity}
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full mt-3">
              <div className="h-2 bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// ProjectView — This is the page INSIDE a project.
// It shows:
//   • Project info
//   • Hardware summary
//   • Checkout / Checkin inputs
//
// NOTE FOR EXAM QUESTIONS:
// This is the EXACT place where you would add:
//   • Hardware checkout HISTORY
//   • Checkout TIMERS
//   • Charging $$$ calculations
// ============================================================================

function ProjectView({ project, onBack, onLogout, user, onHWChange }) {
  const [hwState, setHwState] = useState(null);  // Live hardware data
  const [qty, setQty] = useState({ HWSET1: 0, HWSET2: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load hardware when entering project
  const loadHardware = async () => {
    try {
      const hardware = await apiGetHardware();
      setHwState(hardware);
      setError(null);

      // Also notify Dashboard to refresh global state
      if (onHWChange) onHWChange();

    } catch (err) {
      setError(err.message);
    }
  };

  // On mount: load hardware
  useEffect(() => {
    loadHardware();
  }, []);

  // Compute availability numbers
  const availability = useMemo(() => {
    if (!hwState) return { HWSET1: 0, HWSET2: 0 };
    return {
      HWSET1: hwState.HWSET1.capacity - hwState.HWSET1.checkedOut,
      HWSET2: hwState.HWSET2.capacity - hwState.HWSET2.checkedOut,
    };
  }, [hwState]);

  // Handles checkout OR checkin
  async function adjust(type) {
    if (!hwState) return;

    setLoading(true);
    setError(null);

    try {
      for (const setName of ["HWSET1", "HWSET2"]) {
        const change = qty[setName];
        if (change <= 0) continue;

        if (type === "checkout") {
          await apiCheckoutHardware(setName, change);
        } else {
          await apiCheckinHardware(setName, change);
        }
      }

      // Reload after updating
      await loadHardware();

    } catch (err) {
      setError(err.message);
      alert(err.message);
    } finally {
      setLoading(false);
      setQty({ HWSET1: 0, HWSET2: 0 });
    }
  }

  // ------------------------------------------------------------------------
  // NOTE FOR EXAM QUESTION #1 (History):
  // You would call a new API here, like:
  //    await apiRecordHistory(user, project, setName, type, qty)
  // This is exactly where checkout events are captured.
  //
  // NOTE FOR QUESTION #2 (Duration):
  // Here you would ALSO record the timestamp of checkout.
  //
  // NOTE FOR QUESTION #3:
  // Auto-checkin + charging calculated here.
  // ------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack}>← Back</Button>
            <h1 className="text-xl font-bold">461 Portal</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm">Signed in as <b>{user.username}</b></div>
            <Button variant="secondary" onClick={onBack}>Exit Project</Button>
            <Button variant="secondary" onClick={onLogout}>Log out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid gap-6 md:grid-cols-5">

        {/* Project Info */}
        <Card className="p-6 md:col-span-3">
          <h2 className="text-lg font-semibold">Project Info</h2>
          <p className="text-sm text-gray-600">{project.name}</p>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div className="p-4 border rounded-xl">
              <div className="text-sm text-gray-500">ID</div>
              <div className="text-xl font-semibold">{project.id}</div>
            </div>
            <div className="p-4 border rounded-xl">
              <div className="text-sm text-gray-500">Description</div>
              <div className="text-sm">{project.description || "No description"}</div>
            </div>
          </div>
        </Card>

        {/* Hardware Summary */}
        <Card className="p-6 md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Hardware Summary</h2>

          {!hwState ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-4">
              {Object.keys(hwState).map((k) => {
                const s = hwState[k];
                const available = s.capacity - s.checkedOut;
                const pct = Math.round((available / s.capacity) * 100);

                return (
                  <div key={k} className="p-4 border rounded-xl">
                    <div className="flex justify-between">
                      <div>
                        <div className="text-sm text-gray-500">{k}</div>
                        <div className="text-2xl font-bold">
                          {available} / {s.capacity}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">{pct}% available</div>
                    </div>

                    <div className="w-full h-2 bg-gray-100 rounded-full mt-3">
                      <div className="h-2 bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Checkout / Checkin UI */}
        <Card className="p-6 md:col-span-5">
          <h2 className="text-lg font-semibold mb-4">Request or Check in Hardware</h2>

          {!hwState ? (
            <div className="text-sm">Loading...</div>
          ) : (
            <>
              <div className="grid md:grid-cols-4 gap-4">
                {Object.keys(hwState).map((k) => (
                  <div key={k}>
                    <Label>
                      Units for {k} (available {availability[k]})
                    </Label>
                    <Input
                      inputMode="numeric"
                      value={qty[k]}
                      onChange={(e) => {
                        const val = parseInt(e.target.value || "0", 10);
                        setQty((prev) => ({ ...prev, [k]: Math.max(0, val || 0) }));
                      }}
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-3">
                <Button onClick={() => adjust("checkout")} disabled={loading}>
                  {loading ? "Processing…" : "Request Hardware"}
                </Button>
                <Button variant="secondary" onClick={() => adjust("checkin")} disabled={loading}>
                  {loading ? "Processing…" : "Check in Hardware"}
                </Button>
              </div>
            </>
          )}
        </Card>

      </main>
    </div>
  );
}

// ============================================================================
// ROOT APP COMPONENT
// This controls the entire frontend state machine:
//
// Logged Out → LoginView
// Logged In → DashboardView
// Inside Project → ProjectView
//
// Also loads hardware from backend and persists projects.
// ============================================================================

export default function App() {
  // Seed projects on first load
  useEffect(() => {
    if (!localStorage.getItem(LS_KEYS.PROJECTS)) {
      saveJSON(LS_KEYS.PROJECTS, DEFAULT_PROJECTS);
    }
  }, []);

  // Global app state
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState(loadJSON(LS_KEYS.PROJECTS, DEFAULT_PROJECTS));
  const [hw, setHW] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState(null);

  // Persist projects to localStorage
  useEffect(() => saveJSON(LS_KEYS.PROJECTS, projects), [projects]);

  // Load hardware when user logs in
  useEffect(() => {
    if (user) {
      apiGetHardware().then(setHW).catch(console.error);
    } else {
      setHW(null);
    }
  }, [user]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  // Check if already logged in on page refresh
  useEffect(() => {
    apiMe().then((user) => user && setUser(user)).catch(() => {});
  }, []);

  // Auth handlers
  const handleSignup = async (username, password) => {
    try {
      const u = await apiSignup(username, password);
      setUser(u);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogin = async ({ username, password }) => {
    try {
      const u = await apiLogin(username, password);
      setUser(u);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    setUser(null);
    setActiveProjectId(null);
  };

  // Project creation
  const handleCreateProject = ({ id, name, description }) => {
    if (projects.some((p) => p.id === id)) {
      return alert("Project ID already exists");
    }
    const newProject = { id, name, description, members: [user.username] };
    setProjects([...projects, newProject]);
  };

  // Join project by ID
  const handleJoinById = (joinId) => {
    const idx = projects.findIndex((p) => p.id === joinId);
    if (idx < 0) {
      alert("Project ID not found");
      return false;
    }

    const proj = projects[idx];

    // Add membership if not already present
    if (!proj.members.includes(user.username)) {
      const updated = { ...proj, members: [...proj.members, user.username] };
      const next = [...projects];
      next[idx] = updated;
      setProjects(next);
    }

    setActiveProjectId(joinId);
    alert(`Joined project ${proj.name} (${proj.id})`);
    return true;
  };

  // Open project
  const handleOpenProject = (id) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj.members.includes(user.username)) {
      return alert("You are not a member");
    }
    setActiveProjectId(id);
  };

  // Refresh hardware from backend
  const refreshHardware = async () => {
    if (user) {
      setHW(await apiGetHardware());
    }
  };

  // -----------------------------------------
  // VIEW ROUTING
  // -----------------------------------------

  if (!user) {
    return <LoginView onLogin={handleLogin} onSignup={handleSignup} />;
  }

  if (activeProject) {
    return (
      <ProjectView
        project={activeProject}
        onBack={() => {
          setActiveProjectId(null);
          refreshHardware(); // refresh dashboard hardware
        }}
        onLogout={handleLogout}
        user={user}
        onHWChange={refreshHardware}
      />
    );
  }

  return (
    <DashboardView
      user={user}
      projects={projects}
      hw={hw}
      onOpenProject={handleOpenProject}
      onCreateProject={handleCreateProject}
      onJoinById={handleJoinById}
      onLogout={handleLogout}
    />
  );
}