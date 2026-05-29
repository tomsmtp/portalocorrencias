import React from 'react';
import { BarChart3, Settings as SettingsIcon, LogOut, UserCircle, ClipboardList, LayoutDashboard } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import logo from '../assets/logo_login_form.png';
import { getRoleLabel } from '../lib/roles.js';

export function Sidebar({ activeTab, onTabChange, user, onLogout, apontamentos = [] }) {
  const alert = useAlert();

  const handleLogoutClick = async () => {
    const confirmed = await alert.confirm('Confirmar saída?', 'Você será desconectado do sistema');
    if (confirmed) {
      alert.success('Você foi desconectado com sucesso', 1500);
      setTimeout(() => {
        onLogout();
      }, 1500);
    }
  };

  // Contar apontamentos pendentes (pendente_supervisor ou revisao)
  const apontamentosPendentes = apontamentos.filter(apt => 
    apt.status === 'pendente_supervisor' || apt.status === 'revisao'
  ).length;
  const menuItems = [
    { id: 'apontamentos', label: 'Apontamentos', icon: ClipboardList },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon },
  ];

  // --- PERMISSÕES POR ROLE ---
  const isComum = user?.cargo === 'colaborador';
  const isSupervisor = user?.cargo === 'supervisor';
  const isGerente = user?.cargo === 'gerente';
  const isAdmin = user?.cargo === 'admin';

  // Se é admin, mostra APENAS configurações
  if (isAdmin) {
    const adminMenuItems = [
      { id: 'settings', label: 'Configurações', icon: SettingsIcon },
    ];

    return (
      <div className="fixed left-0 top-0 h-screen w-56 bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800">
        <div className="p-4 flex items-center gap-2 border-b border-slate-800">
          <button onClick={() => onTabChange('settings')} className="bg-[#004927] p-1.5 text-white hover:bg-[#003220] transition-all cursor-pointer">
            <img src={logo} alt="BOLETIM OC" className="w-5 h-5 object-contain" />
          </button>
          <div>
            <h1 className="text-white font-bold tracking-tight text-sm">BOLETIM OC</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 mt-2">
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 transition-all font-medium text-sm relative ${
                  activeTab === item.id ? 'bg-[#004927] text-white' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* SEÇÃO DO USUÁRIO */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="bg-slate-700 p-2 text-slate-400">
              <UserCircle size={24} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user?.nome || 'Usuário'}</p>
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 border text-red-400 border-red-900 bg-red-900/20">
                {getRoleLabel(user?.cargo)}
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 font-medium transition-all border border-red-900 mt-4"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>

        {/* ALERTA DE SAÍDA PADRONIZADO */}

      </div>
    );
  }

  // Para usuários não-admin, mostra menu normal
  const filteredMenuItems = menuItems.filter(item => {
    if (item.id === 'settings') return !user?.isVisitor; // Configurações bloqueada para visitantes
    if (item.id === 'dashboard') return isGerente; // Dashboard apenas para gerente
    if (item.id === 'relatorios') return isGerente; // Relatórios apenas para gerente
    return true; // Apontamentos disponível para todos
  });

  return (
    <div className="fixed left-0 top-0 h-screen w-56 bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800">
      <div className="p-4 flex items-center gap-2 border-b border-slate-800">
        <button onClick={() => onTabChange('apontamentos')} className="bg-[#004927] p-1.5 text-white hover:bg-[#003220] transition-all cursor-pointer">
          <img src={logo} alt="BOLETIM OC" className="w-5 h-5 object-contain" />
        </button>
        <div>
          <h1 className="text-white font-bold tracking-tight text-sm">BOLETIM OC</h1>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Ocorrências</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 mt-2">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          // Mostrar badge apenas no item de apontamentos se houver pendentes
          const showBadge = item.id === 'apontamentos' && apontamentosPendentes > 0;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 transition-all font-medium text-sm relative ${
                activeTab === item.id ? 'bg-[#004927] text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="truncate">{item.label}</span>
              {showBadge && (
                <span className="absolute right-3 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center ml-auto">
                  {apontamentosPendentes > 99 ? '99+' : apontamentosPendentes}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* SEÇÃO DO USUÁRIO IDENTICA À IMAGEM */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="bg-slate-700 p-2 text-slate-400">
            <UserCircle size={24} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{user?.nome || 'Usuário'}</p>
            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 border text-red-400 border-red-900 bg-red-900/20">
              {getRoleLabel(user?.cargo)}
            </span>
          </div>
        </div>
        <button 
          onClick={handleLogoutClick}
          className="w-full flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 font-medium transition-all border border-red-900 mt-4"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>

      {/* ALERTA DE SAÍDA PADRONIZADO */}

    </div>
  );
}