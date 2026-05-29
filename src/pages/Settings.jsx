import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, X, Edit2, AlertCircle } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { getRoleLabel } from '../lib/roles.js';

export function Settings({ user }) {
  const alert = useAlert();
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [novoUsuario, setNovoUsuario] = useState({ nome: '', matricula: '', email: '', nivel: 'supervisor', senha: '' });
  const [editarUsuario, setEditarUsuario] = useState({ nome: '', email: '', matricula: '', senha: '', nivel: 'supervisor' });
  const [deletingId, setDeletingId] = useState(null);
  const [usuarioDeletando, setUsuarioDeletando] = useState(null);
  const isAdmin = user?.cargo === 'admin';

  // Carregar usuários quando admin acessa a página
  useEffect(() => {
    if (isAdmin) {
      carregarUsuarios();
    }
  }, [isAdmin]);

  const carregarUsuarios = async () => {
    setLoadingUsuarios(true);
    try {
      const token = localStorage.getItem('agromanager_token');
      const endpoint = `${import.meta.env.VITE_ENDPOINT_USUARIOS}?page=1&page_size=100`;
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsuarios((data.dados || data.results || []).reverse());
      } else {
        throw new Error(`Erro ${response.status} ao carregar usuários`);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      alert.error('Erro ao carregar usuários');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleCriarUsuario = async () => {
    if (!novoUsuario.nome || !novoUsuario.email || !novoUsuario.senha) {
      alert.warning('Preencha todos os campos obrigatórios (nome, email e senha)');
      return;
    }

    if (novoUsuario.senha.length < 6) {
      alert.warning('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      const token = localStorage.getItem('agromanager_token');
      const endpoint = `${import.meta.env.VITE_ENDPOINT_USUARIOS}criar/`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(novoUsuario)
      });

      if (response.ok) {
        alert.success('Usuário criado com sucesso!');
        setShowNewUserModal(false);
        setNovoUsuario({ nome: '', matricula: '', email: '', nivel: 'supervisor', senha: '' });
        carregarUsuarios();
      } else {
        try {
          const errorData = await response.json();
          alert.error(errorData.mensagem || 'Erro ao criar usuário');
        } catch {
          alert.error(`Erro ao criar usuário (${response.status})`);
        }
      }
    } catch (error) {
      console.error('Erro:', error);
      alert.error('Erro ao criar usuário');
    }
  };

  const handleAtualizarUsuario = async () => {
    if (!editarUsuario.nome || !editarUsuario.email) {
      alert.warning('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const token = localStorage.getItem('agromanager_token');
      const endpoint = `${import.meta.env.VITE_ENDPOINT_USUARIOS}${editingUserId}/`;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: editarUsuario.nome,
          email: editarUsuario.email,
          matricula: editarUsuario.matricula,
          senha: editarUsuario.senha,
          nivel: editarUsuario.nivel
        })
      });

      if (response.ok) {
        alert.success('Usuário atualizado com sucesso!');
        setShowEditUserModal(false);
        setEditingUserId(null);
        setEditarUsuario({ nome: '', email: '', matricula: '', senha: '', nivel: 'supervisor' });
        carregarUsuarios();
      } else {
        try {
          const errorData = await response.json();
          alert.error(errorData.mensagem || 'Erro ao atualizar usuário');
        } catch {
          alert.error(`Erro ao atualizar usuário (${response.status})`);
        }
      }
    } catch (error) {
      console.error('Erro:', error);
      alert.error('Erro ao atualizar usuário');
    }
  };

  const handleDeletarUsuario = async () => {
    if (!usuarioDeletando) return;

    try {
      const token = localStorage.getItem('agromanager_token');
      const endpoint = `${import.meta.env.VITE_ENDPOINT_USUARIOS}deletar/`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          id: usuarioDeletando.ID
        })
      });

      if (response.ok) {
        alert.success('Usuário deletado com sucesso!');
        setDeletingId(null);
        setUsuarioDeletando(null);
        carregarUsuarios();
      } else {
        try {
          const errorData = await response.json();
          alert.error(errorData.mensagem || 'Erro ao deletar usuário');
        } catch {
          alert.error(`Erro ao deletar usuário (${response.status})`);
        }
      }
    } catch (error) {
      console.error('Erro:', error);
      alert.error('Erro ao deletar usuário');
    }
  };

  const abrirEditModal = (usuario) => {
    setEditingUserId(usuario.ID);
    setEditarUsuario({
      nome: usuario.NOME || '',
      email: usuario.EMAIL || '',
      matricula: usuario.MATRICULA || '',
      senha: '',
      nivel: usuario.NIVEL || 'supervisor'
    });
    setShowEditUserModal(true);
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-6 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#004927] text-white">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Gerenciar Usuários</h2>
                <p className="text-xs text-slate-500 mt-0.5">Criar, editar e deletar usuários do sistema</p>
              </div>
            </div>
            <button
              onClick={() => setShowNewUserModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#004927] text-white hover:bg-[#003220] font-bold text-sm transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={18} /> Novo Usuário
            </button>
          </div>

          {loadingUsuarios ? (
            <div className="bg-white border border-slate-200 py-12 text-center">
              <p className="text-slate-600 font-medium">Carregando usuários...</p>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="bg-white border border-slate-200 py-12 text-center">
              <p className="text-slate-600 font-medium">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Nome</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Email</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Matrícula</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">Nível</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-700 w-20">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usr, idx) => (
                    <tr key={usr.ID} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{usr.NOME}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{usr.EMAIL}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{usr.MATRICULA || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 text-xs font-bold ${
                          usr.NIVEL === 'admin' ? 'bg-red-100 text-red-700' :
                          usr.NIVEL === 'gerente' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {usr.NIVEL.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex items-center justify-center gap-2">
                        <button
                          onClick={() => abrirEditModal(usr)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar usuário"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingId(usr.ID);
                            setUsuarioDeletando(usr);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                          title="Deletar usuário"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: NOVO USUÁRIO */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full space-y-0 border border-slate-200 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-50 to-slate-100">
              <h3 className="text-base font-bold text-slate-800">Novo Usuário</h3>
              <button 
                onClick={() => setShowNewUserModal(false)} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nome *</label>
                <input
                  type="text"
                  value={novoUsuario.nome}
                  onChange={(e) => setNovoUsuario({...novoUsuario, nome: e.target.value})}
                  className="settings-input w-full px-3.5 py-2.5 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#004927] focus:ring-2 focus:ring-[#004927]/10 transition-all rounded-sm"
                  placeholder="Nome completo"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email *</label>
                <input
                  type="email"
                  value={novoUsuario.email}
                  onChange={(e) => setNovoUsuario({...novoUsuario, email: e.target.value})}
                  className="settings-input w-full px-3.5 py-2.5 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#004927] focus:ring-2 focus:ring-[#004927]/10 transition-all rounded-sm"
                  placeholder="usuario@empresa.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Matrícula</label>
                <input
                  type="text"
                  value={novoUsuario.matricula}
                  onChange={(e) => setNovoUsuario({...novoUsuario, matricula: e.target.value})}
                  className="settings-input w-full px-3.5 py-2.5 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#004927] focus:ring-2 focus:ring-[#004927]/10 transition-all rounded-sm"
                  placeholder="Número da matrícula"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Senha *</label>
                <input
                  type="password"
                  value={novoUsuario.senha}
                  onChange={(e) => setNovoUsuario({...novoUsuario, senha: e.target.value})}
                  className="settings-input w-full px-3.5 py-2.5 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#004927] focus:ring-2 focus:ring-[#004927]/10 transition-all rounded-sm"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nível *</label>
                <select
                  value={novoUsuario.nivel}
                  onChange={(e) => setNovoUsuario({...novoUsuario, nivel: e.target.value})}
                  className="settings-input w-full px-3.5 py-2.5 border border-slate-300 text-sm text-slate-900 outline-none focus:border-[#004927] focus:ring-2 focus:ring-[#004927]/10 transition-all rounded-sm"
                >
                  <option value="supervisor">Supervisor</option>
                  <option value="gerente">Gerente</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 px-6 py-3.5 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowNewUserModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarUsuario}
                className="flex-1 px-4 py-2 bg-[#004927] text-white hover:bg-[#003220] font-medium text-sm transition-all shadow-sm hover:shadow-md"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR USUÁRIO */}
      {showEditUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full space-y-0 border border-slate-200 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-50 to-slate-100">
              <h3 className="text-base font-bold text-slate-800">Editar Usuário</h3>
              <button 
                onClick={() => setShowEditUserModal(false)} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nome *</label>
                <input
                  type="text"
                  value={editarUsuario.nome}
                  onChange={(e) => setEditarUsuario({...editarUsuario, nome: e.target.value})}
                  className="settings-input w-full px-3.5 py-2.5 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#004927] focus:ring-2 focus:ring-[#004927]/10 transition-all rounded-sm"
                  placeholder="Nome completo"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email *</label>
                <input
                  type="email"
                  value={editarUsuario.email}
                  onChange={(e) => setEditarUsuario({...editarUsuario, email: e.target.value})}
                  className="settings-input w-full px-3.5 py-2.5 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#004927] focus:ring-2 focus:ring-[#004927]/10 transition-all rounded-sm"
                  placeholder="usuario@empresa.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Matrícula</label>
                <input
                  type="text"
                  value={editarUsuario.matricula}
                  onChange={(e) => setEditarUsuario({...editarUsuario, matricula: e.target.value})}
                  className="settings-input w-full px-3.5 py-2.5 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#004927] focus:ring-2 focus:ring-[#004927]/10 transition-all rounded-sm"
                  placeholder="Número da matrícula"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Senha (deixe em branco para manter)</label>
                <input
                  type="password"
                  value={editarUsuario.senha}
                  onChange={(e) => setEditarUsuario({...editarUsuario, senha: e.target.value})}
                  className="settings-input w-full px-3.5 py-2.5 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#004927] focus:ring-2 focus:ring-[#004927]/10 transition-all rounded-sm"
                  placeholder="Nova senha (opcional)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nível</label>
                <select
                  value={editarUsuario.nivel}
                  onChange={(e) => setEditarUsuario({...editarUsuario, nivel: e.target.value})}
                  className="settings-input w-full px-3.5 py-2.5 border border-slate-300 text-sm text-slate-900 outline-none focus:border-[#004927] focus:ring-2 focus:ring-[#004927]/10 transition-all rounded-sm"
                >
                  <option value="supervisor">Supervisor</option>
                  <option value="gerente">Gerente</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 px-6 py-3.5 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowEditUserModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleAtualizarUsuario}
                className="flex-1 px-4 py-2 bg-[#004927] text-white hover:bg-[#003220] font-medium text-sm transition-all shadow-sm hover:shadow-md"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {deletingId && usuarioDeletando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full space-y-0 border border-slate-200 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-linear-to-r from-red-50 to-orange-50">
              <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-600">
                <AlertCircle size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Deletar Usuário?</h3>
            </div>
            
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 leading-relaxed">Tem certeza que deseja deletar este usuário? Esta ação <span className="font-bold text-red-600">não pode ser desfeita.</span></p>
            </div>

            <div className="flex gap-2 px-6 py-3.5 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setDeletingId(null);
                  setUsuarioDeletando(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletarUsuario}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 font-medium text-sm transition-all shadow-sm hover:shadow-md"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-white p-6 border border-slate-200">
            <div className="p-2.5 bg-blue-100 text-blue-600">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Meu Perfil</h2>
              <p className="text-xs text-slate-500 mt-0.5">Informações da sua conta</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-2 gap-0">
              <div className="px-6 py-4 border-r border-b border-slate-200 bg-slate-50">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nome</p>
                <p className="text-slate-800 font-medium">{user?.nome || '-'}</p>
              </div>
              <div className="px-6 py-4 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Email</p>
                <p className="text-slate-800 font-medium">{user?.email || '-'}</p>
              </div>
              <div className="px-6 py-4 border-r border-slate-200 bg-slate-50">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Matrícula</p>
                <p className="text-slate-800 font-medium">{user?.matricula || '-'}</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Cargo</p>
                <span className="inline-block px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-700">
                  {getRoleLabel(user?.cargo)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
