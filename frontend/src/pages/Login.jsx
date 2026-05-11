import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Zap, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/users/login', { email, password });
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)', padding:'24px', position:'relative', overflow:'hidden',
    }}>
      <div className="bg-grid"/>
      <div style={{
        position:'absolute', top:'-80px', right:'-80px',
        width:320, height:320, borderRadius:'50%',
        background:'radial-gradient(circle,rgba(255,220,80,0.07) 0%,transparent 65%)',
        pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute', bottom:'-60px', left:'-60px',
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
        <div style={{ display:'flex', alignItems:'center', gap:9, fontWeight:800, fontSize:15, marginBottom:28 }}>
          <div style={{
            width:28, height:28, borderRadius:8,
            background:'var(--y)', display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Zap size={14} color="#06070D" fill="#06070D"/>
          </div>
          TrendAI
        </div>

        <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:'-.5px', marginBottom:6 }}>Welcome back</h1>
        <p style={{ fontSize:12, color:'var(--text3)', marginBottom:28 }}>Sign in to your intelligence hub</p>

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
            <Mail size={15} style={{
              position:'absolute', left:13, top:'50%', transform:'translateY(-50%)',
              color:'var(--text3)', pointerEvents:'none',
            }}/>
            <input
              className="input-field"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ paddingLeft:38 }}
            />
          </div>

          <div style={{ position:'relative' }}>
            <Lock size={15} style={{
              position:'absolute', left:13, top:'50%', transform:'translateY(-50%)',
              color:'var(--text3)', pointerEvents:'none',
            }}/>
            <input
              className="input-field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ paddingLeft:38 }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width:'100%', justifyContent:'center', marginTop:6, padding:'13px', fontSize:14, opacity: loading ? .7 : 1 }}
          >
            {loading ? 'Signing in...' : <><span>Sign in</span><ArrowRight size={15}/></>}
          </button>
        </form>

        <div style={{
          marginTop:24, paddingTop:20,
          borderTop:'1px solid var(--divider)',
          textAlign:'center', fontSize:12, color:'var(--text3)',
        }}>
          No account?{' '}
          <Link to="/signup" style={{ color:'var(--y)', fontWeight:700 }}>Create one</Link>
        </div>
      </div>
    </div>
  );
}