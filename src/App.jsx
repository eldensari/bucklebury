import { useState, useRef, useEffect } from "react";
import raftIcon from "./raft-icon.png";

/* ═══════ MARKDOWN ═══════ */
function renderInline(text, keyRef) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIdx = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(<span key={keyRef.k++}>{text.slice(lastIdx, match.index)}</span>);
    if (match[2]) parts.push(<strong key={keyRef.k++}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={keyRef.k++}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={keyRef.k++} style={{ background: "#e8e8e4", padding: "1px 4px", borderRadius: 3, fontSize: "0.9em", fontFamily: "monospace" }}>{match[4]}</code>);
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push(<span key={keyRef.k++}>{text.slice(lastIdx)}</span>);
  return parts;
}

function renderMd(text) {
  if (!text) return null;
  const kr = { k: 0 };
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      i++; // skip closing ```
      elements.push(
        <pre key={kr.k++} style={{ background: "#1e1e2e", color: "#cdd6f4", padding: "10px 12px", borderRadius: 8, fontSize: 12, lineHeight: 1.5, overflowX: "auto", fontFamily: "monospace", margin: "6px 0" }}>
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }
    // Headings
    if (line.startsWith("### ")) { elements.push(<div key={kr.k++} style={{ fontSize: 13, fontWeight: 700, margin: "10px 0 4px" }}>{renderInline(line.slice(4), kr)}</div>); i++; continue; }
    if (line.startsWith("## ")) { elements.push(<div key={kr.k++} style={{ fontSize: 14, fontWeight: 700, margin: "12px 0 4px" }}>{renderInline(line.slice(3), kr)}</div>); i++; continue; }
    if (line.startsWith("# ")) { elements.push(<div key={kr.k++} style={{ fontSize: 16, fontWeight: 700, margin: "14px 0 4px" }}>{renderInline(line.slice(2), kr)}</div>); i++; continue; }
    // Unordered list
    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
      elements.push(<ul key={kr.k++} style={{ margin: "4px 0", paddingLeft: 20 }}>{items.map(it => <li key={kr.k++} style={{ fontSize: 13, lineHeight: 1.7 }}>{renderInline(it, kr)}</li>)}</ul>);
      continue;
    }
    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, "")); i++; }
      elements.push(<ol key={kr.k++} style={{ margin: "4px 0", paddingLeft: 20 }}>{items.map(it => <li key={kr.k++} style={{ fontSize: 13, lineHeight: 1.7 }}>{renderInline(it, kr)}</li>)}</ol>);
      continue;
    }
    // Empty line = paragraph break
    if (line.trim() === "") { elements.push(<div key={kr.k++} style={{ height: 6 }} />); i++; continue; }
    // Normal paragraph
    elements.push(<div key={kr.k++} style={{ fontSize: 13, lineHeight: 1.7 }}>{renderInline(line, kr)}</div>);
    i++;
  }
  return elements;
}

/* ═══════ THINKING DOTS ═══════ */
function ThinkingDots() {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const interval = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
    return () => clearInterval(interval);
  }, []);
  return <span>Thinking{dots}<span style={{ visibility: "hidden" }}>{"...".slice(dots.length)}</span></span>;
}

/* ═══════ PROVIDER DETECTION ═══════ */
function detectProvider(key) {
  if (!key) return null;
  const k = key.trim();
  if (k.startsWith("sk-ant-")) return { id: "anthropic", name: "Anthropic", color: "#D97706" };
  if (k.startsWith("sk-") || k.startsWith("sk-proj-")) return { id: "openai", name: "OpenAI", color: "#10A37F" };
  if (k.startsWith("AI")) return { id: "gemini", name: "Gemini", color: "#4285F4" };
  return null;
}

/* ═══════ LLM ═══════ */
async function callLLM(apiKey, messages) {
  // Route through Electron main process (Node.js) — no CORS
  return await window.electronAPI.callLLM(apiKey, messages);
}

async function validateKey(key) {
  try {
    await callLLM(key, [{ role: "user", content: "hello" }]);
    return { ok: true };
  } catch (e) {
    // Parse friendly error from raw IPC error message
    const raw = e.message || "";
    if (raw.includes("credit balance is too low")) return { ok: false, error: "Credit balance is too low. Please add credits at console.anthropic.com." };
    if (raw.includes("Invalid API key") || raw.includes("401")) return { ok: false, error: "Invalid API key." };
    if (raw.includes("Could not resolve") || raw.includes("ENOTFOUND") || raw.includes("fetch failed")) return { ok: false, error: "Network error. Check your internet connection." };
    // Extract message from JSON error body if present
    const msgMatch = raw.match(/"message"\s*:\s*"([^"]+)"/);
    if (msgMatch) return { ok: false, error: msgMatch[1] };
    return { ok: false, error: raw.replace(/^Error invoking remote method '[^']+':?\s*/i, "") };
  }
}

/* ═══════ DATA ═══════ */
let cc = 0;
function mkId() { return "c" + (++cc) + "_" + Math.random().toString(36).slice(2, 5); }
function mkCommit(parentId, prompt, response, branch, mergeIds) {
  return { id: mkId(), parentId, mergeIds: mergeIds || [], prompt, response, branch, ts: Date.now() };
}
function getThread(commits, hid) {
  const t = []; let id = hid; const v = new Set();
  while (id && !v.has(id)) { v.add(id); const c = commits.find(x => x.id === id); if (!c) break; t.unshift(c); id = c.parentId; }
  return t;
}
function bNames(c) { return [...new Set(c.map(x => x.branch))]; }
function bHead(c, b) { const bc = c.filter(x => x.branch === b); return bc.length ? bc[bc.length - 1] : null; }

/* ═══════ COLORS ═══════ */
const BC = ["#1D9E75", "#378ADD", "#D85A30", "#D4537E", "#7F77DD", "#BA7517", "#E24B4A", "#639922"];
function bCol(names, b) { return BC[names.indexOf(b) % BC.length] || "#888"; }

