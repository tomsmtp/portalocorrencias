import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './pages/dashboards';
import { Apontamentos } from './pages/Apontamentos';
// import { Relatorios } from './pages/Reports';
import { Login } from './pages/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AlertProvider, useAlert } from './context/AlertContext';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const alert = useAlert();

  // Recupera usuário do localStorage ao iniciar
  useEffect(() => {
    const savedUser = localStorage.getItem('agromanager_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Erro ao recuperar usuário salvo:', error);
        localStorage.removeItem('agromanager_user');
      }
    }
    setLoading(false);
  }, []);

  // Session timeout - logout automático após inatividade
  useEffect(() => {
    if (!user) return;

    const resetTimeout = () => {
      lastActivityRef.current = Date.now();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        console.warn('Sessão expirada por inatividade');
        handleLogout();
        alert.warning('Sua sessão expirou por inatividade. Faça login novamente.', 0);
      }, SESSION_TIMEOUT);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimeout);
    });

    resetTimeout(); // Inicia o timeout

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    lastActivityRef.current = Date.now();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('agromanager_user');
    localStorage.removeItem('agromanager_remember_email');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <Login onLoginSuccess={handleLoginSuccess} />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AlertProvider>
        <AppContent />
      </AlertProvider>
    </ErrorBoundary>
  );
}