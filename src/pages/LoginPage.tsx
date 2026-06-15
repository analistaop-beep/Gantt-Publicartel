import React, { useState } from 'react';
import { Lock, User, LogIn, Mail, UserPlus } from 'lucide-react';
import { sileo } from 'sileo';
import { supabase } from '../utils/supabaseClient';

export const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        
        sileo.success({ title: '¡Bienvenido de nuevo!' });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name
            }
          }
        });
        if (error) throw error;
        
        sileo.success({ title: '¡Registro exitoso!', description: 'Has sido registrado y logueado.' });
      }
    } catch (err: any) {
      let msg = 'Ocurrió un error. Verifica tus credenciales.';
      if (err.message.includes('Invalid login credentials')) msg = 'Credenciales incorrectas.';
      if (err.message.includes('User already registered')) msg = 'El usuario ya existe.';
      if (err.message.includes('Password should be at least')) msg = 'La contraseña debe tener al menos 6 caracteres.';
      sileo.error({ title: 'Error de acceso', description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      
      <div className="w-full max-w-md p-8 animate-in relative z-10">
        <div className="glass rounded-[1.25rem] p-10 shadow-2xl border-white/5 backdrop-blur-3xl transition-all duration-500">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center shadow-2xl shadow-blue-600/40 mb-6 group transition-transform hover:scale-105 active:scale-95 duration-500">
              <Lock className="text-white group-hover:rotate-12 transition-transform duration-500" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight text-center">
              {isLogin ? 'Acceso al Sistema' : 'Crear una Cuenta'}
            </h1>
            <p className="text-slate-400 text-center font-medium">
              {isLogin ? 'Ingresa tus credenciales para continuar' : 'Completa los datos para registrarte'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* NAME: Only in Register Mode */}
            {!isLogin && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-semibold text-slate-300 ml-2">Nombre Completo</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <User size={20} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input w-full pl-14 h-14"
                    placeholder="Tu nombre"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* EMAIL */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 ml-2">Correo Electrónico</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full pl-14 h-14"
                  placeholder="ejemplo@correo.com"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
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
                {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                {isLogin ? (
                    <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                ) : (
                    <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
                )}
              </span>
              
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-8 text-center">
            <button 
              type="button" 
              onClick={toggleMode}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors underline decoration-white/20 underline-offset-4"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
            </button>
          </div>

          <div className="mt-8 text-center pt-6 border-t border-white/5">
            <p className="text-slate-500 text-sm font-medium">
              &copy; {new Date().getFullYear()} Publicartel • Sistema de Gestión
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
