// @ts-nocheck
import { useState, useRef, useEffect } from "react";

const QUESTIONS = {
  kids:  [
    "What is your name and how old are you?",
    "What do you like to do every day?",
    "Tell me about your favorite food or game.",
  ],
  teen:  [
    "Tell me about yourself.",
    "What do you usually do in your free time?",
    "What are your goals in the future?",
  ],
  adult: [
    "Tell me about yourself.",
    "Why do you want to learn English?",
    "Describe your daily routine.",
  ],
};

const AGE_GROUPS = [
  { label: "3 – 7 years old",   key: "kids",  emoji: "🧸", color: "#f9a825" },
  { label: "8 – 17 years old",  key: "teen",  emoji: "🎒", color: "#34d399" },
  { label: "18 – 40 years old", key: "adult", emoji: "💼", color: "#60a5fa" },
  { label: "41 – 55 years old", key: "adult", emoji: "🌟", color: "#f472b6" },
];

const makePrompt = (category) => `You are a warm English placement examiner at English Solutions language centre.
You will receive 3 spoken answers (as text transcripts) from a ${category === "kids" ? "young child aged 3-7" : category === "teen" ? "teenager aged 8-17" : "adult aged 18-55"}.
After all 3 answers are submitted, evaluate their English speaking level.
Respond ONLY with this exact JSON object — no other text:
{
  "level": "Beginner|Elementary|Pre-Intermediate|Intermediate|Upper-Intermediate|Advanced",
  "score": 0-100,
  "summary": "2-3 warm encouraging sentences about their speaking ability",
  "recommended_class": "Suggested class name",
  "strengths": "One sentence on what they do well",
  "improve": "One sentence on what to work on"
}`;

const ADMIN_PASS = "englishsolutions2024";

