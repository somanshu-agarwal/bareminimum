// BareMinimum v6.1 - Final tested App.jsx (complete, balanced JSX)
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://noaykcttfgbnufrnyiow.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEFAULT_TAGS = ["Groceries","Canteen","Travel","Bill","Rent","Investment","Gym","Shopping","Misc"];
const currency = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});

function uid(){ return Math.random().toString(36).slice(2,9); }
function formatDateOnly(iso){ const d=new Date(iso); return d.toLocaleDateString(); }
function formatDateTime(iso){ const d=new Date(iso); return d.toLocaleString(); }
function startOfToday(){ const d=new Date(); d.setHours(0,0,0,0); return d; }

const storageProfilesKey = "baremin_profiles_v6_tested";
function storageKey(profile){ return `baremin_v6_tested_${profile}`; }

export default function App(){
  const [dark, setDark] = useState(false);
  const [profiles, setProfiles] = useState(()=>{ try{ return JSON.parse(localStorage.getItem(storageProfilesKey)||"[]") }catch(e){return []} });
  const [active, setActive] = useState(profiles[0]||"");
  const [data, setData] = useState({expenses:[],settings:{}});
  const [form, setForm] = useState({amount:"",mode:"UPI",merchant:"",category:"Groceries",note:""});
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth()));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [lastAddedId, setLastAddedId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authView, setAuthView] = useState("login"); // login | signup
  const [authEmail, setAuthEmail] = useState("");
  const [authPw, setAuthPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [message, setMessage] = useState(null);

  // auth listener + session restore
  useEffect(()=>{
    supabase.auth.getSession().then(res=>{ setUser(res.data.session?.user ?? null); setLoadingAuth(false); if(res.data.session?.user) fetchAndMerge(res.data.session.user.id); });
    const { data:listener } = supabase.auth.onAuthStateChange((event, session)=>{
      setUser(session?.user ?? null);
      if(session?.user) fetchAndMerge(session.user.id);
    });
    return ()=> listener.subscription.unsubscribe();
  },[]);

  useEffect(()=>{ localStorage.setItem(storageProfilesKey, JSON.stringify(profiles)) }, [profiles]);
  useEffect(()=>{ if(!active) return; const raw = localStorage.getItem(storageKey(active)); if(raw) setData(JSON.parse(raw)); else setData({expenses:[],settings:{}}); }, [active]);
  useEffect(()=>{ if(!active) return; localStorage.setItem(storageKey(active), JSON.stringify(data)); }, [data, active]);

  // Profiles
  function createProfile(name){ if(!name) return alert("Enter profile name"); if(profiles.includes(name)){ setActive(name); return; } const next=[...profiles,name]; setProfiles(next); setActive(name); localStorage.setItem(storageKey(name), JSON.stringify({expenses:[],settings:{}})); }
  function deleteProfile(name){ if(!confirm(`Delete profile ${name} and all data?`)) return; setProfiles(p=>p.filter(x=>x!==name)); localStorage.removeItem(storageKey(name)); if(active===name){ setActive(""); setData({expenses:[],settings:{}}); } }

  // Add expense locally + try push remote if signed in
  async function addExpense(e){ e && e.preventDefault(); const amt = parseFloat(form.amount); if(!amt || amt<=0) return alert("Enter valid amount"); const nowIso = new Date().toISOString(); const item = { id: uid(), amount: amt, mode: form.mode, merchant: form.merchant||"Unknown", category: form.category||"Misc", note: form.note||"", timestamp: nowIso, quick:false, synced:false }; item.quick = (item.merchant||"").toLowerCase().split(' ').some(w=> ['blinkit','zepto','dunzo','blink'].includes(w)); setData(prev=>({ ...prev, expenses:[item,...prev.expenses] })); setLastAddedId(item.id); setShowToast(true); setTimeout(()=>setShowToast(false),4000); setForm({ amount:"", mode: form.mode, merchant:"", category: form.category, note:"" }); if(user && navigator.onLine) await pushLocalToRemote(); }

  function undoLast(){ if(!lastAddedId) return; setData(prev=>({ ...prev, expenses: prev.expenses.filter(x=> x.id!==lastAddedId) })); setLastAddedId(null); setShowToast(false); }

  async function deleteExpense(id){ if(!confirm("Delete this expense?")) return; setData(prev=>({ ...prev, expenses: prev.expenses.filter(x=> x.id!==id) })); if(user) { await supabase.from('expenses').delete().eq('id', id).then(()=> fetchAndMerge(user.id)).catch(()=>{}); } }

  function editExpenseMode(id, newMode){ setData(prev=> ({ ...prev, expenses: prev.expenses.map(x=> x.id===id ? {...x, mode:newMode, synced:false} : x) })); }

  // Derived lists
  const expensesSorted = data.expenses.slice().sort((a,b)=> sortOrder==="newest" ? new Date(b.timestamp)-new Date(a.timestamp) : new Date(a.timestamp)-new Date(b.timestamp));

  const years = Array.from(new Set(data.expenses.map(e=> new Date(e.timestamp).getFullYear()))).sort((a,b)=>b-a);
  if(!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear());
  const yearOptions = ["all", ...years.map(String)];

  const filtered = expensesSorted.filter(e=>{ if(month!=="all"){ if(new Date(e.timestamp).getMonth() !== parseInt(month,10)) return false } if(year!=="all"){ if(new Date(e.timestamp).getFullYear() !== parseInt(year,10)) return false } return true });

  const grouped = {};
  filtered.forEach(e=>{ const d = formatDateOnly(e.timestamp); if(!grouped[d]) grouped[d]=[]; grouped[d].push(e); });

  // Totals and summaries
  const todayStart = startOfToday();
  const dailyExpenses = data.expenses.filter(e=> new Date(e.timestamp) >= todayStart);
  const dailyUPI = dailyExpenses.filter(e=> e.mode==="UPI").reduce((s,x)=> s + x.amount, 0);
  const dailyTotal = dailyExpenses.reduce((s,x)=> s + x.amount, 0);
  const monthlyTotal = filtered.reduce((s,x)=> s + x.amount, 0);

  const typeTotals = { Cash:0, UPI:0, Card:0, Netbanking:0, Other:0 };
  filtered.forEach(e=>{ const k = ["Cash","UPI","Card","Netbanking"].includes(e.mode) ? e.mode : "Other"; typeTotals[k] = (typeTotals[k]||0) + e.amount });

  const categoryTotals = {};
  filtered.forEach(e=> { categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount });
  const categoryList = Object.keys(categoryTotals).map(k=> ({k, v: categoryTotals[k]})).sort((a,b)=> b.v - a.v);

  const monthLabel = month==="all" ? (year==="all" ? "All time" : `${year}`) : `${new Date(2020, parseInt(month,10), 1).toLocaleString(undefined,{month:'short'})} ${ year==="all" ? "" : year }`.trim();

  // Supabase sync functions
  async function fetchAndMerge(uid){ try{ const { data:remote, error } = await supabase.from('expenses').select('*').eq('owner', uid).order('timestamp', {ascending:false}); if(error) throw error; const local = data.expenses || []; const map = new Map(); remote.forEach(r=> map.set(r.id, {...r, synced:true})); local.forEach(l=>{ if(!map.has(l.id)) map.set(l.id, {...l, synced:false}) }); const merged = Array.from(map.values()).sort((a,b)=> new Date(b.timestamp)-new Date(a.timestamp)); setData({ expenses: merged, settings: data.settings }); localStorage.setItem(storageKey(uid), JSON.stringify({expenses:merged,settings:data.settings})); }catch(err){ console.error(err); } }

  async function pushLocalToRemote(){ if(!user) return; const unsynced = (data.expenses||[]).filter(e=> !e.synced); if(unsynced.length===0) return; for(const item of unsynced){ try{ const { data:inserted, error } = await supabase.from('expenses').insert([{ owner: user.id, amount: item.amount, mode: item.mode, merchant: item.merchant, category: item.category, note: item.note, timestamp: item.timestamp, quick: item.quick }]).select().single(); if(error) console.error(error); else{ setData(prev=> ({ ...prev, expenses: prev.expenses.map(x=> x.id===item.id ? {...inserted, synced:true} : x) })); } }catch(e){ console.error(e); } } fetchAndMerge(user.id); }

  // Auth helpers
  async function signUp(email, password){ setMessage(null); if(!email||!password) return setMessage({type:'error',text:'Enter email & password'}); if(password.length<6) return setMessage({type:'error',text:'Password must be at least 6 chars'}); const { error } = await supabase.auth.signUp({ email, password }); if(error) setMessage({type:'error',text:error.message}); else setMessage({type:'success',text:'Check your email to confirm/sign in'}); }

  async function signIn(email, password){ setMessage(null); const { error } = await supabase.auth.signInWithPassword({ email, password }); if(error) setMessage({type:'error',text:error.message}); }

  async function signInWithGoogle(){ setMessage(null); const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' }); if(error) setMessage({type:'error',text:error.message}); }

  async function signOut(){ await supabase.auth.signOut(); setUser(null); setMessage({type:'info',text:'Signed out'}); }

  async function resetPassword(email){ if(!email) return setMessage({type:'error',text:'Enter your email'}); const { error } = await supabase.auth.resetPasswordForEmail(email); if(error) setMessage({type:'error',text:error.message}); else setMessage({type:'success',text:'Reset email sent'}); }

  // small helpers
  function showMsg(m){ setMessage(m); setTimeout(()=>setMessage(null),4000); }

  // UI
  if(loadingAuth) return (<div className="container"><div className="card small">Loading auth…</div></div>);

  if(!user) {
    return (
      <div className={"container "+(dark?'dark':'')}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <div className="logo">💸</div>
            <div className="small">Track less, live more 🌿</div>
          </div>
          <div className="switch">
            <label className="small">Dark</label>
            <input type="checkbox" checked={dark} onChange={e=>setDark(e.target.checked)} />
          </div>
        </div>

        <div className="auth-screen">
          <div className="auth-card card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div>
                <div style={{fontSize:18,fontWeight:700}}>Welcome to BareMinimum <span className="emoji-small">💸</span></div>
                <div className="small">Simple tracker. Tiny habits.</div>
              </div>
              <div style={{fontSize:32}}>💸</div>
            </div>

            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <button className="btn-google" onClick={()=>signInWithGoogle()}><span>🔵</span> Sign in with Google</button>
            </div>

            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <button className="input" onClick={()=>setAuthView(authView==="login"?"signup":"login")}>{authView==="login"?"Create account":"Have an account? Sign in"}</button>
            </div>

            <div style={{display:'grid',gap:8}}>
              <input className="input" placeholder="Email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} />
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input className="input" type={showPw?"text":"password"} placeholder="Password" value={authPw} onChange={e=>setAuthPw(e.target.value)} />
                <button className="input" type="button" onClick={()=>setShowPw(s=>!s)}>{showPw?"Hide":"Show"}</button>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <button className="button" type="button" onClick={()=> authView==="login" ? signIn(authEmail,authPw) : signUp(authEmail,authPw)}>{authView==="login"?"Sign in":"Create account"}</button>
                <button className="input" type="button" onClick={()=> resetPassword(authEmail)}>Forgot password?</button>
              </div>
            </div>

            {message && <div style={{marginTop:12}} className="small">{message.text}</div>}
            <div style={{marginTop:12}} className="small">By continuing you agree to keep this tracker for personal use.</div>
          </div>
        </div>
      </div>
    );
  }

  // Main app UI when user is signed in
  return (
    <div className={"container "+(dark?'dark':'')}>
      <div className="header">
        <div>
          <div className="h1">BareMinimum • v6.1</div>
          <div className="small">Welcome, {user.email} • Local-first + Supabase sync</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <label className="small">Profile</label>
          <select className="input" value={active} onChange={e=>setActive(e.target.value)}>
            <option value="">-- choose --</option>
            {profiles.map(p=> <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="input" type="button" onClick={()=>{ const n=prompt("Profile name:"); if(n) createProfile(n.trim()); }}>New</button>
          {active && <button className="input" type="button" onClick={()=>deleteProfile(active)}>Delete</button>}
          <button className="input" type="button" onClick={()=>{ pushLocalToRemote(); showMsg({type:'info',text:'Syncing...'}) }}>Sync</button>
          <button className="input" type="button" onClick={()=>{ signOut(); }}>Sign out</button>
        </div>
      </div>

      {!active ? (
        <div className="card">
          <div className="small">Create/select a profile to start. Profiles are local unless you enable cloud sync (v4).</div>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <input className="input" id="quickname" placeholder="Profile name" />
            <button className="button" type="button" onClick={()=>{ const el=document.getElementById('quickname'); if(el&&el.value) createProfile(el.value.trim()); }}>Create</button>
          </div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16}}>
          <div className="card">
            <div className="h2">Add expense</div>
            <form onSubmit={addExpense} style={{display:'grid',gap:10,marginTop:8}}>
              <div style={{display:'flex',gap:10}}>
                <input className="input" placeholder="Amount (₹)" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} autoFocus />
                <select className="input" value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})}>
                  <option>UPI</option><option>Card</option><option>Cash</option><option>Netbanking</option>
                </select>
              </div>
              <div style={{display:'flex',gap:10}}>
                <input className="input" placeholder="Merchant (e.g. blinkit)" value={form.merchant} onChange={e=>setForm({...form,merchant:e.target.value})} />
                <select className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                  {DEFAULT_TAGS.map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input className="input" placeholder="Note (short)" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} />
              <div style={{display:'flex',gap:10}}>
                <button className="button" type="submit">Add</button>
                <button className="input" type="button" onClick={()=>setForm({amount:"",mode:form.mode,merchant:"",category:form.category,note:""})}>Clear</button>
              </div>
            </form>

            <div style={{marginTop:12}} className="card">
              <div className="summary-title">Expenses ({filtered.length}) • {monthLabel}</div>
              <div style={{display:'flex',gap:12,alignItems:'center',marginTop:8}}>
                <div className="small">Filter month</div>
                <select className="input" value={month} onChange={e=>setMonth(e.target.value)}>
                  <option value="all">All</option>
                  {Array.from({length:12}).map((_,i)=> <option key={i} value={String(i)}>{new Date(2020,i,1).toLocaleString(undefined,{month:'long'})}</option>)}
                </select>
                <select className="input" value={year} onChange={e=>setYear(e.target.value)}>
                  {yearOptions.map(y=> <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={{marginTop:10}} className="small">Sort</div>
              <select className="input" value={sortOrder} onChange={e=>setSortOrder(e.target.value)} style={{marginTop:6}}>
                <option value="newest">Newest</option><option value="oldest">Oldest</option>
              </select>
            </div>

            <div style={{marginTop:12}}>
              <div className="exp-list">
                {Object.keys(grouped).length===0 && <div className="small" style={{padding:12}}>No expenses for selected filters.</div>}
                {Object.keys(grouped).map(dateStr=> (
                  <div key={dateStr}>
                    <div className="date-group">{dateStr}</div>
                    {grouped[dateStr].map(e=> (
                      <div className="exp-item" key={e.id}>
                        <div>
                          <div style={{fontWeight:700}}>{currency.format(e.amount)} <span className="meta">· {e.merchant}</span></div>
                          <div className="meta">{e.category} · {formatDateTime(e.timestamp)}</div>
                          {e.note && <div style={{marginTop:6}} className="meta">{e.note}</div>}
                          {e.quick && <div className="tag" style={{marginTop:6}}>⚡ Quick-commerce</div>}
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end'}}>
                          <select className="input" value={e.mode} onChange={ev=>editExpenseMode(e.id,ev.target.value)}>
                            <option>UPI</option><option>Card</option><option>Cash</option><option>Netbanking</option>
                          </select>
                          <button className="input" type="button" onClick={()=>deleteExpense(e.id)}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="right-col card">
            <div className="summary-title">Summary</div>
            <div style={{display:'flex',justifyContent:'space-between'}}><div className="small">Today total</div><div className="summary-value">{currency.format(dailyTotal)}</div></div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><div className="small">UPI today</div><div className="summary-value" style={{color: dailyUPI>400? 'var(--danger)': 'inherit'}}>{currency.format(dailyUPI)}</div></div>
            <div style={{marginTop:8}} className="small">If UPI today &gt; ₹400 it will be highlighted.</div>

            <div style={{marginTop:12}} className="card">
              <div className="summary-title">By payment type</div>
              <div className="small">
                <div style={{display:'flex',justifyContent:'space-between'}}><div>Cash</div><div className="summary-value">{currency.format(typeTotals.Cash)}</div></div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><div>UPI</div><div className="summary-value">{currency.format(typeTotals.UPI)}</div></div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><div>Card</div><div className="summary-value">{currency.format(typeTotals.Card)}</div></div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><div>Netbanking</div><div className="summary-value">{currency.format(typeTotals.Netbanking)}</div></div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><div>Other</div><div className="summary-value">{currency.format(typeTotals.Other)}</div></div>
              </div>
            </div>

            <div style={{marginTop:12}} className="card">
              <div className="summary-title">By category</div>
              <div>
                {categoryList.length===0 && <div className="small">No categories yet.</div>}
                {categoryList.map(c=> (
                  <div key={c.k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}><div className="small">{c.k}</div><div className="summary-value">{currency.format(c.v)}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {showToast && lastAddedId && (
        <div className="toast">Expense added ✓ <button className="input" type="button" onClick={undoLast} style={{marginLeft:8}}>Undo</button></div>
      )}
      <div style={{height:60}}></div>
      <div className="fab" role="button" onClick={()=>{ const el = document.querySelector('input[placeholder=\"Amount (₹)\"]'); if(el){ el.focus(); window.scrollTo({top:0, behavior:'smooth'}); } }}>+ Add</div>
    </div>
  );
}
