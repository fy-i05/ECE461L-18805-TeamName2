import React, { useMemo, useState, Suspense } from "react";

// Lazy-load your Projects component (requires ./Projects.jsx)
const Projects = React.lazy(() => import("./Projects"));

// ---- simple auth api helpers ----
const API_BASE = "http://localhost:3001";

async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: email, password }),
  });
  if (!res.ok) throw new Error("Invalid email or password");
  const { user } = await res.json();
  return user; // { id, username }
}

async function apiMe() {
  const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
  if (!res.ok) return null;
  const { user } = await res.json();
  return user; // or null
}

async function apiLogout() {
  await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
}

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
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  const { user } = await res.json();
  return user; // { id, username }
}

// ---------- Demo Data ----------
const initialProjects = [
  { id: "JK3002", name: "Example Project", description: "This is an example Project." },
];

const initialHW = {
  HWSET1: { capacity: 250, checkedOut: 20 },
  HWSET2: { capacity: 300, checkedOut: 70 },
};

// ---------- Reusable UI ----------
function Card({ children, className = "" }) {
  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 ${className}`}>
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
        "w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 " +
        (props.className || "")
      }
    />
  );
}

function Button({ children, variant = "primary", ...rest }) {
  const base = "px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
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

// ---------- Login View ----------
function LoginView({ onLogin, onSignup }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">461 Portal</h1>
        <p className="text-center text-gray-500 mb-8">Sign in to continue</p>

        <div className="space-y-5">
          <div>
            <Label>Username</Label>
            <Input placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input placeholder="Enter password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button
            onClick={async () => {
              try {
                const user = await apiLogin(username, password);
                onLogin(user);
              } catch (e) {
                alert(e.message || "Login failed");
              }
            }}
          >
            Sign In
          </Button>

          <div className="text-center text-sm text-gray-600">
            <span>Don’t have an account? </span>
            <button
              className="underline underline-offset-2 hover:text-gray-800"
              onClick={async () => {
                if (!username || !password) return;
                try {
                  const user = await apiSignup(username, password);
                  onSignup(user);
                } catch (e) {
                  alert(e.message || "Signup failed");
                }
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

// ---------- Dashboard View ----------
function DashboardView({ user, projects, onOpenProject, onCreateProject }) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id || "");
  const [newProj, setNewProj] = useState({ name: "", id: "", description: "" });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">461 Portal</h1>
          <div className="text-sm text-gray-700">
            Welcome, <span className="font-semibold">{user?.username || "Name"}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid gap-6 md:grid-cols-5">
        {/* Open Project */}
        <Card className="p-6 md:col-span-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Open Project</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Project</Label>
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {p.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={() => selectedId && onOpenProject(selectedId)}>
                Open Project
              </Button>
            </div>
          </div>
        </Card>

        {/* Hardware Status */}
        <Card className="p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hardware Status</h2>
          <HWQuickStatus />
        </Card>

        {/* New Project */}
        <Card className="p-6 md:col-span-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Project</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Project Name</Label>
              <Input value={newProj.name} onChange={(e) => setNewProj({ ...newProj, name: e.target.value })} placeholder="Enter project name" />
            </div>
            <div>
              <Label>Project ID</Label>
              <Input value={newProj.id} onChange={(e) => setNewProj({ ...newProj, id: e.target.value })} placeholder="Unique ID" />
            </div>
            <div className="md:col-span-3">
              <Label>Description</Label>
              <Input
                value={newProj.description}
                onChange={(e) => setNewProj({ ...newProj, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <Button
                onClick={() => {
                  if (!newProj.name || !newProj.id) return;
                  onCreateProject({ id: newProj.id, name: newProj.name, description: newProj.description });
                  setNewProj({ name: "", id: "", description: "" });
                }}
              >
                Create Project
              </Button>
              <Button variant="secondary" onClick={() => setNewProj({ name: "", id: "", description: "" })}>
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {/* ✅ Active Projects (Lazy-Loaded MUI Section) */}
        <Card className="p-6 md:col-span-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Projects</h2>
          <div className="bg-white rounded-xl p-4">
            <Suspense fallback={<div className="text-sm text-gray-600">Loading Projects…</div>}>
              <Projects />
            </Suspense>
          </div>
        </Card>
      </main>
    </div>
  );
}

function HWQuickStatus() {
  const hw = initialHW;
  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(hw).map(([k, v]) => {
        const available = v.capacity - v.checkedOut;
        const pct = Math.round((available / v.capacity) * 100);
        return (
          <div key={k} className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="text-sm text-gray-500">{k}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
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

// ---------- Project Dashboard ----------
function ProjectView({ project, onBack }) {
  const [hwState, setHwState] = useState(initialHW);
  const [qty, setQty] = useState({ HWSET1: 0, HWSET2: 0 });

  const availability = useMemo(
    () => ({
      HWSET1: hwState.HWSET1.capacity - hwState.HWSET1.checkedOut,
      HWSET2: hwState.HWSET2.capacity - hwState.HWSET2.checkedOut,
    }),
    [hwState]
  );

  function adjust(type) {
    setHwState((prev) => {
      const next = { ...prev };
      for (const k of ["HWSET1", "HWSET2"]) {
        const change = qty[k] || 0;
        if (type === "checkout") {
          const can = Math.max(0, Math.min(change, prev[k].capacity - prev[k].checkedOut));
          next[k] = { ...prev[k], checkedOut: prev[k].checkedOut + can };
        } else {
          const can = Math.max(0, Math.min(change, prev[k].checkedOut));
          next[k] = { ...prev[k], checkedOut: prev[k].checkedOut - can };
        }
      }
      return next;
    });
    setQty({ HWSET1: 0, HWSET2: 0 });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack}>
              ← Back
            </Button>
            <h1 className="text-xl font-bold text-gray-900">461 Portal</h1>
          </div>
          <Button variant="secondary" onClick={onBack}>
            Exit Project
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid gap-6 md:grid-cols-5">
        <Card className="p-6 md:col-span-3">
          <h2 className="text-lg font-semibold text-gray-900">Project Info</h2>
          <p className="text-sm text-gray-600 mb-4">{project.name}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <div className="text-sm text-gray-500">ID</div>
              <div className="text-xl font-semibold text-gray-900 mt-1">{project.id}</div>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <div className="text-sm text-gray-500">Description</div>
              <div className="text-sm text-gray-900 mt-1">{project.description || "No description"}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hardware Summary</h2>
          <div className="space-y-4">
            {Object.keys(hwState).map((k) => {
              const s = hwState[k];
              const available = s.capacity - s.checkedOut;
              const pct = Math.round((available / s.capacity) * 100);
              return (
                <div key={k} className="p-4 rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-sm text-gray-500">{k}</div>
                      <div className="text-2xl font-bold text-gray-900">
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
        </Card>

        <Card className="p-6 md:col-span-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Request or Check in Hardware</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {Object.keys(hwState).map((k) => (
              <div key={k} className="md:col-span-2">
                <Label>
                  Units for {k} (available {availability[k]})
                </Label>
                <Input
                  inputMode="numeric"
                  value={qty[k] || 0}
                  onChange={(e) => {
                    const v = parseInt(e.target.value || "0", 10);
                    setQty((prev) => ({ ...prev, [k]: isNaN(v) ? 0 : Math.max(0, v) }));
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => adjust("checkout")}>Request Hardware</Button>
            <Button variant="secondary" onClick={() => adjust("checkin")}>
              Check in Hardware
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

// ---------- Root ----------
export default function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState(null);

  const activeProject = useMemo(() => projects.find((p) => p.id === activeProjectId) || null, [projects, activeProjectId]);

  if (!user) {
    return (
      <LoginView onLogin={(u) => setUser(u)} onSignup={(u) => setUser(u)} />
    );
  }

  if (activeProject && user) {
    return <ProjectView project={activeProject} onBack={() => setActiveProjectId(null)} />;
  }

  return (
    <DashboardView
      user={user}
      projects={projects}
      onOpenProject={(id) => setActiveProjectId(id)}
      onCreateProject={(p) => setProjects([...projects, p])}
    />
  );
}