/* ═══════ GIT GRAPH ═══════ */
function Graph({ commits, headId, activeBranch, names, onCheckout, onEdit, onNew, onDelete, mergeMode, selected, onToggleSel, parentRef, onGoToParent, childRefs, onGoToChild, hoveredCid, panelW }) {
  const [ctx, setCtx] = useState(null);

  const hasParent = !!parentRef;
  const sorted = [...commits].sort((a, b) => a.ts - b.ts);

  // Build visual nodes: ghost parent + prompt/response pairs
  const vnodes = [];
  if (hasParent) {
    vnodes.push({ vid: "ghost", cid: null, type: "ghost", branch: "main", label: parentRef.promptSummary || "Parent conversation", parentVid: null, mergeVids: [] });
  }
  sorted.forEach(cm => {
    vnodes.push({ vid: cm.id + "_p", cid: cm.id, type: "p", branch: cm.branch, label: cm.prompt || "", parentVid: cm.parentId ? cm.parentId + "_r" : (hasParent ? "ghost" : null), mergeVids: (cm.mergeIds || []).map(m => m + "_r") });
    const aiSum = cm.response ? cm.response.replace(/\*\*/g, "").replace(/\n/g, " ").trim() : "...";
    vnodes.push({ vid: cm.id + "_r", cid: cm.id, type: "r", branch: cm.branch, label: aiSum, parentVid: cm.id + "_p", mergeVids: [] });
    // Child ghost nodes — conversations forked from this commit
    if (childRefs) {
      childRefs.filter(cr => cr.commitId === cm.id).forEach(cr => {
        vnodes.push({ vid: "child_" + cr.convId, cid: null, type: "child", branch: cm.branch, label: cr.convTitle, parentVid: cm.id + "_r", mergeVids: [], childConvId: cr.convId });
      });
    }
  });

  if (!vnodes.length) return <div style={{ padding: 20, textAlign: "center", color: "#aaa", fontSize: 12 }}>Start a conversation</div>;

  const lW = 22, rH = 36, pL = 18, nR = 6;
  const lX = pL + Math.max(names.length, 1) * lW + 10;
  const W = panelW || 280, H = vnodes.length * rH + 30;
  const maxChars = Math.max(12, Math.floor((W - lX - 20) / 5.5));
  const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + ".." : s;
  const pos = {};
  vnodes.forEach((n, i) => {
    const lane = n.type === "ghost" ? 0 : names.indexOf(n.branch);
    pos[n.vid] = { x: pL + lane * lW, y: 18 + i * rH };
  });

  return (
    <div style={{ overflowY: "auto", flex: 1, position: "relative" }} onClick={() => setCtx(null)}>
      {/* Branch tabs */}
      <div style={{ padding: "6px 8px", display: "flex", flexWrap: "wrap", gap: 3, borderBottom: "0.5px solid #ddd", position: "sticky", top: 0, background: "#f8f8f5", zIndex: 2 }}>
        {names.map(b => {
          const c = bCol(names, b), act = b === activeBranch;
          return <button key={b} onClick={() => { const h = bHead(commits, b); if (h) onCheckout(h.id, b); }}
            style={{ fontSize: 8, padding: "2px 7px", borderRadius: 3, cursor: "pointer", fontFamily: "monospace", fontWeight: act ? 600 : 400, background: act ? c + "20" : "transparent", color: c, border: act ? "1px solid " + c + "50" : "0.5px solid #ddd" }}>
            {b}{act ? " \u25CF" : ""}
          </button>;
        })}
      </div>

      <svg width={W} height={H} style={{ display: "block" }}>
        {/* Lane lines */}
        {names.map(b => {
          const bv = vnodes.filter(n => n.branch === b && n.type !== "ghost");
          if (!bv.length) return null;
          const p1 = pos[bv[0].vid], p2 = pos[bv[bv.length - 1].vid];
          if (!p1 || !p2) return null;
          return <line key={b} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={bCol(names, b)} strokeWidth="2" opacity="0.25" />;
        })}

        {/* Edges */}
        {vnodes.map(n => {
          const to = pos[n.vid]; if (!to) return null;
          const parents = [n.parentVid, ...(n.mergeVids || [])].filter(Boolean);
          return parents.map(pid => {
            const fr = pos[pid]; if (!fr) return null;
            const isGhostEdge = pid === "ghost" || n.type === "child";
            const col = isGhostEdge ? "#bbb" : bCol(names, n.branch);
            const isMrg = n.mergeVids?.includes(pid);
            const dash = (isMrg || isGhostEdge) ? "4 3" : "none";
            const op = (isMrg || isGhostEdge) ? 0.3 : 0.35;
            const sw = (isMrg || isGhostEdge) ? 1.5 : 2;
            if (fr.x === to.x) return <line key={pid + "-" + n.vid} x1={fr.x} y1={fr.y + nR + 1} x2={to.x} y2={to.y - nR - 1} stroke={col} strokeWidth={sw} opacity={op} strokeDasharray={dash} />;
            const mY = (fr.y + to.y) / 2;
            return <path key={pid + "-" + n.vid} d={`M${fr.x} ${fr.y + nR + 1} C${fr.x} ${mY} ${to.x} ${mY} ${to.x} ${to.y - nR - 1}`} fill="none" stroke={col} strokeWidth={sw} opacity={op} strokeDasharray={dash} />;
          });
        })}

        {/* Nodes */}
        {vnodes.map(n => {
          const p = pos[n.vid]; if (!p) return null;

          // Ghost parent node
          if (n.type === "ghost") {
            return (
              <g key={n.vid} style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); onGoToParent(); }}>
                <circle cx={p.x} cy={p.y} r={5} fill="none" stroke="#bbb" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x={lX} y={p.y - 2} fontSize="9" fill="#aaa" fontStyle="italic" style={{ fontFamily: "system-ui" }}>
                  {trunc(n.label, maxChars)}
                </text>
                <text x={lX} y={p.y + 9} fontSize="7" fill="#ccc" style={{ fontFamily: "monospace" }}>
                  {"\u2197 go to parent chat"}
                </text>
              </g>
            );
          }

          // Child ghost node — a conversation forked from here
          if (n.type === "child") {
            return (
              <g key={n.vid} style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); onGoToChild(n.childConvId); }}>
                <circle cx={p.x} cy={p.y} r={5} fill="none" stroke="#bbb" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x={lX} y={p.y - 2} fontSize="9" fill="#aaa" fontStyle="italic" style={{ fontFamily: "system-ui" }}>
                  {"\u2198 " + trunc(n.label, maxChars - 2)}
                </text>
                <text x={lX} y={p.y + 9} fontSize="7" fill="#ccc" style={{ fontFamily: "monospace" }}>
                  go to child chat
                </text>
              </g>
            );
          }

          const col = bCol(names, n.branch);
          const cm = commits.find(c => c.id === n.cid);
          const cur = cm?.id === headId;
          const isPr = n.type === "p";
          const isMrg = (cm?.mergeIds || []).length > 0 && isPr;
          const sel = selected?.includes(n.cid);
          const hov = hoveredCid === n.cid;
          const r = cur ? 5 : (isMrg ? 5 : nR);

          return (
            <g key={n.vid} style={{ cursor: "pointer" }}
              onClick={e => { e.stopPropagation(); setCtx(null); if (mergeMode) { onToggleSel(n.cid); return; } if (cm) onCheckout(cm.id, cm.branch); }}
              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, cid: n.cid, isPrompt: isPr }); }}>
              {(cur || sel || hov) && <circle cx={p.x} cy={p.y} r={hov ? 11 : 9} fill={sel ? "#BA7517" : hov ? col : col} opacity={hov ? 0.25 : 0.15} />}
              {isMrg
                ? <rect x={p.x - r} y={p.y - r} width={r * 2} height={r * 2} rx={2} fill={col} stroke={col} strokeWidth="1.5" />
                : <circle cx={p.x} cy={p.y} r={r} fill={isPr ? "#fff" : col} stroke={sel ? "#BA7517" : col} strokeWidth={cur ? 2.5 : (hov ? 2.5 : 1.5)} />}
              {sel && <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="7" fontWeight="700" fill="#fff">{"\u2713"}</text>}
              <text x={lX} y={p.y - 2} fontSize="9" fontWeight={(cur || hov) ? "600" : "400"} fill={(cur || hov) ? col : isPr ? "#333" : "#555"} style={{ fontFamily: "system-ui" }}>
                {isMrg ? "\u2B85 " : ""}{trunc(n.label, maxChars)}
              </text>
              <text x={lX} y={p.y + 9} fontSize="7" fill="#bbb" style={{ fontFamily: "monospace" }}>
                {n.branch} {n.cid.slice(0, 7)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Context menu */}
      {ctx && !ctx.confirm && (
        <div style={{ position: "fixed", left: ctx.x, top: ctx.y, zIndex: 100, background: "#fff", border: "0.5px solid #ddd", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.12)", padding: "4px 0", minWidth: 110 }}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => { const cid = ctx.cid; setCtx(null); onEdit(cid); }}
            style={{ display: "block", width: "100%", padding: "6px 14px", fontSize: 11, color: "#333", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => e.currentTarget.style.background = "#f5f5f0"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
            edit
          </button>
          <button onClick={() => { const cid = ctx.cid; setCtx(null); onNew(cid); }}
            style={{ display: "block", width: "100%", padding: "6px 14px", fontSize: 11, color: "#378ADD", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => e.currentTarget.style.background = "#f0f6ff"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
            new
          </button>
          <div style={{ height: 1, background: "#eee", margin: "4px 0" }} />
          <button onClick={() => setCtx({ ...ctx, confirm: true })}
            style={{ display: "block", width: "100%", padding: "6px 14px", fontSize: 11, color: "#c00", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => e.currentTarget.style.background = "#fee"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
            delete
          </button>
        </div>
      )}

      {/* Delete confirm */}
      {ctx && ctx.confirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99, background: "rgba(0,0,0,0.1)" }} onClick={() => setCtx(null)}>
          <div style={{ position: "fixed", left: ctx.x, top: ctx.y, zIndex: 100, background: "#fff", border: "0.5px solid #ddd", borderRadius: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", padding: "12px 14px", minWidth: 200 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#333", marginBottom: 10 }}>Delete this commit and all its children?</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { const cid = ctx.cid; setCtx(null); onDelete(cid); }}
                style={{ flex: 1, padding: "6px", fontSize: 11, fontWeight: 500, borderRadius: 5, background: "#c00", color: "#fff", border: "none", cursor: "pointer" }}>Delete</button>
              <button onClick={() => setCtx(null)}
                style={{ flex: 1, padding: "6px", fontSize: 11, borderRadius: 5, background: "transparent", border: "0.5px solid #ddd", cursor: "pointer", color: "#888" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════ FERRY ICONS ═══════ */
const FERRY_ICONS = ["🚢", "⛵", "🛶", "🚀", "🌊", "🏔️", "🌲", "🔭", "💡", "📚", "🎯", "🧭", "⚡", "🔬", "🎨"];
function randomIcon() { return FERRY_ICONS[Math.floor(Math.random() * FERRY_ICONS.length)]; }

/* ═══════ MAIN ═══════ */
export default function App() {
  // Screen: "home" | "createFerry" | "settings" | "main"
  const [screen, setScreen] = useState("home");
  const [ferries, setFerries] = useState([]);
  const [ferryId, setFerryId] = useState(null);
  const [newFerryName, setNewFerryName] = useState("");
  const [newFerryKey, setNewFerryKey] = useState("");
  const [ferryValidating, setFerryValidating] = useState(false);
  const [ferryError, setFerryError] = useState("");
  const [newFerryPath, setNewFerryPath] = useState("");
  const [defaultBasePath, setDefaultBasePath] = useState("");
  const [ferryMenu, setFerryMenu] = useState(null);
  const [ferryDeleteConfirm, setFerryDeleteConfirm] = useState(null);
  const [pathManual, setPathManual] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [commits, setCommits] = useState([]);
  const [headId, setHeadId] = useState(null);
  const [branch, setBranch] = useState("main");
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [pending, setPending] = useState(null);
  const [graph, setGraph] = useState(false);
  const [mm, setMm] = useState(false);
  const [sel, setSel] = useState([]);
  const [editId, setEditId] = useState(null);
  const [newFromRef, setNewFromRef] = useState(null);
  const [convs, setConvs] = useState([]);
  const [convId, setConvId] = useState(null);
  const [parentRef, setParentRef] = useState(null);
  const [graphW, setGraphW] = useState(280);
  const [scrollTarget, setScrollTarget] = useState(null);
  const [hoveredCid, setHoveredCid] = useState(null);
  const [chatMenu, setChatMenu] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const [profileMenu, setProfileMenu] = useState(false);
  const dragging = useRef(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const cRef = useRef(commits); cRef.current = commits;

  // Fetch default base path on mount
  useEffect(() => { (async () => { try { const p = await window.electronAPI.getDefaultPath(); setDefaultBasePath(p); } catch {} })(); }, []);

  // Auto-update ferry path when name changes (unless manually set)
  useEffect(() => {
    if (screen === "createFerry" && !pathManual && defaultBasePath && newFerryName.trim()) {
      setNewFerryPath(defaultBasePath + "/ferries/" + newFerryName.trim());
    } else if (screen === "createFerry" && !pathManual && !newFerryName.trim()) {
      setNewFerryPath(defaultBasePath);
    }
  }, [newFerryName, screen, pathManual, defaultBasePath]);

  // Load ferries on mount
  useEffect(() => { (async () => { try { const r = await window.storage.list("ferry:"); if (r?.keys?.length) { const fs = []; for (const k of r.keys) { try { const p = await window.storage.get(k); if (p?.value) fs.push(JSON.parse(p.value)); } catch {} } setFerries(fs.sort((a, b) => (b.u || "").localeCompare(a.u || ""))); } } catch {} })(); }, []);

  // Load convs for current ferry
  useEffect(() => {
    if (!ferryId) { setConvs([]); return; }
    const prefix = "gft:" + ferryId.replace("ferry:", "") + ":";
    (async () => { try { const r = await window.storage.list(prefix); if (r?.keys?.length) { const cs = []; for (const k of r.keys) { try { const p = await window.storage.get(k); if (p?.value) cs.push(JSON.parse(p.value)); } catch {} } setConvs(cs.sort((a, b) => (b.u || "").localeCompare(a.u || ""))); } else { setConvs([]); } } catch { setConvs([]); } })();
  }, [ferryId]);

  // All recent chats across all ferries
  const [allRecent, setAllRecent] = useState([]);
  useEffect(() => {
    (async () => { try {
      const r = await window.storage.list("gft:");
      if (r?.keys?.length) { const cs = []; for (const k of r.keys) { try { const p = await window.storage.get(k); if (p?.value) { const cv = JSON.parse(p.value); cs.push(cv); } } catch {} } setAllRecent(cs.sort((a, b) => (b.u || "").localeCompare(a.u || "")).slice(0, 10)); }
      else { setAllRecent([]); }
    } catch {} })();
  }, [convs, ferries]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [commits, headId, pending]);

  useEffect(() => {
    if (scrollTarget) {
      const el = document.getElementById("cm-" + scrollTarget);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      setScrollTarget(null);
    }
  }, [scrollTarget, headId]);

  // Ferry CRUD
  const createFerry = async () => {
    if (!newFerryName.trim() || !newFerryKey.trim()) return;
    const provider = detectProvider(newFerryKey.trim());
    if (!provider) { setFerryError("Unknown API key format."); return; }
    setFerryValidating(true); setFerryError("");
    const v = await validateKey(newFerryKey.trim());
    setFerryValidating(false);
    if (!v.ok) { setFerryError(v.error); return; }
    const id = "ferry:" + Date.now();
    const f = { id, name: newFerryName.trim(), apiKey: newFerryKey.trim(), provider: provider.id, icon: randomIcon(), storagePath: newFerryPath || (defaultBasePath + "/ferries/" + newFerryName.trim()), u: new Date().toISOString() };
    try { await window.storage.set(id, JSON.stringify(f)); } catch {}
    setFerries(p => [f, ...p]);
    setFerryId(id); setApiKey(newFerryKey.trim());
    setNewFerryName(""); setNewFerryKey(""); setFerryError(""); setNewFerryPath(""); setPathManual(false);
    setScreen("main");
  };
  const saveFerry = async () => {
    if (!ferryId || !newFerryName.trim() || !newFerryKey.trim()) return;
    const provider = detectProvider(newFerryKey.trim());
    if (!provider) { setFerryError("Unknown API key format."); return; }
    setFerryValidating(true); setFerryError("");
    const v = await validateKey(newFerryKey.trim());
    setFerryValidating(false);
    if (!v.ok) { setFerryError(v.error); return; }
    const f = ferries.find(ff => ff.id === ferryId);
    const updated = { ...f, name: newFerryName.trim(), apiKey: newFerryKey.trim(), provider: provider.id, u: new Date().toISOString() };
    try { await window.storage.set(ferryId, JSON.stringify(updated)); } catch {}
    setFerries(p => p.map(ff => ff.id === ferryId ? updated : ff));
    setApiKey(newFerryKey.trim());
    setNewFerryName(""); setNewFerryKey(""); setFerryError("");
    setScreen("main");
  };
  const enterFerry = (f) => {
    setFerryId(f.id); setApiKey(f.apiKey);
    setCommits([]); setHeadId(null); setBranch("main"); setConvId(null); setParentRef(null);
    setMm(false); setSel([]); setEditId(null); setPending(null); setNewFromRef(null);
    setScreen("main");
  };
  const goHome = () => {
    setScreen("home"); setProfileMenu(false);
    setCommits([]); setHeadId(null); setConvId(null);
  };
  const deleteFerry = async (fId) => {
    const f = ferries.find(ff => ff.id === fId);
    if (!f) return;
    await window.electronAPI.deleteFerry(fId, f);
    setFerries(p => p.filter(ff => ff.id !== fId));
    setConvs(p => p.filter(cv => cv.ferryId !== fId));
    setAllRecent(p => p.filter(cv => cv.ferryId !== fId));
    if (ferryId === fId) { setFerryId(null); setConvId(null); setCommits([]); setHeadId(null); setScreen("home"); }
    setFerryMenu(null); setFerryDeleteConfirm(null);
  };

  // Find which ferry a chat belongs to
  const ferryForChat = (cv) => {
    if (cv.ferryId) return ferries.find(f => f.id === cv.ferryId);
    const parts = cv.id?.split(":") || [];
    if (parts.length >= 3) {
      const fId = "ferry:" + parts[1];
      return ferries.find(f => f.id === fId);
    }
    return null;
  };

  const save = async (title, cm, hid, br, pRef, forceNewId) => {
    const prefix = ferryId ? "gft:" + ferryId.replace("ferry:", "") + ":" : "gft:";
    const id = forceNewId || convId || prefix + Date.now();
    const existing = convs.find(c => c.id === id);
    const finalTitle = existing?.title || title || (cm.length > 0 ? cm[0].prompt?.slice(0, 40) : "Untitled");
    const cv = { id, title: finalTitle, commits: cm, headId: hid, branch: br, parentRef: pRef || parentRef || null, ferryId, u: new Date().toISOString() };
    try { await window.storage.set(id, JSON.stringify(cv)); } catch {}
    setConvs(p => [cv, ...p.filter(c => c.id !== id)]);
    setConvId(id);
  };

  const load = cv => {
    // If loading from home screen, enter the ferry first
    if (screen === "home" && cv.ferryId) {
      const f = ferries.find(ff => ff.id === cv.ferryId);
      if (f) { setFerryId(f.id); setApiKey(f.apiKey); }
    }
    setCommits(cv.commits || []); setHeadId(cv.headId); setBranch(cv.branch || "main");
    setConvId(cv.id); setParentRef(cv.parentRef || null);
    cc = Math.max(cc, (cv.commits || []).length + 10);
    setScreen("main"); setMm(false); setSel([]); setEditId(null); setPending(null); setNewFromRef(null);
  };
  const del = async id => { try { await window.storage.delete(id); } catch {} setConvs(p => p.filter(c => c.id !== id)); if (convId === id) { setCommits([]); setHeadId(null); setConvId(null); setParentRef(null); } };
  const renameConv = async (id, newTitle) => {
    const cv = convs.find(c => c.id === id);
    if (!cv || !newTitle.trim()) return;
    const updated = { ...cv, title: newTitle.trim(), u: new Date().toISOString() };
    try { await window.storage.set(id, JSON.stringify(updated)); } catch {}
    setConvs(p => p.map(c => c.id === id ? updated : c));
  };
  const newConv = () => { setCommits([]); setHeadId(null); setBranch("main"); setConvId(null); setParentRef(null); setMm(false); setSel([]); setEditId(null); setPending(null); setNewFromRef(null); };

  const thread = getThread(commits, headId);
  const names = bNames(commits);

  // Find child conversations that forked from this conversation's commits
  const childRefs = convId ? convs.filter(cv => cv.parentRef?.convId === convId && cv.id !== convId).map(cv => ({
    convId: cv.id, commitId: cv.parentRef.commitId, convTitle: cv.title || "Untitled",
  })) : [];

  // ─── SEND ───
  const send = async () => {
    if (!input.trim() || thinking) return;
    const msg = input.trim(); setInput("");
    let pid = headId, br = branch;

    // Handle "new" mode — create new conversation
    if (newFromRef) {
      const parentThread = newFromRef.thread || [];
      const pRef = { convId: newFromRef.convId, commitId: newFromRef.commitId, convTitle: newFromRef.convTitle, promptSummary: newFromRef.promptSummary };
      const ferryPrefix = ferryId ? "gft:" + ferryId.replace("ferry:", "") + ":" : "gft:";
      const newId = ferryPrefix + Date.now();

      // Reset to new conversation
      setCommits([]); cRef.current = [];
      setHeadId(null); setBranch("main"); setConvId(newId);
      setParentRef(pRef); setNewFromRef(null); setGraph(true);

      // Immediately save empty chat so it appears in left list
      await save(msg.slice(0, 40), [], null, "main", pRef, newId);

      setPending(msg); setThinking(true);
      try {
        const msgs = [];
        parentThread.forEach(c => { msgs.push({ role: "user", content: c.prompt }); if (c.response) msgs.push({ role: "assistant", content: c.response }); });
        msgs.push({ role: "user", content: msg });
        const resp = await callLLM(apiKey, msgs);
        const cm = mkCommit(null, msg, resp, "main");
        const nc = [cm];
        setCommits(nc); cRef.current = nc; setHeadId(cm.id); setPending(null);
        await save(msg.slice(0, 40), nc, cm.id, "main", pRef, newId);
      } catch (e) {
        const cm = mkCommit(null, msg, "Error: " + e.message, "main");
        const nc = [cm];
        setCommits(nc); cRef.current = nc; setHeadId(cm.id); setPending(null);
        await save(msg.slice(0, 40), nc, cm.id, "main", pRef, newId);
      } finally { setThinking(false); }
      return;
    }

    // Handle edit mode
    if (editId) {
      const ec = cRef.current.find(c => c.id === editId);
      if (ec) {
        // First commit (no parent) → new conversation entirely
        if (!ec.parentId) {
          setEditId(null);
          const ferryPrefix = ferryId ? "gft:" + ferryId.replace("ferry:", "") + ":" : "gft:";
          const newId = ferryPrefix + Date.now();
          setCommits([]); cRef.current = [];
          setHeadId(null); setBranch("main"); setConvId(newId);
          setParentRef(null);

          await save(msg.slice(0, 40), [], null, "main", null, newId);

          setPending(msg); setThinking(true);
          try {
            const resp = await callLLM(apiKey, [{ role: "user", content: msg }]);
            const cm = mkCommit(null, msg, resp, "main");
            const nc = [cm];
            setCommits(nc); cRef.current = nc; setHeadId(cm.id); setPending(null);
            await save(msg.slice(0, 40), nc, cm.id, "main", null, newId);
          } catch (e) {
            const cm = mkCommit(null, msg, "Error: " + e.message, "main");
            const nc = [cm];
            setCommits(nc); cRef.current = nc; setHeadId(cm.id); setPending(null);
          } finally { setThinking(false); }
          return;
        }
        // Middle commit → new branch
        pid = ec.parentId; br = "branch-" + names.length; setBranch(br);
        // Switch head to parent so thread shows correctly during pending
        setHeadId(pid);
      }
      setEditId(null); setGraph(true);
    }

    setPending(msg); setThinking(true);
    try {
      const th = getThread(cRef.current, pid);
      const msgs = []; th.forEach(c => { msgs.push({ role: "user", content: c.prompt }); if (c.response) msgs.push({ role: "assistant", content: c.response }); });
      msgs.push({ role: "user", content: msg });
      const resp = await callLLM(apiKey, msgs);
      const cm = mkCommit(pid, msg, resp, br);
      const nc = [...cRef.current, cm]; setCommits(nc); cRef.current = nc; setHeadId(cm.id); setPending(null);
      await save(msg.slice(0, 40), nc, cm.id, br);
    } catch (e) {
      const cm = mkCommit(pid, msg, "Error: " + e.message, br);
      const nc = [...cRef.current, cm]; setCommits(nc); cRef.current = nc; setHeadId(cm.id); setPending(null);
    } finally { setThinking(false); }
  };

  // ─── HANDLERS ───
  const startEdit = cid => { const cm = commits.find(c => c.id === cid); if (!cm) return; setEditId(cid); setNewFromRef(null); setInput(cm.prompt); inputRef.current?.focus(); };
  const checkout = (id, b) => { setHeadId(id); setBranch(b); setMm(false); setSel([]); setEditId(null); setPending(null); setNewFromRef(null); setScrollTarget(id); };
  const toggleSel = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const startNew = (cid) => {
    const cm = commits.find(c => c.id === cid);
    if (!cm) return;
    const th = getThread(commits, cid);
    const currentConv = convs.find(c => c.id === convId);
    setNewFromRef({
      convId, commitId: cid,
      thread: th,
      convTitle: currentConv?.title || "Untitled",
      promptSummary: cm.prompt?.slice(0, 30) + (cm.prompt?.length > 30 ? ".." : ""),
    });
    setEditId(null); setMm(false); setSel([]);
    setInput(""); inputRef.current?.focus();
  };

  const goToParent = () => {
    if (!parentRef) return;
    const cv = convs.find(c => c.id === parentRef.convId);
    if (cv) { load(cv); setScrollTarget(parentRef.commitId); }
  };

  const goToChild = (childConvId) => {
    const cv = convs.find(c => c.id === childConvId);
    if (cv) load(cv);
  };

  const deleteCommit = (cid) => {
    const toDelete = new Set();
    const queue = [cid];
    while (queue.length) { const id = queue.shift(); toDelete.add(id); commits.filter(c => c.parentId === id).forEach(c => queue.push(c.id)); }
    const nc = commits.filter(c => !toDelete.has(c.id));
    setCommits(nc); cRef.current = nc;
    let newHeadId = headId, newBranch = branch;
    if (toDelete.has(headId)) {
      const deleted = commits.find(c => c.id === cid);
      if (deleted?.parentId) { const parent = nc.find(c => c.id === deleted.parentId); if (parent) { newHeadId = parent.id; newBranch = parent.branch; } }
      if (!nc.find(c => c.id === newHeadId) || toDelete.has(newHeadId)) {
        if (nc.length > 0) { newHeadId = nc[nc.length - 1].id; newBranch = nc[nc.length - 1].branch; }
        else { newHeadId = null; newBranch = "main"; }
      }
      setHeadId(newHeadId); setBranch(newBranch);
    }
    const existingConv = convs.find(c => c.id === convId);
    save(existingConv?.title, nc, newHeadId, newBranch);
  };

  const merge = async () => {
    if (!input.trim() || !sel.length) return;
    const msg = input.trim(); setInput(""); setMm(false); setPending(msg); setThinking(true);
    try {
      const curTh = getThread(cRef.current, headId).map(c => "User: " + c.prompt + "\nAI: " + c.response).join("\n\n");
      const selCtx = sel.map(sid => { const sc = cRef.current.find(c => c.id === sid); if (!sc) return ""; return "[" + sc.branch + "]:\n" + getThread(cRef.current, sid).map(c => "User: " + c.prompt + "\nAI: " + c.response).join("\n\n"); }).join("\n---\n");
      const resp = await callLLM(apiKey, [{ role: "user", content: "Merge:\n\nCurrent (" + branch + "):\n" + curTh + "\n\nSelected:\n" + selCtx + "\n\nInstruction:\n" + msg }]);
      const cm = mkCommit(headId, msg, resp, branch, sel);
      const nc = [...cRef.current, cm]; setCommits(nc); cRef.current = nc; setHeadId(cm.id); setSel([]); setPending(null);
      await save(null, nc, cm.id, branch);
    } catch (e) {
      const cm = mkCommit(headId, msg, "Merge error: " + e.message, branch);
      const nc = [...cRef.current, cm]; setCommits(nc); cRef.current = nc; setHeadId(cm.id); setSel([]); setPending(null);
    } finally { setThinking(false); }
  };

  /* HOME SCREEN */
  if (screen === "home") return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "50px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><img src={raftIcon} alt="Bucklebury" style={{ width: 36, height: 36 }}/> Bucklebury</div>
        <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Branch your thinking. Merge your ideas.</p>
      </div>
      <button onClick={() => setScreen("createFerry")}
        style={{ width: "100%", padding: "12px", fontSize: 13, fontWeight: 600, borderRadius: 8, background: "#1A1A2E", color: "#fff", border: "none", cursor: "pointer", marginBottom: 24 }}>+ Create a ferry</button>

      {ferries.length > 0 && <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 9, fontWeight: 500, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Ferries</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ferries.map(f => (
            <div key={f.id} onClick={() => enterFerry(f)}
              style={{ padding: "12px 16px", borderRadius: 8, border: "0.5px solid #ddd", cursor: "pointer", minWidth: 120, flex: "0 0 auto", position: "relative", display: "flex", alignItems: "center", gap: 6 }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f0"; const d = e.currentTarget.querySelector(".ferry-dots"); if (d) d.style.opacity = "1"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; const d = e.currentTarget.querySelector(".ferry-dots"); if (d) d.style.opacity = "0"; }}>
              <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{f.icon || "\u{1F6A2}"} {f.name}</div>
              <span className="ferry-dots" onClick={e => { e.stopPropagation(); setFerryMenu(ferryMenu?.id === f.id ? null : { id: f.id, x: e.clientX, y: e.clientY }); }}
                style={{ opacity: 0, fontSize: 11, color: "#aaa", padding: "0 2px", cursor: "pointer", transition: "opacity 0.15s", flexShrink: 0 }}>{"\u00B7\u00B7\u00B7"}</span>
            </div>
          ))}
        </div>

        {/* Ferry context menu */}
        {ferryMenu && !ferryDeleteConfirm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setFerryMenu(null)}>
            <div style={{ position: "fixed", left: ferryMenu.x, top: ferryMenu.y, zIndex: 100, background: "#fff", border: "0.5px solid #ddd", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.12)", padding: "4px 0", minWidth: 100 }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => { setFerryDeleteConfirm(ferryMenu.id); setFerryMenu(null); }}
                style={{ display: "block", width: "100%", padding: "6px 14px", fontSize: 11, color: "#c00", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fee"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                delete
              </button>
            </div>
          </div>
        )}

        {/* Ferry delete confirm */}
        {ferryDeleteConfirm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 99, background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setFerryDeleteConfirm(null)}>
            <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", padding: "16px 20px", minWidth: 280 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Delete ferry?</div>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 14 }}>This ferry and all its conversations will be moved to the Recycle Bin.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setFerryDeleteConfirm(null)}
                  style={{ flex: 1, padding: "8px", fontSize: 11, borderRadius: 6, background: "transparent", border: "0.5px solid #ddd", cursor: "pointer", color: "#888" }}>Cancel</button>
                <button onClick={() => deleteFerry(ferryDeleteConfirm)}
                  style={{ flex: 1, padding: "8px", fontSize: 11, fontWeight: 600, borderRadius: 6, background: "#c00", color: "#fff", border: "none", cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>}

      {allRecent.length > 0 && <div>
        <div style={{ fontSize: 9, fontWeight: 500, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Recent</div>
        {allRecent.map(cv => {
          const f = ferryForChat(cv);
          return (
            <div key={cv.id} onClick={() => load(cv)}
              style={{ padding: "7px 10px", marginBottom: 2, borderRadius: 5, border: "0.5px solid #ddd", cursor: "pointer", overflow: "hidden" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f5f5f0"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ fontSize: 11, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.title || "Untitled"}{cv.parentRef ? " \u2197" : ""}</div>
              <div style={{ fontSize: 8, color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f?.icon || "\u{1F6A2}"} {f?.name || "unknown"} · {cv.commits?.length || 0} commits</div>
            </div>
          );
        })}
      </div>}
    </div>
  );

  const ferryKeyProvider = detectProvider(newFerryKey);
  const ferryFormValid = newFerryName.trim() && newFerryKey.trim() && !!ferryKeyProvider;

  /* CREATE FERRY SCREEN */
  if (screen === "createFerry") return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "50px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><img src={raftIcon} alt="" style={{ width: 36, height: 36 }}/> Create a ferry</div>
        <p style={{ fontSize: 12, color: "#888", margin: 0 }}>A ferry is a space for your conversations.</p>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 500, marginBottom: 3, color: "#888" }}>Ferry name</label>
        <input autoFocus value={newFerryName} onChange={e => setNewFerryName(e.target.value)} placeholder="e.g. Research, Work, Personal"
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 12, borderRadius: 6, border: "0.5px solid #ddd" }} />
      </div>
      <div style={{ marginBottom: 6 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 500, marginBottom: 3, color: "#888" }}>API key</label>
        <input type="password" value={newFerryKey} onChange={e => { setNewFerryKey(e.target.value); setFerryError(""); }} placeholder="sk-ant-... or sk-... or AIza..."
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 12, borderRadius: 6, border: ferryError ? "1px solid #c00" : "0.5px solid #ddd", fontFamily: "monospace" }} />
      </div>
      <div style={{ marginBottom: 14, minHeight: 18 }}>
        {newFerryKey.trim() && ferryKeyProvider && <span style={{ fontSize: 10, color: ferryKeyProvider.color, fontWeight: 500 }}>{"\u2713"} {ferryKeyProvider.name}</span>}
        {newFerryKey.trim() && !ferryKeyProvider && <span style={{ fontSize: 10, color: "#c00" }}>{"\u2717"} Unknown key format</span>}
        {ferryError && <span style={{ fontSize: 10, color: "#c00", display: "block", marginTop: 2 }}>{ferryError}</span>}
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 500, marginBottom: 3, color: "#888" }}>Storage path</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={newFerryPath} readOnly
            style={{ flex: 1, padding: "8px 10px", fontSize: 11, borderRadius: 6, border: "0.5px solid #ddd", background: "#f8f8f5", color: "#555", fontFamily: "monospace" }} />
          <button onClick={async () => { const p = await window.electronAPI.selectFolder(); if (p) { setNewFerryPath(p); setPathManual(true); } }}
            style={{ padding: "8px 12px", fontSize: 11, borderRadius: 6, border: "0.5px solid #ddd", background: "#fff", cursor: "pointer", color: "#333", whiteSpace: "nowrap" }}>Browse</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { setScreen("home"); setFerryError(""); setNewFerryName(""); setNewFerryKey(""); setNewFerryPath(""); setPathManual(false); }}
          style={{ flex: 1, padding: "10px", fontSize: 12, borderRadius: 7, background: "transparent", border: "0.5px solid #ddd", cursor: "pointer", color: "#888" }}>Cancel</button>
        <button onClick={createFerry} disabled={!ferryFormValid || ferryValidating}
          style={{ flex: 2, padding: "10px", fontSize: 12, fontWeight: 600, borderRadius: 7, background: ferryFormValid && !ferryValidating ? "#1A1A2E" : "#eee", color: ferryFormValid && !ferryValidating ? "#fff" : "#aaa", border: "none", cursor: ferryFormValid && !ferryValidating ? "pointer" : "default" }}>
          {ferryValidating ? "Validating..." : "Create"}
        </button>
      </div>
    </div>
  );

  /* SETTINGS SCREEN */
  if (screen === "settings") return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "50px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 4 }}>{"\u2699"} Settings</div>
        <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Edit your ferry settings.</p>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 500, marginBottom: 3, color: "#888" }}>Ferry name</label>
        <input autoFocus value={newFerryName} onChange={e => setNewFerryName(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 12, borderRadius: 6, border: "0.5px solid #ddd" }} />
      </div>
      <div style={{ marginBottom: 6 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 500, marginBottom: 3, color: "#888" }}>API key</label>
        <input type="password" value={newFerryKey} onChange={e => { setNewFerryKey(e.target.value); setFerryError(""); }}
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 12, borderRadius: 6, border: ferryError ? "1px solid #c00" : "0.5px solid #ddd", fontFamily: "monospace" }} />
      </div>
      <div style={{ marginBottom: 14, minHeight: 18 }}>
        {newFerryKey.trim() && ferryKeyProvider && <span style={{ fontSize: 10, color: ferryKeyProvider.color, fontWeight: 500 }}>{"\u2713"} {ferryKeyProvider.name}</span>}
        {newFerryKey.trim() && !ferryKeyProvider && <span style={{ fontSize: 10, color: "#c00" }}>{"\u2717"} Unknown key format</span>}
        {ferryError && <span style={{ fontSize: 10, color: "#c00", display: "block", marginTop: 2 }}>{ferryError}</span>}
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 500, marginBottom: 3, color: "#888" }}>Storage path</label>
        <input value={ferries.find(ff => ff.id === ferryId)?.storagePath || ""} readOnly
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 11, borderRadius: 6, border: "0.5px solid #ddd", background: "#f8f8f5", color: "#888", fontFamily: "monospace" }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { setScreen("main"); setFerryError(""); setNewFerryName(""); setNewFerryKey(""); }}
          style={{ flex: 1, padding: "10px", fontSize: 12, borderRadius: 7, background: "transparent", border: "0.5px solid #ddd", cursor: "pointer", color: "#888" }}>Cancel</button>
        <button onClick={saveFerry} disabled={!ferryFormValid || ferryValidating}
          style={{ flex: 2, padding: "10px", fontSize: 12, fontWeight: 600, borderRadius: 7, background: ferryFormValid && !ferryValidating ? "#1A1A2E" : "#eee", color: ferryFormValid && !ferryValidating ? "#fff" : "#aaa", border: "none", cursor: ferryFormValid && !ferryValidating ? "pointer" : "default" }}>
          {ferryValidating ? "Validating..." : "Save"}
        </button>
      </div>
      <div style={{ marginTop: 30, paddingTop: 16, borderTop: "0.5px solid #eee" }}>
        {!ferryDeleteConfirm ? (
          <button onClick={() => setFerryDeleteConfirm(ferryId)}
            style={{ width: "100%", padding: "10px", fontSize: 12, borderRadius: 7, background: "transparent", border: "0.5px solid #e88", cursor: "pointer", color: "#c00" }}>
            Delete this ferry
          </button>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 10 }}>This ferry and all its conversations will be moved to the Recycle Bin.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setFerryDeleteConfirm(null)}
                style={{ flex: 1, padding: "8px", fontSize: 11, borderRadius: 6, background: "transparent", border: "0.5px solid #ddd", cursor: "pointer", color: "#888" }}>Cancel</button>
              <button onClick={() => deleteFerry(ferryDeleteConfirm)}
                style={{ flex: 1, padding: "8px", fontSize: 11, fontWeight: 600, borderRadius: 6, background: "#c00", color: "#fff", border: "none", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* MAIN */
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* LEFT */}
      <div style={{ width: 180, display: "flex", flexDirection: "column", borderRight: "0.5px solid #ddd", background: "#f8f8f5" }}>
        <div style={{ padding: "8px 6px" }}><button onClick={newConv} style={{ width: "100%", padding: "6px", fontSize: 10, fontWeight: 500, borderRadius: 4, background: "#1A1A2E", color: "#fff", border: "none", cursor: "pointer" }}>+ New</button></div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 4px 4px" }} onClick={() => setChatMenu(null)}>
          {convs.map(cv => (
            <div key={cv.id} className="chat-item" style={{ padding: "6px", marginBottom: 1, borderRadius: 4, cursor: "pointer", fontSize: 10, background: convId === cv.id ? "#fff" : "transparent", border: convId === cv.id ? "0.5px solid #ddd" : "0.5px solid transparent", display: "flex", alignItems: "center", position: "relative" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.querySelector(".dots")&& (e.currentTarget.querySelector(".dots").style.opacity = "1"); }}
              onMouseLeave={e => { if (convId !== cv.id) e.currentTarget.style.background = "transparent"; e.currentTarget.querySelector(".dots") && (e.currentTarget.querySelector(".dots").style.opacity = "0"); }}>
              <div onClick={() => { if (renamingId !== cv.id) load(cv); }} style={{ flex: 1, minWidth: 0 }}>
                {renamingId === cv.id ? (
                  <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { renameConv(cv.id, renameVal); setRenamingId(null); } if (e.key === "Escape") setRenamingId(null); }}
                    onBlur={() => { renameConv(cv.id, renameVal); setRenamingId(null); }}
                    onClick={e => e.stopPropagation()}
                    style={{ width: "100%", fontSize: 10, fontWeight: 500, padding: "1px 3px", border: "1px solid #378ADD", borderRadius: 3, outline: "none", boxSizing: "border-box" }} />
                ) : (
                  <>
                    <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.title || "Untitled"}{cv.parentRef ? " \u2197" : ""}</div>
                    <div style={{ fontSize: 8, color: "#aaa" }}>{bNames(cv.commits || []).length}b</div>
                  </>
                )}
              </div>
              {renamingId !== cv.id && <span className="dots" onClick={e => { e.stopPropagation(); setChatMenu(chatMenu?.id === cv.id ? null : { id: cv.id, x: e.clientX, y: e.clientY }); }}
                style={{ opacity: 0, fontSize: 11, color: "#aaa", padding: "0 2px", cursor: "pointer", transition: "opacity 0.15s", flexShrink: 0 }}>{"\u00B7\u00B7\u00B7"}</span>}
            </div>
          ))}
        </div>

        {/* Chat context menu */}
        {chatMenu && (
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setChatMenu(null)}>
            <div style={{ position: "fixed", left: chatMenu.x, top: chatMenu.y, zIndex: 100, background: "#fff", border: "0.5px solid #ddd", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.12)", padding: "4px 0", minWidth: 100 }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => { const cv = convs.find(c => c.id === chatMenu.id); setRenameVal(cv?.title || ""); setRenamingId(chatMenu.id); setChatMenu(null); }}
                style={{ display: "block", width: "100%", padding: "6px 14px", fontSize: 11, color: "#333", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f5f5f0"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                rename
              </button>
              <div style={{ height: 1, background: "#eee", margin: "2px 0" }} />
              <button onClick={() => { del(chatMenu.id); setChatMenu(null); }}
                style={{ display: "block", width: "100%", padding: "6px 14px", fontSize: 11, color: "#c00", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fee"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                delete
              </button>
            </div>
          </div>
        )}

        {/* Profile */}
        <div style={{ borderTop: "0.5px solid #ddd", padding: "6px", position: "relative" }}>
          <div onClick={() => setProfileMenu(!profileMenu)}
            style={{ padding: "6px", borderRadius: 4, cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = "#fff"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            {"\u{1F464}"} Profile
          </div>
          {profileMenu && (
            <div style={{ position: "absolute", bottom: "100%", left: 4, right: 4, background: "#fff", border: "0.5px solid #ddd", borderRadius: 6, boxShadow: "0 -2px 8px rgba(0,0,0,0.1)", padding: "4px 0", marginBottom: 4 }}>
              <button onClick={goHome}
                style={{ display: "block", width: "100%", padding: "6px 12px", fontSize: 11, color: "#333", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f5f5f0"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                {"\u2190"} Home
              </button>
              <button onClick={() => {
                  const f = ferries.find(ff => ff.id === ferryId);
                  if (f) { setNewFerryName(f.name); setNewFerryKey(f.apiKey); }
                  setFerryError(""); setProfileMenu(false); setScreen("settings");
                }}
                style={{ display: "block", width: "100%", padding: "6px 12px", fontSize: 11, color: "#333", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f5f5f0"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                {"\u2699"} Settings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CENTER */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "7px 12px", borderBottom: "0.5px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{ferries.find(f => f.id === ferryId)?.icon || "\u{1F6A2}"} {ferries.find(f => f.id === ferryId)?.name || "Bucklebury"}</span>
            {names.length > 0 && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 3, background: bCol(names, branch) + "18", color: bCol(names, branch), fontWeight: 500, fontFamily: "monospace" }}>{branch}</span>}
            {parentRef && <span onClick={goToParent} style={{ fontSize: 8, color: "#378ADD", cursor: "pointer" }}>{"\u2197"} from: {parentRef.convTitle?.slice(0, 20)}</span>}
          </div>
          <button onClick={() => setGraph(!graph)} style={{ fontSize: 9, padding: "4px 8px", borderRadius: 4, cursor: "pointer", background: graph ? "#1A1A2E" : "transparent", color: graph ? "#fff" : "#888", border: graph ? "none" : "0.5px solid #ddd" }}>{graph ? "Hide graph" : "Graph"}</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {thread.length === 0 && !pending && !newFromRef && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Start thinking</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>Every exchange is a commit. Edit to branch.</div>
              </div>
            </div>
          )}
          {thread.map(cm => {
            const isMrg = (cm.mergeIds || []).length > 0;
            return (
              <div key={cm.id} id={"cm-" + cm.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}
                onMouseEnter={() => setHoveredCid(cm.id)} onMouseLeave={() => setHoveredCid(null)}>
                <div style={{ alignSelf: "flex-end", maxWidth: "80%" }}>
                  <div style={{ padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", background: isMrg ? "#fef9ef" : "#e6f1fb", color: isMrg ? "#854F0B" : "#185fa5", borderLeft: isMrg ? "3px solid #BA7517" : "none" }}>
                    {isMrg && <div style={{ fontSize: 9, fontWeight: 600, marginBottom: 4, color: "#BA7517" }}>MERGE</div>}
                    {cm.prompt}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
                    <button onClick={() => startEdit(cm.id)} style={{ fontSize: 9, color: editId === cm.id ? "#185fa5" : "#ccc", background: "none", border: "none", cursor: "pointer", padding: "1px 4px" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#185fa5"} onMouseLeave={e => { if (editId !== cm.id) e.currentTarget.style.color = "#ccc"; }}>edit</button>
                  </div>
                </div>
                <div style={{ alignSelf: "flex-start", maxWidth: "80%", padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.7, background: "#f5f5f0", color: "#111" }}>{renderMd(cm.response)}</div>
              </div>
            );
          })}
          {pending && <div style={{ alignSelf: "flex-end", maxWidth: "80%", padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.7, background: newFromRef ? "#f0f6ff" : "#e6f1fb", color: newFromRef ? "#378ADD" : "#185fa5" }}>{pending}</div>}
          {thinking && <div style={{ padding: "10px 14px", borderRadius: 12, background: "#f5f5f0", fontSize: 13, color: "#aaa", alignSelf: "flex-start" }}><ThinkingDots /></div>}
          <div ref={endRef} />
        </div>

        {/* Mode indicators */}
        {editId && <div style={{ padding: "6px 12px", borderTop: "0.5px solid #ddd", background: "#e6f1fb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#185fa5", fontWeight: 500 }}>Editing — new branch</span>
          <button onClick={() => { setEditId(null); setInput(""); }} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, background: "transparent", border: "0.5px solid #ddd", cursor: "pointer", color: "#888" }}>Cancel</button>
        </div>}
        {newFromRef && <div style={{ padding: "6px 12px", borderTop: "0.5px solid #ddd", background: "#f0f6ff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#378ADD", fontWeight: 500 }}>New conversation from {newFromRef.promptSummary?.slice(0, 25)}..</span>
          <button onClick={() => { setNewFromRef(null); setInput(""); }} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, background: "transparent", border: "0.5px solid #ddd", cursor: "pointer", color: "#888" }}>Cancel</button>
        </div>}
        {mm && sel.length > 0 && <div style={{ padding: "6px 12px", borderTop: "0.5px solid #ddd", background: "#fef9ef", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#854F0B", fontWeight: 500 }}>Merging {sel.length} into {branch}</span>
          <button onClick={() => { setMm(false); setSel([]); }} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, background: "transparent", border: "0.5px solid #ddd", cursor: "pointer", color: "#888" }}>Cancel</button>
        </div>}

        {/* Input */}
        <div style={{ padding: "8px 12px", borderTop: "0.5px solid #ddd", display: "flex", gap: 6, alignItems: "center" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); mm && sel.length ? merge() : send(); } }}
            placeholder={editId ? "Edit your question..." : newFromRef ? "Start new conversation..." : mm ? "Merge instruction..." : "Message on " + branch + "..."}
            style={{ flex: 1, padding: "10px 12px", fontSize: 13, borderRadius: 8, border: editId ? "1.5px solid #185fa5" : newFromRef ? "1.5px solid #378ADD" : mm ? "1.5px solid #BA7517" : "0.5px solid #ddd" }} />
          <button onClick={() => mm && sel.length ? merge() : send()} disabled={thinking || !input.trim() || (mm && !sel.length)}
            style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, background: editId ? "#185fa5" : newFromRef ? "#378ADD" : mm ? "#854F0B" : "#1A1A2E", color: "#fff", border: "none", cursor: "pointer", opacity: thinking || !input.trim() ? 0.4 : 1 }}>
            {editId ? "Edit" : newFromRef ? "New" : mm ? "Merge" : "Send"}
          </button>
        </div>
      </div>

      {/* RIGHT: Graph */}
      {graph && (
        <div style={{ width: graphW, minWidth: 200, maxWidth: 600, display: "flex", flexDirection: "column", borderLeft: "0.5px solid #ddd", background: "#f8f8f5", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 10 }}
            onMouseDown={e => {
              e.preventDefault(); dragging.current = true;
              const startX = e.clientX, startW = graphW;
              const onMove = ev => { if (dragging.current) setGraphW(Math.max(200, Math.min(600, startW - (ev.clientX - startX)))); };
              const onUp = () => { dragging.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
              document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
            }} />
          <div style={{ padding: "7px 8px", borderBottom: "0.5px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: "#666" }}>Graph</span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 8, color: "#bbb", fontFamily: "monospace" }}>HEAD {headId?.slice(0, 7)}</span>
              {names.length > 1 && !mm && <button onClick={() => { setMm(true); setSel([]); }} style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: "#FAEEDA", color: "#854F0B", border: "0.5px solid #FAC775", cursor: "pointer" }}>Merge</button>}
              {mm && <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: "#854F0B", color: "#fff" }}>Select commits</span>}
            </div>
          </div>
          <Graph commits={commits} headId={headId} activeBranch={branch} names={names} onCheckout={checkout} onEdit={startEdit} onNew={startNew} onDelete={deleteCommit} mergeMode={mm} selected={sel} onToggleSel={toggleSel} parentRef={parentRef} onGoToParent={goToParent} childRefs={childRefs} onGoToChild={goToChild} hoveredCid={hoveredCid} panelW={graphW} />
        </div>
      )}
    </div>
  );
}
