import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Zap, User, Mail, Lock, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';

export default function Signup() {
  const [form, setForm]   = useState({ name:'', email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const formatAuthError = (err, fallback) => {
    if (!err?.response) {
      return 'Serveur indisponible. Veuillez réessayer plus tard.';
    }

    const status = err.response.status;
    const serverMessage = err.response.data?.message;
    const validationErrors = err.response.data?.errors;
    const details = Array.isArray(validationErrors) ? validationErrors.join(' ') : null;

    if (status === 409) {
      return serverMessage || 'Un compte avec cet e-mail existe déjà.';
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
      await api.post('/users/signup', form);
      navigate('/login');
    } catch (err) {
      setError(formatAuthError(err, 'Erreur lors de l\'inscription.'));
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
          Rejoindre TrendAI
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
          <Input
            id="signup-name"
            placeholder="Nom complet"
            aria-label="Nom complet"
            onChange={set('name')}
            icon={<User size={15} />}
            helper="Le nom utilisé pour votre compte TrendAI."
            required
          />
          <Input
            id="signup-email"
            type="email"
            placeholder="Email"
            aria-label="Adresse e-mail"
            onChange={set('email')}
            icon={<Mail size={15} />}
            helper="Nous vous enverrons des notifications sur cette adresse."
            required
          />
          <Input
            id="signup-password"
            type="password"
            placeholder="Créer un mot de passe"
            aria-label="Mot de passe"
            onChange={set('password')}
            icon={<Lock size={15} />}
            helper="Minimum 8 caractères recommandés."
            required
          />

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 6, padding: 13, fontSize: 14, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Création du compte...' : <><span>Créer un compte</span><ArrowRight size={15} /></>}
          </Button>
        </form>

        <div style={{
          marginTop:24, paddingTop:20,
          borderTop:'1px solid var(--divider)',
          textAlign:'center', fontSize:12, color:'var(--text3)',
        }}>
          Déjà membre ?{' '}
          <Link to="/login" style={{ color:'var(--y)', fontWeight:700 }}>Se connecter</Link>
        </div>
      </div>
    </div>
  );
}