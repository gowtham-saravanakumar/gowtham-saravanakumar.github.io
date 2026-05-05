import { useState, useEffect, useRef, useCallback } from "react";

const THEME = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap');
  :root {
    --bg:#09090b;--s1:#111115;--s2:#18181e;--s3:#1f1f28;
    --bd:rgba(255,255,255,.06);--bd2:rgba(255,255,255,.11);
    --mu:#52525e;--mu2:#8b8b9a;--tx:#e8e8ed;
    --ac:#c8f135;--acd:#a8d420;--in:#6366f1;
    --fd:'Syne',sans-serif;--fb:'DM Sans',sans-serif;--fm:'JetBrains Mono',monospace;
    --r:8px;--rl:14px;--expo:cubic-bezier(.16,1,.3,1);--spring:cubic-bezier(.34,1.56,.64,1);
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:var(--fb);background:var(--bg);color:var(--tx);overflow:hidden;height:100vh;-webkit-font-smoothing:antialiased}
  input,textarea,button{font-family:inherit}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:var(--mu);border-radius:4px}
  ::-webkit-scrollbar-thumb:hover{background:var(--mu2)}
`;

function injectFonts() {
  if (document.getElementById("gs-font")) return;
  const s = document.createElement("style");
  s.id = "gs-font";
  s.textContent = THEME;
  document.head.appendChild(s);
}

const POLL_MS = 1800;
const PRESENCE_TTL = 18000;
const MAX_MSGS = 120;

function tsNow() { return Date.now(); }
function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function slugRoom(code) {
  return "room_" + code.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

async function storageGet(key, shared = true) {
  try { const r = await window.storage.get(key, shared); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function storageSet(key, val, shared = true) {
  try { await window.storage.set(key, JSON.stringify(val), shared); } catch {}
}

export default function App() {
  useEffect(() => { injectFonts(); }, []);
  const [screen, setScreen] = useState("login");
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const roomRef = useRef("");
  const userRef = useRef("");
  const presenceTimerRef = useRef(null);
  const pollTimerRef = useRef(null);

  const scrollBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, []);

  const fetchRoom = useCallback(async (code, user) => {
    const slug = slugRoom(code);
    const msgs = await storageGet(slug + "_msgs") || [];
    const users = await storageGet(slug + "_users") || [];
    const alive = users.filter(u => tsNow() - u.ts < PRESENCE_TTL);
    setMessages(msgs);
    setOnlineUsers(alive);
  }, []);

  const updatePresence = useCallback(async () => {
    const slug = slugRoom(roomRef.current);
    const users = await storageGet(slug + "_users") || [];
    const alive = users.filter(u => tsNow() - u.ts < PRESENCE_TTL);
    const idx = alive.findIndex(u => u.name === userRef.current);
    if (idx >= 0) alive[idx].ts = tsNow();
    else alive.push({ name: userRef.current, ts: tsNow() });
    await storageSet(slug + "_users", alive);
    setOnlineUsers(alive);
  }, []);

  const startPolling = useCallback((code, user) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
    pollTimerRef.current = setInterval(() => fetchRoom(code, user), POLL_MS);
    presenceTimerRef.current = setInterval(() => updatePresence(), 6000);
  }, [fetchRoom, updatePresence]);

  const stopPolling = useCallback(() => {
    clearInterval(pollTimerRef.current);
    clearInterval(presenceTimerRef.current);
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  async function leaveRoom() {
    const slug = slugRoom(roomRef.current);
    const users = await storageGet(slug + "_users") || [];
    const updated = users.filter(u => u.name !== userRef.current);
    await storageSet(slug + "_users", updated);
    stopPolling();
    setMessages([]);
    setOnlineUsers([]);
    setInput("");
    setScreen("login");
  }

  async function joinRoom(e) {
    e?.preventDefault();
    const uname = username.trim();
    const code = roomCode.trim().toUpperCase();
    if (!uname || !code) { setError("Enter your name and a room code."); return; }
    if (uname.length > 20) { setError("Name max 20 chars."); return; }
    if (code.length < 3 || code.length > 12) { setError("Room code: 3–12 chars."); return; }
    setJoining(true); setError("");
    roomRef.current = code;
    userRef.current = uname;
    await fetchRoom(code, uname);
    await updatePresence();
    startPolling(code, uname);
    setScreen("chat");
    setJoining(false);
    setTimeout(() => { scrollBottom(); inputRef.current?.focus(); }, 200);
  }

  async function sendMsg(e) {
    e?.preventDefault();
    const txt = input.trim();
    if (!txt || sending) return;
    setSending(true);
    setInput("");
    const slug = slugRoom(roomRef.current);
    const msgs = await storageGet(slug + "_msgs") || [];
    const newMsg = { id: tsNow() + Math.random(), name: userRef.current, text: txt, ts: tsNow() };
    const updated = [...msgs, newMsg].slice(-MAX_MSGS);
    await storageSet(slug + "_msgs", updated);
    setMessages(updated);
    setSending(false);
    scrollBottom();
    inputRef.current?.focus();
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  }

  function copyCode() {
    navigator.clipboard?.writeText(roomRef.current).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const s = {
    root: { height:"100vh", display:"flex", flexDirection:"column", background:"var(--bg)", fontFamily:"var(--fb)", color:"var(--tx)", position:"relative", overflow:"hidden" },
    grain: { position:"fixed", inset:0, pointerEvents:"none", zIndex:9999, opacity:.018, backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)'/%3E%3C/svg%3E\")", backgroundSize:"180px" },
    orbA: { position:"fixed", width:420, height:420, borderRadius:"50%", background:"rgba(99,102,241,.11)", top:-120, left:-80, filter:"blur(90px)", pointerEvents:"none" },
    orbB: { position:"fixed", width:280, height:280, borderRadius:"50%", background:"rgba(200,241,53,.07)", bottom:"10%", right:"5%", filter:"blur(80px)", pointerEvents:"none" },
    grid: { position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)", backgroundSize:"52px 52px", maskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black,transparent)", pointerEvents:"none" },
  };

  if (screen === "login") return (
    <div style={s.root}>
      <div style={s.grain}/>
      <div style={s.orbA}/>
      <div style={s.orbB}/>
      <div style={s.grid}/>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem", position:"relative", zIndex:2 }}>
        <div style={{ width:"100%", maxWidth:420 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:"2.2rem" }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--ac)", boxShadow:"0 0 10px var(--ac)", flexShrink:0, animation:"pp 2.5s ease-in-out infinite" }}/>
            <span style={{ fontFamily:"var(--fd)", fontWeight:800, fontSize:"1.05rem", letterSpacing:"-.02em" }}>Gowtham<span style={{ color:"var(--mu2)", fontWeight:400 }}>.Chat</span></span>
          </div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:9, fontFamily:"var(--fm)", fontSize:".64rem", letterSpacing:".11em", textTransform:"uppercase", color:"var(--ac)", border:"1px solid rgba(200,241,53,.22)", background:"rgba(200,241,53,.06)", padding:"6px 14px", borderRadius:100, marginBottom:"1.6rem" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--ac)", boxShadow:"0 0 5px var(--ac)" }}/>
            Room-based Chat
          </div>
          <h1 style={{ fontFamily:"var(--fd)", fontSize:"clamp(1.9rem,5vw,2.8rem)", fontWeight:800, letterSpacing:"-.04em", lineHeight:1.05, marginBottom:"1.4rem" }}>
            <span style={{ WebkitTextStroke:"1.5px rgba(232,232,237,.2)", color:"transparent" }}>Join a</span><br/>
            <span style={{ color:"var(--ac)" }}>Room.</span>
          </h1>
          <p style={{ color:"var(--mu2)", fontSize:".9rem", lineHeight:1.75, fontWeight:300, marginBottom:"2rem" }}>
            Enter any room code to create or join a shared chat. Share the code with others to bring them in.
          </p>
          <form onSubmit={joinRoom} style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontFamily:"var(--fm)", fontSize:".6rem", letterSpacing:".09em", textTransform:"uppercase", color:"var(--mu)" }}>Your Name</label>
              <input
                value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Gowtham" maxLength={20} autoFocus
                style={{ background:"var(--s3)", border:"1px solid var(--bd2)", borderRadius:"var(--r)", padding:"11px 14px", fontSize:".9rem", color:"var(--tx)", outline:"none", transition:"border-color .2s, box-shadow .2s" }}
                onFocus={e => { e.target.style.borderColor="rgba(200,241,53,.45)"; e.target.style.boxShadow="0 0 0 3px rgba(200,241,53,.07)"; }}
                onBlur={e => { e.target.style.borderColor="var(--bd2)"; e.target.style.boxShadow="none"; }}
              />
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontFamily:"var(--fm)", fontSize:".6rem", letterSpacing:".09em", textTransform:"uppercase", color:"var(--mu)" }}>Room Code</label>
              <input
                value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. GOWTHAM42" maxLength={12}
                style={{ fontFamily:"var(--fm)", background:"var(--s3)", border:"1px solid var(--bd2)", borderRadius:"var(--r)", padding:"11px 14px", fontSize:"1rem", letterSpacing:".1em", color:"var(--ac)", outline:"none", transition:"border-color .2s, box-shadow .2s" }}
                onFocus={e => { e.target.style.borderColor="rgba(200,241,53,.45)"; e.target.style.boxShadow="0 0 0 3px rgba(200,241,53,.07)"; }}
                onBlur={e => { e.target.style.borderColor="var(--bd2)"; e.target.style.boxShadow="none"; }}
              />
            </div>
            {error && <p style={{ fontFamily:"var(--fm)", fontSize:".68rem", color:"#fda4af", letterSpacing:".03em" }}>{error}</p>}
            <button type="submit" disabled={joining}
              style={{ background:"var(--ac)", color:"var(--bg)", fontFamily:"var(--fm)", fontSize:".74rem", fontWeight:600, letterSpacing:".06em", padding:"13px 28px", borderRadius:100, border:"none", cursor:"pointer", transition:"background .2s, transform .25s", marginTop:"0.4rem", opacity: joining ? .7 : 1 }}>
              {joining ? "Joining…" : "Enter Room →"}
            </button>
          </form>
          <p style={{ fontFamily:"var(--fm)", fontSize:".6rem", color:"var(--mu)", letterSpacing:".05em", marginTop:"1.6rem", lineHeight:1.6 }}>
            No account needed. Room persists as long as people are chatting. Messages are shared and visible to everyone with the code.
          </p>
        </div>
      </div>
      <style>{`@keyframes pp{0%,100%{box-shadow:0 0 6px var(--ac)}50%{box-shadow:0 0 14px var(--ac),0 0 28px rgba(200,241,53,.3)}}`}</style>
    </div>
  );

  const myMsgs = new Set();
  return (
    <div style={s.root}>
      <div style={s.grain}/>
      <div style={s.orbA}/>
      <div style={s.orbB}/>

      {/* TOPBAR */}
      <div style={{ background:"rgba(9,9,11,.82)", backdropFilter:"blur(20px)", borderBottom:"1px solid var(--bd2)", padding:"0 1.4rem", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, zIndex:10, position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, fontFamily:"var(--fd)", fontWeight:800, fontSize:".93rem", letterSpacing:"-.02em" }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--ac)", boxShadow:"0 0 8px var(--ac)" }}/>
            Gowtham<span style={{ color:"var(--mu2)", fontWeight:400 }}>.Chat</span>
          </div>
          <div style={{ width:1, height:18, background:"var(--bd2)", marginLeft:4 }}/>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontFamily:"var(--fm)", fontSize:".68rem", letterSpacing:".08em", textTransform:"uppercase", color:"var(--mu2)" }}>Room</span>
            <button onClick={copyCode}
              style={{ fontFamily:"var(--fm)", fontSize:".72rem", letterSpacing:".1em", color:"var(--ac)", background:"rgba(200,241,53,.08)", border:"1px solid rgba(200,241,53,.22)", borderRadius:100, padding:"4px 12px", cursor:"pointer", transition:"background .2s" }}>
              {copied ? "Copied!" : roomRef.current}
            </button>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--ac)", boxShadow:"0 0 5px var(--ac)" }}/>
            <span style={{ fontFamily:"var(--fm)", fontSize:".62rem", color:"var(--mu2)", letterSpacing:".05em" }}>{onlineUsers.length} online</span>
          </div>
          <button onClick={leaveRoom}
            style={{ fontFamily:"var(--fm)", fontSize:".62rem", letterSpacing:".07em", textTransform:"uppercase", color:"var(--mu)", background:"none", border:"1px solid var(--bd2)", borderRadius:100, padding:"5px 12px", cursor:"pointer", transition:"color .2s, border-color .2s" }}
            onMouseEnter={e => { e.target.style.color="#fda4af"; e.target.style.borderColor="rgba(244,63,94,.3)"; }}
            onMouseLeave={e => { e.target.style.color="var(--mu)"; e.target.style.borderColor="var(--bd2)"; }}>
            Leave
          </button>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>
        {/* MESSAGES */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ flex:1, overflowY:"auto", padding:"1.4rem 1.4rem .8rem", display:"flex", flexDirection:"column", gap:"0.6rem" }}>
            {messages.length === 0 && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, gap:"1rem", opacity:.5 }}>
                <div style={{ fontFamily:"var(--fm)", fontSize:".65rem", letterSpacing:".1em", textTransform:"uppercase", color:"var(--mu)" }}>No messages yet</div>
                <div style={{ fontFamily:"var(--fm)", fontSize:".6rem", color:"var(--mu)", letterSpacing:".06em" }}>Be the first to say something</div>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.name === userRef.current;
              const prevMsg = messages[i - 1];
              const grouped = prevMsg && prevMsg.name === msg.name && msg.ts - prevMsg.ts < 60000;
              return (
                <div key={msg.id} style={{ display:"flex", flexDirection:"column", alignItems: isMe ? "flex-end" : "flex-start", gap:2 }}>
                  {!grouped && (
                    <div style={{ display:"flex", alignItems:"center", gap:8, paddingLeft: isMe ? 0 : 2, paddingRight: isMe ? 2 : 0 }}>
                      {!isMe && <div style={{ width:22, height:22, borderRadius:"50%", background:"var(--s3)", border:"1px solid var(--bd2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--fd)", fontWeight:800, fontSize:".6rem", color:"var(--ac)", flexShrink:0 }}>{msg.name[0].toUpperCase()}</div>}
                      <span style={{ fontFamily:"var(--fm)", fontSize:".62rem", color: isMe ? "var(--ac)" : "var(--mu2)", letterSpacing:".04em" }}>{isMe ? "You" : msg.name}</span>
                      <span style={{ fontFamily:"var(--fm)", fontSize:".58rem", color:"var(--mu)", letterSpacing:".03em" }}>{fmtTime(msg.ts)}</span>
                    </div>
                  )}
                  <div style={{
                    maxWidth:"72%", padding:"9px 14px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: isMe ? "rgba(200,241,53,.1)" : "var(--s2)",
                    border: isMe ? "1px solid rgba(200,241,53,.22)" : "1px solid var(--bd2)",
                    fontSize:".88rem", lineHeight:1.65, color:"var(--tx)", wordBreak:"break-word"
                  }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* INPUT */}
          <div style={{ padding:".8rem 1.2rem 1.1rem", borderTop:"1px solid var(--bd)", background:"rgba(9,9,11,.6)", backdropFilter:"blur(12px)", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, background:"var(--s2)", border:"1px solid var(--bd2)", borderRadius:"var(--rl)", padding:"6px 6px 6px 14px", transition:"border-color .2s" }}
              onFocusCapture={e => e.currentTarget.style.borderColor="rgba(200,241,53,.32)"}
              onBlurCapture={e => e.currentTarget.style.borderColor="var(--bd2)"}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:"rgba(200,241,53,.1)", border:"1px solid rgba(200,241,53,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--fd)", fontWeight:800, fontSize:".62rem", color:"var(--ac)", flexShrink:0 }}>{userRef.current[0]?.toUpperCase()}</div>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type a message… (Enter to send)"
                maxLength={1000}
                style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:".9rem", color:"var(--tx)", fontFamily:"var(--fb)" }}
              />
              <button onClick={sendMsg} disabled={!input.trim() || sending}
                style={{ background: input.trim() ? "var(--ac)" : "var(--s3)", color: input.trim() ? "var(--bg)" : "var(--mu)", fontFamily:"var(--fm)", fontSize:".66rem", fontWeight:600, letterSpacing:".05em", padding:"8px 16px", borderRadius:100, border:"none", cursor: input.trim() ? "pointer" : "default", transition:"background .2s, transform .2s", flexShrink:0 }}>
                Send →
              </button>
            </div>
            <p style={{ fontFamily:"var(--fm)", fontSize:".57rem", color:"var(--mu)", letterSpacing:".04em", marginTop:6, paddingLeft:2 }}>
              Chatting as <span style={{ color:"var(--ac)" }}>{userRef.current}</span> · Room <span style={{ color:"var(--ac)" }}>{roomRef.current}</span>
            </p>
          </div>
        </div>

        {/* SIDEBAR — online users */}
        <div style={{ width:180, borderLeft:"1px solid var(--bd)", background:"var(--s1)", display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto" }}>
          <div style={{ padding:"1rem", borderBottom:"1px solid var(--bd)" }}>
            <p style={{ fontFamily:"var(--fm)", fontSize:".58rem", letterSpacing:".1em", textTransform:"uppercase", color:"var(--mu)", marginBottom:".8rem" }}>Online — {onlineUsers.length}</p>
            <div style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
              {onlineUsers.map(u => (
                <div key={u.name} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:24, height:24, borderRadius:"50%", background: u.name === userRef.current ? "rgba(200,241,53,.12)" : "var(--s3)", border: u.name === userRef.current ? "1px solid rgba(200,241,53,.3)" : "1px solid var(--bd2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--fd)", fontWeight:800, fontSize:".62rem", color: u.name === userRef.current ? "var(--ac)" : "var(--mu2)", flexShrink:0 }}>{u.name[0].toUpperCase()}</div>
                  <span style={{ fontFamily:"var(--fm)", fontSize:".64rem", color: u.name === userRef.current ? "var(--tx)" : "var(--mu2)", letterSpacing:".02em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.name === userRef.current ? "You" : u.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding:"1rem", marginTop:"auto" }}>
            <p style={{ fontFamily:"var(--fm)", fontSize:".56rem", color:"var(--mu)", letterSpacing:".04em", lineHeight:1.65 }}>Share your room code for others to join.</p>
            <button onClick={copyCode}
              style={{ marginTop:"0.8rem", width:"100%", background:"rgba(200,241,53,.07)", color:"var(--ac)", fontFamily:"var(--fm)", fontSize:".62rem", letterSpacing:".07em", padding:"8px", borderRadius:8, border:"1px solid rgba(200,241,53,.2)", cursor:"pointer", transition:"background .2s" }}
              onMouseEnter={e => e.target.style.background="rgba(200,241,53,.13)"}
              onMouseLeave={e => e.target.style.background="rgba(200,241,53,.07)"}>
              {copied ? "✓ Copied!" : `Copy Code`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
