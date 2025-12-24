
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white justify-center items-center px-8 relative overflow-hidden">
      {/* Aesthetic Background */}
      <div className="absolute top-[-10%] right-[-20%] w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] left-[-20%] w-80 h-80 bg-fuchsia-100 rounded-full blur-3xl opacity-50"></div>

      <div className="w-full relative z-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white font-bold italic text-3xl shadow-xl shadow-purple-200 mx-auto mb-6">
            B
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Ba Bake</h1>
          <p className="text-slate-400 font-medium text-sm">Professional Fashion Designer Suite</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold border border-rose-100 animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl py-4 pl-12 pr-4 outline-none font-medium text-slate-700 transition-all"
                placeholder="designer@babake.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-2xl py-4 pl-12 pr-4 outline-none font-medium text-slate-700 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4.5 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-100 hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'Create Account' : 'Sign In')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">Or continue with</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'auth0',
                options: {
                  redirectTo: window.location.origin
                }
              });
              if (error) throw error;
            } catch (err: any) {
              setError(err.message || 'Auth0 login failed');
              setLoading(false);
            }
          }}
          className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="#EB5424" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.98 12C21.98 17.513 17.513 21.98 12 21.98C6.486 21.98 2.02 17.513 2.02 12C2.02 6.486 6.486 2.02 12 2.02C17.513 2.02 21.98 6.486 21.98 12Z" fill="#EB5424" />
              <path d="M19.98 12C19.98 16.409 16.409 19.98 12 19.98C7.59 19.98 4.02 16.409 4.02 12C4.02 7.59 7.59 4.02 12 4.02C16.409 4.02 19.98 7.59 19.98 12Z" fill="white" />
              <path d="M16.8 12L15.4 10.6L14 12L15.4 13.4L16.8 12ZM12 7.2L10.6 8.6L12 10L13.4 8.6L12 7.2ZM7.2 12L8.6 13.4L10 12L8.6 10.6L7.2 12ZM12 16.8L13.4 15.4L12 14L10.6 15.4L12 16.8Z" fill="#EB5424" />
            </svg>
          </div>
          Auth0
        </button>

        <div className="text-center pt-4">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-bold text-slate-400 hover:text-purple-600 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>

      <div className="absolute bottom-10 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
        Secured by Supabase & Auth0
      </div>
    </div>
  );
};

export default Login;