export default function App() {
  const [phase, setPhase] = useState("landing");
  const [form, setForm] = useState({ name: "", whatsapp: "", ageGroup: null });
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [result, setResult] = useState(null);
  const [submissions, setSubmissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("es_submissions") || "[]"); } catch { return []; }
  });
  const [adminInput, setAdminInput] = useState("");
  const [adminError, setAdminError] = useState("");
  const [pulseAnim, setPulseAnim] = useState(false);
  const recRef = useRef(null);

  useEffect(() => {
    if (!isRecording) { setPulseAnim(false); return; }
    const id = setInterval(() => setPulseAnim(p => !p), 700);
    return () => clearInterval(id);
  }, [isRecording]);

  const questions = form.ageGroup ? QUESTIONS[form.ageGroup.key] : [];
  const currentQ = questions[qIndex] || "";

  const saveSubmission = (res, ans) => {
    const record = {
      id: Date.now(),
      date: new Date().toLocaleString("en-GB"),
      name: form.name,
      whatsapp: form.whatsapp,
      ageLabel: form.ageGroup.label,
      answers: ans,
      ...res,
    };
    const updated = [record, ...submissions];
    setSubmissions(updated);
    try { localStorage.setItem("es_submissions", JSON.stringify(updated)); } catch {}
  };

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Please use Chrome browser for voice recording."); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTranscript(t);
    };
    rec.onerror = () => { setIsRecording(false); alert("Microphone error. Please allow microphone access."); };
    rec.onend = () => setIsRecording(false);
    recRef.current = rec;
    rec.start();
    setIsRecording(true);
    setTranscript("");
  };

  const stopAndSubmit = async () => {
    if (recRef.current) recRef.current.stop();
    setIsRecording(false);
    const spoken = transcript.trim();
    if (!spoken) { alert("No speech detected. Please try again."); return; }
    const newAnswers = [...answers, { q: currentQ, a: spoken }];
    setAnswers(newAnswers);
    setTranscript("");
    if (qIndex < 2) { setQIndex(qIndex + 1); return; }
    setIsThinking(true);
    const prompt = newAnswers.map((x, i) => `Q${i+1}: ${x.q}\nAnswer: ${x.a}`).join("\n\n");
    try {
     const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    "Authorization": `Bearer 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"}`
  },
  body: JSON.stringify({
    model: "llama3-8b-8192",
    messages: [
      { role: "system", content: makePrompt(form.ageGroup.key) },
      { role: "user", content: prompt }
    ],
  }),
});
const data = await res.json();
const text = data.choices[0].message.content.trim();
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      saveSubmission(parsed, newAnswers);
      setPhase("done");
    } catch { alert("Something went wrong. Please try again."); }
    finally { setIsThinking(false); }
  };

  const resetAll = () => {
    setPhase("landing"); setForm({ name: "", whatsapp: "", ageGroup: null });
    setQIndex(0); setAnswers([]); setTranscript(""); setResult(null);
  };

  const LVLCOLOR = {
    Beginner: "#f9a825", Elementary: "#34d399",
    "Pre-Intermediate": "#60a5fa", Intermediate: "#f472b6",
    "Upper-Intermediate": "#a78bfa", Advanced: "#fc6d6d",
  };

  if (phase === "adminLogin") return (
    <div style={P.page}>
      <div style={P.card}>
        <div style={P.centerLogo}><div style={P.logoMark}>ES</div></div>
        <h2 style={P.cardTitle}>Admin Access</h2>
        <input style={P.inp} type="password" placeholder="Enter password"
          value={adminInput} onChange={(e) => setAdminInput(e.target.value)} />
        {adminError && <p style={{ color: "#f87171", fontSize: 13 }}>{adminError}</p>}
        <button style={P.greenBtn} onClick={() => {
          if (adminInput === ADMIN_PASS) { setPhase("admin"); setAdminError(""); }
          else setAdminError("Wrong password");
        }}>Enter</button>
        <button style={P.ghostBtn} onClick={() => setPhase("landing")}>← Back</button>
      </div>
      <style>{CSS}</style>
    </div>
  );

  if (phase === "admin") return (
    <div style={{ ...P.page, alignItems: "flex-start", padding: "20px 16px" }}>
      <div style={{ width: "100%", maxWidth: 700, margin: "0 auto" }}>
        <div style={P.adminHeader}>
          <div>
            <div style={P.logoRow2}><div style={P.logoMark}>ES</div><span style={P.brandAdmin}>English Solutions</span></div>
            <p style={P.adminSub}>Placement Results — {submissions.length} submission{submissions.length !== 1 ? "s" : ""}</p>
          </div>
          <button style={P.ghostBtn} onClick={() => setPhase("landing")}>← Exit</button>
        </div>
        {submissions.length === 0 && <div style={P.emptyBox}><p style={{ color: "rgba(255,255,255,0.35)", margin: 0 }}>No submissions yet.</p></div>}
        {submissions.map((s) => {
          const c = LVLCOLOR[s.level] || "#fff";
          return (
            <div key={s.id} style={P.subCard}>
              <div style={P.subTop}>
                <div>
                  <div style={P.subName}>{s.name}</div>
                  <div style={P.subMeta}>📱 {s.whatsapp} · 🧑 {s.ageLabel} · 🕐 {s.date}</div>
                </div>
                <div style={{ ...P.levelBadge, background: c+"22", color: c, borderColor: c+"55" }}>{s.level}</div>
              </div>
              <div style={P.scoreRow}>
                <div style={P.scoreBarBg}><div style={{ ...P.scoreBarFill, width: `${s.score}%`, background: c }} /></div>
                <span style={{ ...P.scoreNum, color: c }}>{s.score}/100</span>
              </div>
              <p style={P.subSummary}>{s.summary}</p>
              <div style={P.tagsRow}>
                <span style={P.tagGreen}>✅ {s.strengths}</span>
                <span style={P.tagOrange}>📈 {s.improve}</span>
              </div>
              <div style={P.classRow}>
                <span style={P.classTag}>Recommended:</span>
                <span style={{ ...P.classVal, color: c }}>{s.recommended_class}</span>
              </div>
              <details>
                <summary style={P.detailsSummary}>View answers</summary>
                {s.answers && s.answers.map((a, i) => (
                  <div key={i} style={P.answerBlock}>
                    <p style={P.ansQ}>Q{i+1}: {a.q}</p>
                    <p style={P.ansA}>"{a.a}"</p>
                  </div>
                ))}
              </details>
            </div>
          );
        })}
      </div>
      <style>{CSS}</style>
    </div>
  );

  if (phase === "done" && result) {
    const c = LVLCOLOR[result.level] || "#fff";
    return (
      <div style={P.page}>
        <div style={P.card}>
          <div style={P.centerLogo}><div style={P.logoMark}>ES</div></div>
          <p style={{ ...P.doneBadge, background: c+"22", color: c, borderColor: c+"44" }}>Test Complete 🎉</p>
          <h2 style={{ ...P.levelBig, color: c }}>{result.level}</h2>
          <p style={P.doneGreet}>Well done, {form.name}!</p>
          <div style={P.scoreWrap}>
            <div style={P.scoreBarBg}><div style={{ ...P.scoreBarFill, width: `${result.score}%`, background: c }} /></div>
            <span style={{ ...P.scoreNum, color: c }}>{result.score}/100</span>
          </div>
          <p style={P.summaryText}>{result.summary}</p>
          <div style={{ ...P.classCardResult, borderColor: c+"55" }}>
            <div style={P.classTag2}>Recommended Class</div>
            <div style={{ ...P.classNameResult, color: c }}>{result.recommended_class}</div>
          </div>
          <p style={P.thanksText}>Our team will contact you on WhatsApp soon! 😊</p>
          <button style={P.greenBtn} onClick={resetAll}>← Start Over</button>
        </div>
        <style>{CSS}</style>
      </div>
    );
  }

  if (phase === "test") {
    const ag = form.ageGroup;
    return (
      <div style={P.page}>
        <div style={P.card}>
          <div style={P.testHeader}>
            <div style={P.logoRow2}><div style={P.logoMark}>ES</div></div>
            <div style={{ ...P.qBadge, background: ag.color+"22", color: ag.color }}>Question {qIndex+1} of 3</div>
          </div>
          <div style={P.dots}>
            {[0,1,2].map(i => <div key={i} style={{ ...P.dot, background: i < qIndex ? ag.color : i === qIndex ? "#fff" : "rgba(255,255,255,0.15)" }} />)}
          </div>
          <div style={P.qBox}>
            <p style={P.qEmoji}>{ag.emoji}</p>
            <p style={P.qText}>{currentQ}</p>
          </div>
          {(isRecording || transcript) && (
            <div style={P.transcriptBox}>
              <p style={{ ...P.transcriptText, opacity: transcript ? 1 : 0.5 }}>{transcript || "Listening…"}</p>
            </div>
          )}
          {isThinking ? (
            <div style={P.thinkingBox}>
              <div className="td1" style={P.tdot} /><div className="td2" style={P.tdot} /><div className="td3" style={P.tdot} />
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginLeft: 10 }}>Evaluating…</span>
            </div>
          ) : !isRecording ? (
            <button style={{ ...P.micBtn, background: `linear-gradient(135deg, ${ag.color}, ${ag.color}99)` }} onClick={startRecording}>
              <span style={P.micIcon}>🎙️</span>
              <span style={P.micLabel}>Tap to Speak</span>
            </button>
          ) : (
            <button style={{ ...P.micBtn, background: "linear-gradient(135deg, #f87171, #dc2626)", position: "relative" }} onClick={stopAndSubmit}>
              <div style={P.ring} className={pulseAnim ? "ring-pulse" : ""} />
              <span style={P.micIcon}>⏹️</span>
              <span style={P.micLabel}>Tap to Stop</span>
            </button>
          )}
          <p style={P.hintText}>{isRecording ? "Speak clearly… tap ⏹ when you finish" : "Tap the button and speak your answer"}</p>
        </div>
        <style>{CSS}</style>
      </div>
    );
  }

  const canBegin = form.name.trim() && form.whatsapp.trim() && form.ageGroup;
  return (
    <div style={P.page}>
      <div style={P.card}>
        <div style={P.centerLogo}><div style={P.logoMark}>ES</div></div>
        <h1 style={P.brandName}>English Solutions</h1>
        <p style={P.tagline}>Speaking Placement Assessment</p>
        <div style={P.divider} />
        <label style={P.label}>Full Name</label>
        <input style={P.inp} placeholder="e.g. Ahmad Razif" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label style={P.label}>WhatsApp Number</label>
        <input style={P.inp} placeholder="e.g. 0123456789" type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
        <label style={P.label}>Age Group</label>
        <div style={P.ageGrid}>
          {AGE_GROUPS.map((g, i) => {
            const sel = form.ageGroup && form.ageGroup.label === g.label;
            return (
              <button key={i} style={{ ...P.ageBtn, borderColor: sel ? g.color : "rgba(255,255,255,0.12)", background: sel ? g.color+"22" : "rgba(255,255,255,0.04)", color: sel ? g.color : "rgba(255,255,255,0.6)" }}
                onClick={() => setForm({ ...form, ageGroup: g })}>
                <span style={{ fontSize: 22 }}>{g.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{g.label}</span>
              </button>
            );
          })}
        </div>
        <button style={{ ...P.greenBtn, opacity: canBegin ? 1 : 0.4 }} disabled={!canBegin} onClick={() => setPhase("test")}>
          Begin Placement →
        </button>
        <button style={P.adminLink} onClick={() => setPhase("adminLogin")}>🔐 Admin</button>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const P = {
  page: { minHeight: "100vh", background: "linear-gradient(160deg, #0a1628 0%, #0f2040 60%, #071020 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Poppins', sans-serif", padding: "20px 16px", boxSizing: "border-box" },
  card: { width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 28, padding: "32px 24px 28px", display: "flex", flexDirection: "column", alignItems: "stretch" },
  centerLogo: { display: "flex", justifyContent: "center", marginBottom: 14 },
  logoMark: { width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #1e88e5, #0d47a1)", color: "#fff", fontWeight: 900, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: -1, boxShadow: "0 4px 20px rgba(30,136,229,0.4)" },
  brandName: { textAlign: "center", margin: "0 0 4px", color: "#fff", fontSize: 26, fontWeight: 800, letterSpacing: -0.5 },
  tagline: { textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 22px" },
  divider: { height: 1, background: "rgba(255,255,255,0.07)", margin: "0 0 22px" },
  label: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 7 },
  inp: { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "13px 16px", color: "#fff", fontSize: 15, outline: "none", fontFamily: "'Poppins', sans-serif", marginBottom: 18 },
  ageGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 },
  ageBtn: { border: "1.5px solid", borderRadius: 14, padding: "12px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.2s", fontFamily: "'Poppins', sans-serif" },
  greenBtn: { background: "linear-gradient(135deg, #1e88e5, #1565c0)", border: "none", borderRadius: 14, padding: "15px", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "'Poppins', sans-serif", boxShadow: "0 4px 20px rgba(30,136,229,0.3)", marginBottom: 12 },
  ghostBtn: { background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "11px 20px", color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
  adminLink: { background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 12, cursor: "pointer", fontFamily: "'Poppins', sans-serif", padding: "8px", textAlign: "center" },
  testHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  logoRow2: { display: "flex", alignItems: "center", gap: 8 },
  brandAdmin: { color: "#fff", fontWeight: 800, fontSize: 16 },
  qBadge: { borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 700 },
  dots: { display: "flex", gap: 10, marginBottom: 24, justifyContent: "center" },
  dot: { width: 12, height: 12, borderRadius: "50%", transition: "background 0.3s" },
  qBox: { background: "rgba(255,255,255,0.06)", borderRadius: 18, padding: "22px 20px", marginBottom: 18, textAlign: "center" },
  qEmoji: { fontSize: 32, margin: "0 0 10px" },
  qText: { color: "#fff", fontSize: 18, lineHeight: 1.65, margin: 0, fontWeight: 600 },
  transcriptBox: { background: "rgba(30,136,229,0.1)", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 14, padding: "14px 16px", marginBottom: 16, minHeight: 52 },
  transcriptText: { color: "#90caf9", fontSize: 15, margin: 0, lineHeight: 1.5, textAlign: "center", fontStyle: "italic" },
  micBtn: { border: "none", borderRadius: "50%", width: 130, height: 130, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", alignSelf: "center", margin: "10px auto 16px", position: "relative", boxShadow: "0 8px 30px rgba(0,0,0,0.4)" },
  micIcon: { fontSize: 40, lineHeight: 1 },
  micLabel: { color: "#fff", fontSize: 12, fontWeight: 700 },
  ring: { position: "absolute", inset: -8, borderRadius: "50%", border: "3px solid rgba(248,113,113,0.4)" },
  thinkingBox: { display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", gap: 6 },
  tdot: { width: 10, height: 10, borderRadius: "50%", background: "#1e88e5" },
  hintText: { color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", margin: 0 },
  doneBadge: { display: "inline-block", border: "1px solid", borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 8 },
  levelBig: { fontSize: 34, fontWeight: 900, textAlign: "center", margin: "6px 0 4px" },
  doneGreet: { color: "rgba(255,255,255,0.45)", fontSize: 15, textAlign: "center", margin: "0 0 20px" },
  scoreWrap: { marginBottom: 16 },
  scoreBarBg: { height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", marginBottom: 6 },
  scoreBarFill: { height: "100%", borderRadius: 10, transition: "width 1.2s" },
  scoreNum: { fontSize: 18, fontWeight: 800, textAlign: "right", display: "block" },
  summaryText: { color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.7, textAlign: "center", margin: "0 0 16px" },
  classCardResult: { border: "1.5px solid", borderRadius: 16, padding: "18px", marginBottom: 16, textAlign: "center" },
  classTag2: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  classNameResult: { fontSize: 20, fontWeight: 800 },
  thanksText: { color: "rgba(255,255,255,0.45)", fontSize: 13, textAlign: "center", margin: "0 0 18px" },
  adminHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  adminSub: { color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "4px 0 0" },
  emptyBox: { textAlign: "center", padding: 40 },
  subCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "20px", marginBottom: 16 },
  subTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  subName: { color: "#fff", fontWeight: 800, fontSize: 17, marginBottom: 4 },
  subMeta: { color: "rgba(255,255,255,0.35)", fontSize: 12 },
  levelBadge: { border: "1px solid", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" },
  scoreRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  subSummary: { color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" },
  tagsRow: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 },
  tagGreen: { background: "rgba(52,211,153,0.1)", color: "#34d399", borderRadius: 8, padding: "6px 10px", fontSize: 12 },
  tagOrange: { background: "rgba(251,146,60,0.1)", color: "#fb923c", borderRadius: 8, padding: "6px 10px", fontSize: 12 },
  classRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 12 },
  classTag: { color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 700 },
  classVal: { fontSize: 14, fontWeight: 700 },
  detailsSummary: { color: "rgba(255,255,255,0.3)", fontSize: 12, marginBottom: 10, cursor: "pointer" },
  answerBlock: { marginTop: 10 },
  ansQ: { color: "rgba(255,255,255,0.4)", fontSize: 12, margin: "0 0 4px" },
  ansA: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontStyle: "italic", margin: 0 },
  cardTitle: { color: "#fff", textAlign: "center", fontWeight: 800, fontSize: 22, margin: "0 0 20px" },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap');
  * { -webkit-tap-highlight-color: transparent; }
  input::placeholder { color: rgba(255,255,255,0.25); }
  input:focus { border-color: rgba(30,136,229,0.6) !important; }
  @keyframes tdBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
  .td1{animation:tdBounce 1.1s infinite}
  .td2{animation:tdBounce 1.1s infinite 0.18s}
  .td3{animation:tdBounce 1.1s infinite 0.36s}
  @keyframes ringPulse{0%{transform:scale(1);opacity:0.6}100%{transform:scale(1.3);opacity:0}}
  .ring-pulse{animation:ringPulse 0.9s ease-out infinite}
`;
