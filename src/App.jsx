import React, {useEffect, useState} from "react";
import { createClient } from "@supabase/supabase-js";
import { Routes, Route, useNavigate } from "react-router-dom";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://noaykcttfgbnufrnyiow.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function Home(){ 
  const navigate = useNavigate();
  useEffect(()=>{ supabase.auth.getSession().then(res=>{ if(res.data.session?.user) navigate('/dashboard'); }); },[]);
  async function signInGoogle(){ await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } }); }
  return (
    <div className="container">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div><div className="h1">💸 BareMinimum</div><div className="small">Track less, live more 🌿</div></div>
      </div>
      <div className="card" style={{maxWidth:420,margin:'0 auto',textAlign:'center'}}>
        <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>Sign in with Google</div>
        <button className="button" onClick={signInGoogle}>🔵 Sign in with Google</button>
        <div className="small" style={{marginTop:12}}>You will be redirected to sign in. Configure Supabase and Google redirect URI to your Vercel URL.</div>
      </div>
    </div>
  );
}

function Dashboard(){
  const navigate = useNavigate();
  const [user,setUser] = useState(null);
  const [data,setData] = useState({expenses:[]});
  const [form,setForm] = useState({amount:'',mode:'UPI',merchant:'',category:'Groceries',note:''});

  useEffect(()=>{
    supabase.auth.getSession().then(res=>{ if(!res.data.session?.user) { navigate('/'); } else { setUser(res.data.session.user); fetchAndMerge(res.data.session.user.id); } });
    const { data:listener } = supabase.auth.onAuthStateChange((event, session)=>{ if(!session) navigate('/'); else setUser(session.user); });
    return ()=> listener.subscription.unsubscribe();
  },[]);

  async function fetchAndMerge(uid){
    try{
      const { data:remote } = await supabase.from('expenses').select('*').eq('owner', uid).order('timestamp',{ascending:false});
      setData({expenses: remote || []});
    }catch(e){ console.error(e); }
  }

  async function signOut(){ await supabase.auth.signOut(); navigate('/'); }

  async function addExpense(e){ e && e.preventDefault(); const amt = parseFloat(form.amount||0); if(!amt) return alert('Enter valid amount'); const item = { id: Date.now().toString(36), amount:amt, mode:form.mode, merchant:form.merchant||'Unknown', category:form.category, note:form.note, timestamp:new Date().toISOString() }; setData(prev=>({expenses:[item,...prev.expenses]})); setForm({amount:'',mode:form.mode,merchant:'',category:form.category,note:''}); if(user) pushLocalToRemote(); }

  async function pushLocalToRemote(){ if(!user) return; const unsynced = data.expenses.filter(x=>!x.synced); for(const it of unsynced){ try{ await supabase.from('expenses').insert([{ owner: user.id, amount: it.amount, mode: it.mode, merchant: it.merchant, category: it.category, note: it.note, timestamp: it.timestamp }]); }catch(e){ console.error(e); } } fetchAndMerge(user.id); }

  async function deleteExpense(id){ if(!confirm('Delete?')) return; setData(prev=>({expenses: prev.expenses.filter(x=> x.id!==id)})); if(user) supabase.from('expenses').delete().eq('id', id).then(()=> fetchAndMerge(user.id)).catch(()=>{}); }

  const daily = data.expenses.filter(e=> new Date(e.timestamp) >= (()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; })());
  const dailyUPI = daily.filter(e=> e.mode==='UPI').reduce((s,x)=> s + x.amount, 0);
  const monthlyTotal = data.expenses.reduce((s,x)=> s + x.amount, 0);

  return (
    <div className="container">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div><div className="h1">Dashboard</div><div className="small">Welcome, {user?.email}</div></div>
        <div className="row"><button className="input" onClick={signOut}>Sign out</button></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>
        <div className="card">
          <div style={{fontWeight:700, marginBottom:8}}>Add expense</div>
          <form onSubmit={addExpense} style={{display:'grid',gap:8}}>
            <div style={{display:'flex',gap:8}}>
              <input className="input" placeholder="Amount (₹)" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} />
              <select className="input" value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})}>
                <option>UPI</option><option>Card</option><option>Cash</option><option>Netbanking</option>
              </select>
            </div>
            <div style={{display:'flex',gap:8}}>
              <input className="input" placeholder="Merchant" value={form.merchant} onChange={e=>setForm({...form,merchant:e.target.value})} />
              <select className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                <option>Groceries</option><option>Canteen</option><option>Travel</option><option>Bill</option><option>Rent</option>
              </select>
            </div>
            <input className="input" placeholder="Note" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} />
            <div style={{display:'flex',gap:8}}><button className="button" type="submit">Add</button></div>
          </form>

          <div style={{marginTop:12}} className="card">
            <div style={{fontWeight:700}}>Expenses ({data.expenses.length})</div>
            <div style={{marginTop:8}}>
              {data.expenses.map(e=> (
                <div key={e.id} className="exp-item" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700}}>{currency.format(e.amount)} <span className="small">· {e.merchant}</span></div>
                    <div className="small">{e.category} · {formatDateTime(e.timestamp)}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <select className="input" value={e.mode} onChange={()=>{}}>
                      <option>UPI</option><option>Card</option><option>Cash</option><option>Netbanking</option>
                    </select>
                    <button className="input" onClick={()=>deleteExpense(e.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{fontWeight:700}}>Summary</div>
          <div style={{marginTop:8}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><div className="small">Today total</div><div>{currency.format(daily.reduce((s,x)=>s+x.amount,0))}</div></div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><div className="small">UPI today</div><div style={{color: dailyUPI>400 ? 'var(--danger)' : 'inherit'}}>{currency.format(dailyUPI)}</div></div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><div className="small">Monthly total</div><div>{currency.format(monthlyTotal)}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  return (
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/dashboard" element={<Dashboard/>} />
    </Routes>
  );
}
