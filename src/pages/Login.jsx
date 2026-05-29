import React, { useState, useEffect } from 'react';
import { Lock, Mail, Loader2, FileText, Download } from 'lucide-react';
import { apiLogin, handleApiError } from '../lib/apiService';
import { isValidEmail } from '../lib/validators';
import { useAlert } from '../context/AlertContext';
import logo from '../assets/logo_login_form.png';

export function Login({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const alert = useAlert();

  // Carrega email salvo se o "Lembrar" estiver ativo
  useEffect(() => {
    const savedEmail = localStorage.getItem('agromanager_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Login com validação do endpoint
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validação básica
    if (!isValidEmail(email)) {
      alert.error('Email inválido. Verifique o formato.');
      return;
    }

    if (!password || password.trim().length === 0) {
      alert.error('Senha é obrigatória.');
      return;
    }

    setLoading(true);

    try {
      const userData = await apiLogin(email, password);

      // Validação de role
      const validRoles = ['comum', 'supervisor', 'gerente', 'admin'];
      const userRole = (userData.cargo || userData.nivel || '').toLowerCase().trim();
      
      if (!userRole || !validRoles.includes(userRole)) {
        throw new Error('Sua conta não possui acesso ao sistema.');
      }

      // Prepara dados da sessão
      const sessionData = {
        id: userData.id,
        nome: userData.nome,
        cargo: userRole,
        email: userData.email,
        matricula: userData.matricula
      };

      if (rememberMe) {
        localStorage.setItem('agromanager_remember_email', email);
      } else {
        localStorage.removeItem('agromanager_remember_email');
      }

      localStorage.setItem('agromanager_user', JSON.stringify(sessionData));
      alert.success('Login realizado com sucesso!');
      setLoading(false);
      onLoginSuccess(sessionData);
    } catch (error) {
      console.error('[LOGIN] Erro:', error);
      const errorMsg = handleApiError(error);
      alert.error(errorMsg);
      setLoading(false);
    }
  };

  const handleQuickAccessApontamentos = () => {
    // Cria um usuário visitante/sem credenciais para acesso rápido a apontamentos
    const visitorUser = {
      id: 'visitor',
      nome: 'Visitante',
      email: 'visitante@apontamentos.com',
      cargo: 'visitante',
      nivel: 'visitante',
      matricula: '',
      isVisitor: true // Flag para identificar que é acesso sem autenticação
    };
    
    localStorage.setItem('agromanager_user', JSON.stringify(visitorUser));
    onLoginSuccess(visitorUser);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white overflow-hidden border border-slate-700">
        
        <div className="bg-[#004927] p-8 text-center text-white">
          <div className="inline-flex p-3 bg-[#006838] mb-4">
            <img src={logo} alt="BOLETIM OC" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-2xl font-bold italic tracking-tighter uppercase">BOLETIM OC</h1>
          <p className="text-[#c8e6c9] text-xs mt-1 font-medium">SISTEMA DE GESTÃO DE OCORRÊNCIAS v1.0</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input 
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="login-input w-full pl-10 pr-4 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-green-500 bg-slate-50 text-slate-900 placeholder-slate-600"
                placeholder="exemplo.exemplo@agt.com.br"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input 
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="login-input w-full pl-10 pr-4 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-green-500 bg-slate-50 text-slate-900 placeholder-slate-600"
                placeholder="Digite sua senha"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 border-slate-300 text-[#004927] focus:ring-[#004927]"
              />
              <span className="text-sm text-slate-600 group-hover:text-[#004927] transition-colors">Lembrar meu usuário</span>
            </label>

            <div className="flex gap-2">
              <a 
                href="https://github.com/tomsmtp/portalocorrencias/releases/download/v1.0.0/apontamentos-app.apk" 
                download="apontamentos-app.apk"
                className="text-sm text-green-600 font-medium hover:text-green-700 hover:underline flex items-center gap-1"
                title="Baixar o aplicativo móvel para Android"
              >
                <Download size={14} /> APK
              </a>

              <button 
                type="button"
                onClick={handleQuickAccessApontamentos}
                className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                <FileText size={14} /> Apontamento
              </button>
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-[#004927] hover:bg-[#003220] text-white font-bold py-3 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : "ACESSAR DASHBOARD"}
          </button>
        </form>

        <div className="p-4 bg-slate-50 border-t text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Uso restrito a colaboradores AGT</p>
        </div>
      </div>
    </div>
  );
}