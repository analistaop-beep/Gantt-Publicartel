import React, { useState } from 'react';
import { Lock, User, LogIn } from 'lucide-react';
import { sileo } from 'sileo';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate a bit of loading for premium feel
    setTimeout(() => {
      if (username === 'Admin' && password === '2218') {
        localStorage.setItem('isAuthenticated', 'true');
        onLogin();
        sileo.success({ title: '¡Bienvenido, Admin!' });
      } else {
        sileo.error({ title: 'Credenciales incorrectas' });
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      
      <div className="w-full max-w-md p-8 animate-in relative z-10">
        <div className="glass rounded-[1.25rem] p-10 shadow-2xl border-white/5 backdrop-blur-3xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center shadow-2xl shadow-blue-600/40 mb-6 group transition-transform hover:scale-105 active:scale-95 duration-500">
              <Lock className="text-white group-hover:rotate-12 transition-transform duration-500" size={32} />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Acceso Admin</h1>
            <p className="text-slate-400 text-center font-medium">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 ml-2">Usuario</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input w-full pl-14 h-14"
                  placeholder="Nombre de usuario"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 ml-2">Contraseña</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input w-full pl-14 h-14"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full h-14 mt-4 text-lg font-bold group relative overflow-hidden"
            >
              <span className={`flex items-center justify-center gap-3 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                Iniciar Sesión
                <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
              
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-10 text-center pt-6 border-t border-white/5">
            <p className="text-slate-500 text-sm font-medium">
              &copy; {new Date().getFullYear()} Publicartel • Sistema de Gestión
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
