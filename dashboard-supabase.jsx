import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://pxihtxmuuneezhyexgdw.supabase.co";
const SUPABASE_KEY = "sb_publishable_oK4MgpS7Jt7V1WqZNE-ZAw_s6TA-K4v";

const api = async (path, method = "GET", body = null) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];
const TYPE_ICONS = { movie: "🎬", show: "📺", game: "🎮", book: "📚", music: "🎵" };
const PRIORITY_COLORS = { high: "#ff4d6d", medium: "#ff9f1c", low: "#2ec4b6" };
const STATUS_COLORS = { want: "#7b5ea7", watching: "#ff9f1c", done: "#2ec4b6" };

const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export default function Dashboard() {
  const [tab, setTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [entertainment, setEntertainment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  // Task form
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState("medium");

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", time: "09:00", day: "Mon", color: "#7b5ea7" });

  // Entertainment form
  const [showEntForm, setShowEntForm] = useState(false);
  const [newEnt, setNewEnt] = useState({ title: "", type: "movie", status: "want" });
  const [entFilter, setEntFilter] = useState("all");

  const withSync = async (fn) => {
    setSyncing(true);
    try { await fn(); } catch (e) { setError("Sync error: " + e.message); }
    finally { setSyncing(false); }
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, e, en] = await Promise.all([
        api("tasks?order=created_at.asc"),
        api("events?order=created_at.asc"),
        api("entertainment?order=created_at.asc"),
      ]);
      setTasks(t || []);
      setEvents(e || []);
      setEntertainment(en || []);
    } catch (e) {
      setError("Could not connect to Supabase: " + e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Tasks
  const addTask = () => {
    if (!newTask.trim()) return;
    withSync(async () => {
      const [created] = await api("tasks", "POST", { text: newTask, done: false, priority: newPriority });
      setTasks(t => [...t, created]);
      setNewTask("");
    });
  };
  const toggleTask = (task) => withSync(async () => {
    await api(`tasks?id=eq.${task.id}`, "PATCH", { done: !task.done });
    setTasks(t => t.map(x => x.id === task.id ? { ...x, done: !x.done } : x));
  });
  const deleteTask = (id) => withSync(async () => {
    await api(`tasks?id=eq.${id}`, "DELETE");
    setTasks(t => t.filter(x => x.id !== id));
  });

  // Events
  const addEvent = () => {
    if (!newEvent.title.trim()) return;
    withSync(async () => {
      const [created] = await api("events", "POST", newEvent);
      setEvents(e => [...e, created]);
      setNewEvent({ title: "", time: "09:00", day: "Mon", color: "#7b5ea7" });
      setShowEventForm(false);
    });
  };
  const deleteEvent = (id) => withSync(async () => {
    await api(`events?id=eq.${id}`, "DELETE");
    setEvents(e => e.filter(x => x.id !== id));
  });

  // Entertainment
  const addEnt = () => {
    if (!newEnt.title.trim()) return;
    withSync(async () => {
      const [created] = await api("entertainment", "POST", { ...newEnt, rating: 0 });
      setEntertainment(e => [...e, created]);
      setNewEnt({ title: "", type: "movie", status: "want" });
      setShowEntForm(false);
    });
  };
  const deleteEnt = (id) => withSync(async () => {
    await api(`entertainment?id=eq.${id}`, "DELETE");
    setEntertainment(e => e.filter(x => x.id !== id));
  });
  const updateEnt = (id, patch) => withSync(async () => {
    await api(`entertainment?id=eq.${id}`, "PATCH", patch);
    setEntertainment(e => e.map(x => x.id === id ? { ...x, ...patch } : x));
  });

  const filteredEnt = entFilter === "all" ? entertainment : entertainment.filter(e => e.status === entFilter);
  const doneCount = tasks.filter(t => t.done).length;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080810", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", color: "#7b5ea7" }}>
      <div style={{ fontSize: 32, marginBottom: 16, animation: "spin 1s linear infinite" }}>◈</div>
      <div style={{ fontSize: 13, color: "#444", letterSpacing: "0.15em" }}>CONNECTING TO SUPABASE...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080810", fontFamily: "'DM Sans', sans-serif", color: "#e2e2f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #2a2a40; }
        input, select { outline: none; font-family: inherit; }
        .btn { cursor: pointer; transition: all 0.15s; border: none; font-family: inherit; }
        .btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .del { opacity: 0; transition: opacity 0.15s; }
        .row:hover .del { opacity: 1; }
        .card { background: #0f0f1a; border: 1px solid #1c1c2e; border-radius: 14px; }
        .inp { background: #13131f; border: 1px solid #22223a; border-radius: 10px; color: #e2e2f0; padding: 10px 14px; font-size: 13px; transition: border-color 0.2s; width: 100%; }
        .inp:focus { border-color: #7b5ea7; }
        select.inp option { background: #13131f; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fadein { animation: fadeIn 0.25s ease forwards; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      {/* Sync indicator */}
      {syncing && (
        <div style={{ position: "fixed", top: 16, right: 16, background: "#7b5ea7", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", zIndex: 999, animation: "pulse 1s infinite" }}>
          ⟳ SYNCING
        </div>
      )}

      {error && (
        <div style={{ background: "#ff4d6d22", border: "1px solid #ff4d6d44", color: "#ff4d6d", padding: "10px 20px", fontSize: 12, textAlign: "center", fontFamily: "'DM Mono', monospace" }}>
          ⚠ {error} — <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={loadAll}>retry</span>
        </div>
      )}

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 24px 60px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36, flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
              COMMAND <span style={{ color: "#7b5ea7" }}>CENTER</span>
            </div>
            <div style={{ fontSize: 12, color: "#333", marginTop: 6, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}>{today.toUpperCase()}</div>
            <div style={{ fontSize: 10, color: "#2ec4b6", marginTop: 4, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>● LIVE SYNC · SUPABASE</div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { v: `${doneCount}/${tasks.length}`, l: "tasks", c: "#2ec4b6" },
              { v: events.length, l: "events", c: "#7b5ea7" },
              { v: entertainment.length, l: "tracked", c: "#ff9f1c" },
            ].map(s => (
              <div key={s.l} style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.c, fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 10, color: "#333", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginTop: 2 }}>{s.l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: "#0c0c18", borderRadius: 12, padding: 4, width: "fit-content", marginBottom: 24 }}>
          {[{ id: "tasks", icon: "✓", label: "Tasks" }, { id: "schedule", icon: "⊞", label: "Schedule" }, { id: "entertainment", icon: "★", label: "Entertainment" }].map(t => (
            <button key={t.id} className="btn" onClick={() => setTab(t.id)} style={{
              padding: "9px 22px", borderRadius: 9, fontSize: 13, fontWeight: 500,
              background: tab === t.id ? "#7b5ea7" : "transparent",
              color: tab === t.id ? "#fff" : "#444",
              letterSpacing: "0.01em",
            }}>{t.icon}  {t.label}</button>
          ))}
        </div>

        {/* ── TASKS ── */}
        {tab === "tasks" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="fadein">
            <div className="card" style={{ padding: 18, gridColumn: "1/-1", display: "flex", gap: 10 }}>
              <input className="inp" placeholder="Add a new task…" value={newTask}
                onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} />
              <select className="inp" value={newPriority} onChange={e => setNewPriority(e.target.value)} style={{ width: 120 }}>
                <option value="high">🔴 High</option>
                <option value="medium">🟠 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
              <button className="btn" onClick={addTask} style={{ background: "#7b5ea7", color: "#fff", borderRadius: 10, padding: "10px 22px", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>+ Add</button>
            </div>

            {[{ label: "Pending", done: false }, { label: "Completed", done: true }].map(col => (
              <div key={col.label} className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#333", letterSpacing: "0.12em", marginBottom: 14 }}>{col.label.toUpperCase()} · {tasks.filter(t => t.done === col.done).length}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {tasks.filter(t => t.done === col.done).map(task => (
                    <div key={task.id} className="row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, background: "#0a0a14", opacity: task.done ? 0.5 : 1 }}>
                      <div onClick={() => toggleTask(task)} style={{
                        width: 17, height: 17, borderRadius: 5, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
                        background: task.done ? "#2ec4b6" : "transparent",
                        border: task.done ? "none" : "2px solid #22223a",
                        color: "#fff",
                      }}>{task.done ? "✓" : ""}</div>
                      <div style={{ flex: 1, fontSize: 13, textDecoration: task.done ? "line-through" : "none" }}>{task.text}</div>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: PRIORITY_COLORS[task.priority], flexShrink: 0 }} />
                      <button className="btn del" onClick={() => deleteTask(task.id)} style={{ color: "#ff4d6d", background: "none", fontSize: 16, padding: "0 4px" }}>×</button>
                    </div>
                  ))}
                  {tasks.filter(t => t.done === col.done).length === 0 && (
                    <div style={{ color: "#222", fontSize: 12, fontFamily: "'DM Mono', monospace", padding: "6px 0" }}>{col.done ? "nothing yet" : "all clear! 🎉"}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {tab === "schedule" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }} className="fadein">
            <div className="card" style={{ padding: 18 }}>
              {!showEventForm ? (
                <button className="btn" onClick={() => setShowEventForm(true)} style={{ background: "transparent", border: "1px dashed #22223a", borderRadius: 9, color: "#444", padding: "10px 20px", fontSize: 13, width: "100%", fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}>+ ADD EVENT</button>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input className="inp" placeholder="Event title" value={newEvent.title} onChange={e => setNewEvent(n => ({ ...n, title: e.target.value }))} style={{ flex: "1 1 180px" }} />
                  <select className="inp" value={newEvent.day} onChange={e => setNewEvent(n => ({ ...n, day: e.target.value }))} style={{ width: 85 }}>{DAYS.map(d => <option key={d}>{d}</option>)}</select>
                  <input className="inp" type="time" value={newEvent.time} onChange={e => setNewEvent(n => ({ ...n, time: e.target.value }))} style={{ width: 110 }} />
                  <select className="inp" value={newEvent.color} onChange={e => setNewEvent(n => ({ ...n, color: e.target.value }))} style={{ width: 120 }}>
                    <option value="#7b5ea7">🟣 Purple</option>
                    <option value="#ff9f1c">🟠 Orange</option>
                    <option value="#2ec4b6">🟢 Teal</option>
                    <option value="#ff4d6d">🔴 Red</option>
                    <option value="#4ea8de">🔵 Blue</option>
                  </select>
                  <button className="btn" onClick={addEvent} style={{ background: "#7b5ea7", color: "#fff", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: 13 }}>Add</button>
                  <button className="btn" onClick={() => setShowEventForm(false)} style={{ background: "transparent", border: "1px solid #22223a", color: "#555", borderRadius: 10, padding: "10px 16px", fontSize: 13 }}>Cancel</button>
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 18, overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)", minWidth: 560 }}>
                <div />
                {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#333", letterSpacing: "0.1em", paddingBottom: 12 }}>{d}</div>)}
                {HOURS.map(hour => (
                  <>
                    <div key={hour + "t"} style={{ fontSize: 9, color: "#2a2a3a", fontFamily: "'DM Mono', monospace", paddingTop: 7, paddingRight: 8, textAlign: "right" }}>{hour}</div>
                    {DAYS.map(day => {
                      const evs = events.filter(e => e.day === day && e.time === hour);
                      return (
                        <div key={day + hour} style={{ borderTop: "1px solid #111120", minHeight: 38, padding: "3px 2px" }}>
                          {evs.map(ev => (
                            <div key={ev.id} className="row" style={{ background: ev.color + "18", borderLeft: `2px solid ${ev.color}`, borderRadius: 5, padding: "3px 6px", fontSize: 10, color: ev.color, fontWeight: 500, display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 70 }}>{ev.title}</span>
                              <button className="btn del" onClick={() => deleteEvent(ev.id)} style={{ color: "#ff4d6d", background: "none", fontSize: 11, padding: 0, marginLeft: 2 }}>×</button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ENTERTAINMENT ── */}
        {tab === "entertainment" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }} className="fadein">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 3, background: "#0c0c18", borderRadius: 10, padding: 3 }}>
                {["all", "want", "watching", "done"].map(s => (
                  <button key={s} className="btn" onClick={() => setEntFilter(s)} style={{
                    padding: "7px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                    background: entFilter === s ? "#1a1a2e" : "transparent",
                    color: entFilter === s ? "#e2e2f0" : "#333",
                    fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em",
                  }}>{s === "want" ? "🔖 WANT" : s === "watching" ? "▶ ACTIVE" : s === "done" ? "✓ DONE" : "ALL"}</button>
                ))}
              </div>
              <button className="btn" onClick={() => setShowEntForm(!showEntForm)} style={{ background: "#7b5ea7", color: "#fff", borderRadius: 10, padding: "9px 18px", fontWeight: 600, fontSize: 13, marginLeft: "auto" }}>+ Add</button>
            </div>

            {showEntForm && (
              <div className="card fadein" style={{ padding: 16 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input className="inp" placeholder="Title…" value={newEnt.title} onChange={e => setNewEnt(n => ({ ...n, title: e.target.value }))} style={{ flex: "1 1 180px" }} />
                  <select className="inp" value={newEnt.type} onChange={e => setNewEnt(n => ({ ...n, type: e.target.value }))} style={{ width: 120 }}>
                    {Object.entries(TYPE_ICONS).map(([k, v]) => <option key={k} value={k}>{v} {k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
                  </select>
                  <select className="inp" value={newEnt.status} onChange={e => setNewEnt(n => ({ ...n, status: e.target.value }))} style={{ width: 130 }}>
                    <option value="want">🔖 Want</option>
                    <option value="watching">▶ Watching</option>
                    <option value="done">✓ Done</option>
                  </select>
                  <button className="btn" onClick={addEnt} style={{ background: "#7b5ea7", color: "#fff", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: 13 }}>Add</button>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
              {filteredEnt.map(item => (
                <div key={item.id} className="card row fadein" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 26 }}>{TYPE_ICONS[item.type] || "🎭"}</span>
                    <button className="btn del" onClick={() => deleteEnt(item.id)} style={{ color: "#ff4d6d", background: "none", fontSize: 18 }}>×</button>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{item.title}</div>
                    <div style={{ fontSize: 10, color: "#333", fontFamily: "'DM Mono', monospace", marginTop: 3 }}>{item.type.toUpperCase()}</div>
                  </div>
                  <select className="inp" value={item.status} onChange={e => updateEnt(item.id, { status: e.target.value })} style={{ fontSize: 12, padding: "6px 10px" }}>
                    <option value="want">🔖 Want</option>
                    <option value="watching">▶ Watching</option>
                    <option value="done">✓ Done</option>
                  </select>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4,5].map(s => (
                      <span key={s} onClick={() => updateEnt(item.id, { rating: s })} style={{ cursor: "pointer", fontSize: 16, color: s <= item.rating ? "#ff9f1c" : "#1e1e30", transition: "transform 0.1s" }}
                        onMouseEnter={e => e.target.style.transform = "scale(1.3)"}
                        onMouseLeave={e => e.target.style.transform = "scale(1)"}>★</span>
                    ))}
                  </div>
                </div>
              ))}
              {filteredEnt.length === 0 && <div style={{ color: "#222", fontSize: 12, fontFamily: "'DM Mono', monospace", padding: "20px 0" }}>nothing here yet</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
