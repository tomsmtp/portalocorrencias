import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Apontamentos } from './Apontamentos';
import { Dashboard as DashboardPage } from './Dashboard';
import { Reports } from './Reports';
import { Settings } from './Settings';

export function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('apontamentos');
  const [apontamentos, setApontamentos] = useState([]);

  // Carregar apontamentos para exibir badge
  useEffect(() => {
    const carregarApontamentos = async () => {
      try {
        const endpoint_get = import.meta.env.VITE_CRIAR_APONTAMENTO_GET;
        const response = await fetch(endpoint_get);
        const result = await response.json();
        if (result.status === 'sucesso' && Array.isArray(result.dados_apontamentos)) {
          setApontamentos(result.dados_apontamentos);
        }
      } catch (error) {
        console.error('Erro ao carregar apontamentos:', error);
      }
    };

    carregarApontamentos();
    // Recarregar a cada 30 segundos
    const interval = setInterval(carregarApontamentos, 30000);
    return () => clearInterval(interval);
  }, []);

  // Proteção: bloquear acesso a dashboard e relatórios para supervisor
  useEffect(() => {
    const isSupervisor = user?.cargo === 'supervisor';
    if (isSupervisor && (activeTab === 'dashboard' || activeTab === 'relatorios')) {
      setActiveTab('apontamentos');
    }
  }, [activeTab, user]);

  // Proteção: bloquear acesso a tudo exceto settings para admin
  useEffect(() => {
    const isAdmin = user?.cargo === 'admin';
    if (isAdmin && activeTab !== 'settings') {
      setActiveTab('settings');
    }
  }, [activeTab, user]);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} user={user} onLogout={onLogout} apontamentos={apontamentos} />
      <div className="ml-64 flex-1 p-8 overflow-y-auto h-screen">
        {activeTab === 'apontamentos' && <Apontamentos user={user} />}
        {activeTab === 'dashboard' && <DashboardPage user={user} />}
        {activeTab === 'relatorios' && <Reports user={user} />}
        {activeTab === 'settings' && <Settings user={user} />}
      </div>
    </div>
  );
}
