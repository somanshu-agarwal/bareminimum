// BareMinimum v3 - Local-only advanced tracker
import React, { useEffect, useState, useRef } from "react";

const SUGGESTED_TAGS = [
  {key:"Groceries", emoji:"🥦"}, {key:"Canteen", emoji:"🍱"}, {key:"Travel", emoji:"🚗"},
  {key:"Bill", emoji:"💡"}, {key:"Rent", emoji:"🏠"}, {key:"Investment", emoji:"📈"},
  {key:"Gym", emoji:"🏋️"}, {key:"Shopping", emoji:"🛍️"}, {key:"Misc", emoji:"🔖"}
];

const QUICK_COMMERCE_KEYWORDS = ['blinkit','zepto','dunzo','blink','groceries','quick'];

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

const storageProfilesKey = "baremin_profiles_v3";
function storageKey(profile){ return `baremin_v3_${profile}`; }

function uid(){ return Math.random().toString(36).slice(2,9); }

function formatDateOnly(iso){ const d = new Date(iso); return d.toLocaleDateString(); }
function formatDateTime(iso){ const d = new Date(iso); return d.toLocaleString(); }

export default function App(){
  const [profiles, setProfiles] = useState(()=> { try{ return JSON.parse(localStorage.getItem(storageProfilesKey) || "[]") }catch(e){ return [] } });
  const [active, setActive] = useState(profiles[0] || "");
  const [data, setData] = useState({ expenses: [], settings:{} });
  const [form, setForm] = useState({ amount:"", mode:"UPI", merchant:"", category:"Groceries", note:"" });
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const [lastAddedId, setLastAddedId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const merchantRef = useRef(null);

  // Load profile data
  useEffect(()=>{
    if(!active) return;
    const raw = localStorage.getItem(storageKey(active));
    if(raw) setData(JSON.parse(raw)); else setData({ expenses: [], settings:{} });
  }, [active]);

  // Persist profiles list
  useEffect(()=>{ localStorage.setItem(storageProfilesKey, JSON.stringify(profiles)) }, [profiles]);

  // Persist profile data
  useEffect(()=>{ if(!active) return; localStorage.setItem(storageKey(active), JSON.stringify(data)) }, [data, active]);

  // Create profile
  function createProfile(name){
    if(!name) return alert("Enter a profile name");
    if(profiles.includes(name)){ setActive(name); return; }
    const next = [...profiles, name];
    setProfiles(next); setActive(name);
    localStorage.setItem(storageKey(name), JSON.stringify({ expenses: [], settings:{} }));
  }
  function deleteProfile(name){
    if(!confirm(`Delete profile ${name} and all data?`)) return;
    setProfiles(prev=> prev.filter(p=>p!==name));
    localStorage.removeItem(storageKey(name));
    if(active===name){ setActive(""); setData({ expenses: [], settings:{} }); }
  }

  // Add expense
  function addExpense(ev){
    ev && ev.preventDefault();
    const amt = parseFloat(form.amount);
    if(!amt || amt<=0) return alert("Enter valid amount");
    const now = new Date();
    const quick = QUICK_COMMERCE_KEYWORDS.some(k=> (form.merchant||"").toLowerCase().includes(k));
    const item = { id: uid(), amount: amt, mode: form.mode, merchant: form.merchant||"Unknown", category: form.category||"Misc", note: form.note||"", timestamp: now.toISOString(), quick };
    setData(prev=> ({ ...prev, expenses: [item, ...prev.expenses] }));
    setLastAddedId(item.id);
    setShowToast(true);
    setTimeout(()=>setShowToast(false), 4000);
    // reset form but keep mode & category for speed
    setForm({ amount:"", mode: form.mode, merchant:"", category: form.category, note:"" });
  }

  function undoLast(){
    if(!lastAddedId) return;
    setData(prev=> ({ ...prev, expenses: prev.expenses.filter(x=> x.id !== lastAddedId) }));
    setLastAddedId(null);
    setShowToast(false);
  }

  function deleteExpense(id){ if(!confirm("Delete expense?")) return setData(prev=> ({ ...prev, expenses: prev.expenses.filter(x=>x.id!==id) })); }
  function markAsCash(id){ setData(prev=> ({ ...prev, expenses: prev.expenses.map(x=> x.id===id ? {...x, mode:"Cash"} : x) })); }

  // Derived lists and filters
  const expenses = data.expenses.slice().sort((a,b)=> sortOrder==="newest" ? new Date(b.timestamp)-new Date(a.timestamp) : new Date(a.timestamp)-new Date(b.timestamp));

  // unique years from expenses
  const years = Array.from(new Set(data.expenses.map(e=> new Date(e.timestamp).getFullYear()))).sort((a,b)=>b-a);
  if(!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear());
  const yearOptions = ["all", ...years.map(String)];

  const filtered = expenses.filter(e=>{
    if(month!=="all"){
      if(new Date(e.timestamp).getMonth() !== parseInt(month,10)) return false;
    }
    if(year!=="all"){
      if(new Date(e.timestamp).getFullYear() !== parseInt(year,10)) return false;
    }
    return true;
  });

  // group by date for display
  const grouped = {};
  filtered.forEach(e=>{ const d = formatDateOnly(e.timestamp); if(!grouped[d]) grouped[d]=[]; grouped[d].push(e); });

  // totals
  const todayISOstart = new Date(); todayISOstart.setHours(0,0,0,0);
  const dailyExpenses = data.expenses.filter(e=> new Date(e.timestamp) >= todayISOstart);
  const dailyUPI = dailyExpenses.filter(e=> e.mode==="UPI").reduce((s,x)=> s + x.amount, 0);
  const dailyTotal = dailyExpenses.reduce((s,x)=> s + x.amount, 0);
  const monthlyTotal = filtered.reduce((s,x)=> s + x.amount, 0);

  // category totals (for filtered view)
  const categoryTotals = {};
  filtered.forEach(e=> { categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount; });
  const categoryList = Object.keys(categoryTotals).map(k=> ({k, v: categoryTotals[k]})).sort((a,b)=> b.v - a.v);

  // label for summary like "Nov 2025 Exp"
  const monthLabel = month==="all" ? (year==="all" ? "All time" : `${year}`) : `${new Date(2020, parseInt(month,10), 1).toLocaleString(undefined,{month:'short'})} ${ year==="all" ? "" : year }`.trim();

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <h2 style={{margin:0}}>BareMinimum • v3</h2>
          <div className="small">Local profiles • grouped dates • category view • multi-device when you add cloud</div>
        </div>

        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <label className="small">Profile</label>
          <select className="input" value={active} onChange={e=>setActive(e.target.value)}>
            <option value="">-- choose --</option>
            {profiles.map(p=> <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="input" onClick={()=>{ const n = prompt("Profile name:"); if(n) createProfile(n.trim()); }}>New</button>
          {active && <button className="input" onClick={()=>deleteProfile(active)}>Delete</button>}
        </div>
      </div>

      {!active ? (
        <div className="card">
          <div style={{marginBottom:8}}>Create or select a profile to start. Profiles are stored locally. For cross-device sync we'll add cloud in v4.</div>
          <div style={{display:'flex', gap:8}}>
            <input className="input" id="quickname" placeholder="Profile name" />
            <button className="button" onClick={()=>{ const el = document.getElementById("quickname"); if(el && el.value) createProfile(el.value.trim()); }}>Create</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{display:'grid', gridTemplateColumns:'1fr 340px', gap:12}}>
            <div className="card">
              <h3 style={{marginTop:0}}>Add expense</h3>
              <form onSubmit={addExpense} style={{display:'grid', gap:8}}>
                <div style={{display:'flex', gap:8}}>
                  <input className="input" placeholder="Amount (₹)" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} autoFocus />
                  <select className="input" value={form.mode} onChange={e=>setForm({...form, mode:e.target.value})}>
                    <option>UPI</option><option>Card</option><option>Cash</option><option>Netbanking</option>
                  </select>
                </div>

                <div style={{display:'flex', gap:8}}>
                  <input className="input" placeholder="Merchant (e.g. blinkit)" list="merchants" value={form.merchant} onChange={e=>setForm({...form, merchant:e.target.value})} ref={merchantRef} />
                </div>

                <datalist id="merchants">
                  {Array.from(new Set(data.expenses.map(e=>e.merchant))).filter(Boolean).map(m=> <option key={m} value={m} />)}
                </datalist>

                <div style={{display:'flex', gap:8}}>
                  <select className="input" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}>
                    {SUGGESTED_TAGS.map(t=> <option key={t.key} value={t.key}>{t.emoji} {t.key}</option>)}
                  </select>
                  <input className="input" placeholder="Note (short)" value={form.note} onChange={e=>setForm({...form, note:e.target.value})} />
                </div>

                <div style={{display:'flex', gap:8}}>
                  <button className="button" type="submit">Add</button>
                  <button className="input" type="button" onClick={()=>{ setForm({ amount:"", mode: form.mode, merchant:"", category: form.category, note:"" }); }}>Clear</button>
                </div>
              </form>

              <div style={{marginTop:12}} className="small">Tip: Use Enter to save. Recent merchants are suggested as you type.</div>
            </div>

            <div className="card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div className="summary-title">Quick summary</div>
                  <div style={{fontWeight:700}}>{monthLabel} Expenses • {currency.format(monthlyTotal)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div className="small">Today: <strong>{currency.format(dailyTotal)}</strong></div>
                  <div style={{marginTop:6}}>UPI today: <strong>{currency.format(dailyUPI)}</strong> {dailyUPI>400 && <div className="alert">Limit exceeded</div>}</div>
                </div>
              </div>

              <div style={{marginTop:10}}>
                <label className="small">Filter month</label>
                <select className="input" value={month} onChange={e=>setMonth(e.target.value)}>
                  <option value="all">All</option>
                  {Array.from({length:12}).map((_,i)=> <option key={i} value={String(i)}>{new Date(2020,i,1).toLocaleString(undefined,{month:'long'})}</option>)}
                </select>
                <label className="small" style={{marginTop:8}}>Filter year</label>
                <select className="input" value={year} onChange={e=>setYear(e.target.value)}>
                  {yearOptions.map(y=> <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div style={{marginTop:12}}>
                <div className="small">Sort</div>
                <select className="input" value={sortOrder} onChange={e=>setSortOrder(e.target.value)}>
                  <option value="newest">Newest</option><option value="oldest">Oldest</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{display:'flex', gap:12, marginTop:12}}>
            <div style={{flex:1}} className="card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h3 style={{margin:0}}>Expenses ({filtered.length})</h3>
                <div className="small">Grouped by date</div>
              </div>

              <div className="exp-list">
                {Object.keys(grouped).length===0 && <div className="small" style={{padding:12}}>No expenses for selected filters.</div>}
                {Object.keys(grouped).map(dateStr=> (
                  <div key={dateStr}>
                    <div className="date-group">{dateStr}</div>
                    {grouped[dateStr].map(e=> (
                      <div className="exp-item" key={e.id}>
                        <div>
                          <div style={{fontWeight:700}}>{currency.format(e.amount)} <span className="small">· {e.merchant}</span></div>
                          <div className="small">{e.category} · {formatDateTime(e.timestamp)}</div>
                          {e.note && <div style={{marginTop:6}} className="small">{e.note}</div>}
                          {e.quick && <div className="tag">Quick-commerce flagged</div>}
                        </div>
                        <div style={{display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end'}}>
                          <button className="input" onClick={()=>markAsCash(e.id)}>Mark as cash</button>
                          <button className="input" onClick={()=>deleteExpense(e.id)}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div style={{width:340}} className="card">
              <h4 style={{marginTop:0}}>By category</h4>
              <div>
                {categoryList.length===0 && <div className="small">No categories yet.</div>}
                {categoryList.map(c=> (
                  <div className="category-row" key={c.k}>
                    <div><span className="emoji">{(SUGGESTED_TAGS.find(t=>t.key===c.k)||{emoji:"🔖"}).emoji}</span> {c.k}</div>
                    <div style={{fontWeight:700}}>{currency.format(c.v)}</div>
                  </div>
                ))}
              </div>

              <hr />
              <h5 style={{marginTop:8}}>Rituals</h5>
              <ol className="small">
                <li>Withdraw a small daily cash allowance and record withdrawals.</li>
                <li>Pause 15 minutes before UPI purchases.</li>
                <li>Review category totals weekly.</li>
              </ol>
            </div>
          </div>
        </>
      )}

      {showToast && lastAddedId && (
        <div className="toast">
          Expense added ✓ <button className="input" onClick={undoLast} style={{marginLeft:8}}>Undo</button>
        </div>
      )}

      <div className="fab" onClick={()=>{ const el = document.querySelector('input[placeholder=\"Amount (₹)\"]'); if(el){ el.focus(); window.scrollTo({top:0, behavior:'smooth'}); } }}>+ Add</div>
    </div>
  );
}
