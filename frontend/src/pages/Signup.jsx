import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Zap, User, Mail, Lock, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export default function Signup() {
  const [form, setForm]   = useState({ name:'', email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/users/signup', form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)', padding:'24px', position:'relative', overflow:'hidden',
    }}>
      <div className="bg-grid"/>
      <div style={{
        position:'absolute', top:'-80px', left:'-80px',
        width:320, height:320, borderRadius:'50%',
        background:'radial-gradient(circle,rgba(255,220,80,0.06) 0%,transparent 65%)',
        pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute', bottom:'-60px', right:'-60px',
        width:260, height:260, borderRadius:'50%',
        background:'radial-gradient(circle,rgba(96,165,250,0.07) 0%,transparent 65%)',
        pointerEvents:'none',
      }}/>

      <div className="glass-card fade-up" style={{
        width:'100%', maxWidth:400, padding:36,
        position:'relative', zIndex:1,
        border:'1px solid var(--y-border)',
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:9, fontWeight:800, fontSize:15, marginBottom:8 }}>
          <div style={{
            width:28, height:28, borderRadius:8,
            background:'var(--y)', display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Zap size={14} color="#06070D" fill="#06070D"/>
          </div>
          TrendAI
        </div>

        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'4px 12px', borderRadius:20,
          background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.2)',
          fontSize:10, fontWeight:700, color:'var(--b)',
          letterSpacing:'.5px', textTransform:'uppercase',
          marginBottom:20,
        }}>
          <ShieldCheck size={12}/> Accès sécurisé
        </div>

        <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:'-.5px', marginBottom:6 }}>
          Join TrendAI
        </h1>
        <p style={{ fontSize:12, color:'var(--text3)', marginBottom:28 }}>
          L'algorithme qui devance demain.
        </p>

        {error && (
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'10px 14px', borderRadius:9,
            background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)',
            color:'var(--r)', fontSize:12, marginBottom:18,
          }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ position:'relative' }}>
            <User size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }}/>
            <input className="input-field" type="text" placeholder="Full name" onChange={set('name')} required style={{ paddingLeft:38 }}/>
          </div>
          <div style={{ position:'relative' }}>
            <Mail size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }}/>
            <input className="input-field" type="email" placeholder="Email address" onChange={set('email')} required style={{ paddingLeft:38 }}/>
          </div>
          <div style={{ position:'relative' }}>
            <Lock size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }}/>
            <input className="input-field" type="password" placeholder="Create a password" onChange={set('password')} required style={{ paddingLeft:38 }}/>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width:'100%', justifyContent:'center', marginTop:6, padding:'13px', fontSize:14, opacity: loading ? .7 : 1 }}
          >
            {loading ? 'Creating account...' : <><span>Launch the experience</span><ArrowRight size={15}/></>}
          </button>
        </form>

        <div style={{
          marginTop:24, paddingTop:20,
          borderTop:'1px solid var(--divider)',
          textAlign:'center', fontSize:12, color:'var(--text3)',
        }}>
          Already a member?{' '}
          <Link to="/login" style={{ color:'var(--y)', fontWeight:700 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}