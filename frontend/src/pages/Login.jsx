import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Zap, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';

export default function Login() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const formatAuthError = (err, fallback) => {
    if (!err?.response) {
      return 'Serveur indisponible. Veuillez réessayer plus tard.';
    }

    const status = err.response.status;
    const serverMessage = err.response.data?.message;
    const validationErrors = err.response.data?.errors;
    const details = Array.isArray(validationErrors) ? validationErrors.join(' ') : null;

    if (status === 401) {
      return serverMessage || 'Adresse e-mail ou mot de passe incorrect.';
    }
    if (status === 422) {
      return details || serverMessage || 'Données invalides. Vérifiez le formulaire.';
    }
    if (status === 500) {
      return 'Erreur serveur. Réessayez plus tard.';
    }
    return serverMessage || details || fallback;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/users/login', { email, password });
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(formatAuthError(err, 'Identifiants incorrects.'));
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

        <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:'-.5px', marginBottom:6 }}>Bienvenue</h1>
        <p style={{ fontSize:12, color:'var(--text3)', marginBottom:28 }}>Connectez-vous à votre espace tendances</p>

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
          <Input
            id="login-email"
            type="email"
            placeholder="Email"
            aria-label="Adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={15} />}
            helper="Utilisez l’adresse e-mail de votre compte."
            required
          />

          <Input
            id="login-password"
            type="password"
            placeholder="Mot de passe"
            aria-label="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={15} />}
            helper="Votre mot de passe reste confidentiel."
            required
          />

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 6, padding: 13, fontSize: 14, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Connexion...' : <><span>Se connecter</span><ArrowRight size={15} /></>}
          </Button>
        </form>

        <div style={{
          marginTop:24, paddingTop:20,
          borderTop:'1px solid var(--divider)',
          textAlign:'center', fontSize:12, color:'var(--text3)',
        }}>
          Pas encore de compte ?{' '}
          <Link to="/signup" style={{ color:'var(--y)', fontWeight:700 }}>Créer un compte</Link>
        </div>
      </div>
    </div>
  );
}