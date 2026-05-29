import React, { useEffect, useState } from 'react';

import { 
  Search, Download, Loader2, Calendar, Plus, Edit, Eye, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Check, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { useAlert } from '../context/AlertContext';
import { ApontamentosModalCriar } from '../components/ApontamentosModalCriar';
import { ApontamentosModalAssinar } from '../components/ApontamentosModalAssinar';
import { ApontamentosModalGerente } from '../components/ApontamentosModalGerente';
import { BoletimVisualizacao } from '../components/BoletimVisualizacao';
import { isVisitor, isSupervisor, isGerente, isAdmin, canCreateApontamentos } from '../lib/roles';

export function Apontamentos({ user }) {
  const [apontamentos, setApontamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- PERMISSÕES POR ROLE ---
  const userVisitor = isVisitor(user?.cargo);
  const userSupervisor = isSupervisor(user?.cargo);
  const userGerente = isGerente(user?.cargo);
  const userAdmin = isAdmin(user?.cargo);
  
  // Proteção: Admin não tem acesso a apontamentos
  if (userAdmin) {
    return (
      <div className="bg-white p-8 border border-slate-200 text-center">
        <p className="text-slate-600 font-medium">Acesso negado. Administradores acessam apenas as configurações de usuários.</p>
      </div>
    );
  }
  
  // Visitante e supervisor podem criar
  const canCreate = canCreateApontamentos(user?.cargo);

  // --- PAGINAÇÃO ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados dos Modais
  const [showModalCriar, setShowModalCriar] = useState(false); // Modal para Colaborador CRIAR
  const [showModalAssinar, setShowModalAssinar] = useState(false); // Modal para Supervisor ASSINAR
  const [showModalGerente, setShowModalGerente] = useState(false); // Modal para Gerente ASSINAR
  const [apontamentoEmAnalise, setApontamentoEmAnalise] = useState(null); // Apontamento selecionado para assinar

  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Estados de Seleção Múltipla
  const [selectedItems, setSelectedItems] = useState([]);

  // Estado para visualização do Boletim
  const [showBoletimVisualizacao, setShowBoletimVisualizacao] = useState(false);
  const [apontamentoParaVisualizar, setApontamentoParaVisualizar] = useState(null);

  // Estado para modal de exportação
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');

  const alert = useAlert();

  useEffect(() => {
    // Carregar apontamentos do backend
    const carregarApontamentos = async () => {
      setLoading(true);
      try {
        const endpoint = import.meta.env.VITE_CRIAR_APONTAMENTO_GET;
        
        const response = await fetch(endpoint);
        const result = await response.json();

        if (result.status === 'sucesso' && Array.isArray(result.dados_apontamentos)) {
          
          // Mapear campos do backend para o componente
          let apontamentosFormatados = result.dados_apontamentos.map(item => {
            // Converter booleanos do Oracle (que vêm como '0' ou '1')
            const assinadoSupervisor = toBoolean(item.ASSINADO_SUPERVISOR);
            const assinadoGerente = toBoolean(item.ASSINADO_GERENTE);
            
            // Usar STATUS do banco diretamente (já foi salvo corretamente durante aprovação)
            let statusFinal = item.STATUS || 'pendente_supervisor';

            return {
              id: item.ID,
              nboletim: item.NBOLETIM,
              colaborador: item.COLABORADOR,
              area: item.AREA,
              local: item.LOCAL,
              municipio: item.MUNICIPIO,
              supervisor: item.SUPERVISOR,
              email_supervisor: item.EMAIL_SUPERVISOR,
              data_portaria: item.DATA_PORTARIA,
              data_ocorrido: item.DATA_OCORRIDO,
              ocorrencia: item.OCORRENCIA,
              equipamento: item.EQUIPAMENTO,
              frota: item.FROTA,
              safra: item.SAFRA,
              elaborado_por: item.ELABORADO_POR,
              unidade: item.UNIDADE,
              status: statusFinal,
              cancelado: toBoolean(item.CANCELADO) || statusFinal === 'cancelado',
              assinado_supervisor: assinadoSupervisor,
              assinado_gerente: assinadoGerente,
              status_supervisor: item.STATUS_SUPERVISOR,
              status_gerente: item.STATUS_GERENTE,
              observacoes_supervisor: item.OBSERVACOES_SUPERVISOR,
              relato_colaborador: item.RELATO_COLABORADOR,
              relato_superior: item.RELATO_SUPERIOR,
              assinatura_supervisor: item.ASSINATURA_SUPERVISOR,
              assinatura_gerente: item.ASSINATURA_GERENTE,
              conclusao_causa: item.CONCLUSAO_CAUSA,
              observacoes_gerente: item.OBSERVACOES_GERENTE,
              // Dados do Colaborador
              rg: item.RG,
              cpf: item.CPF,
              matricula: item.MATRICULA,
              data_admissao: item.DATA_ADMISSAO,
              funcao: item.FUNCAO,
              telefone: item.TELEFONE,
              ncnh: item.NCNH,
              categoria_cnh: item.CATEGORIA_CNH,
              validade_cnh: item.VALIDADE_CNH
            };
          });
          // Ordenar por data de apontamento (mais recentes primeiro) - finalizados por último
          apontamentosFormatados = sortByStatusAndDate(apontamentosFormatados);
          setApontamentos(apontamentosFormatados);
        } else {
          setApontamentos([]);
        }
      } catch (err) {
        console.error('[APONTAMENTOS] Erro ao carregar:', err);
        setApontamentos([]);
      } finally {
        setLoading(false);
      }
    };
    
    carregarApontamentos();
  }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, dataInicio, dataFim]);

  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Helper para converter valores do Oracle para boolean
  const toBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === '1' || value === 'S' || value.toLowerCase() === 'true';
    if (typeof value === 'number') return value === 1;
    return !!value;
  };

  // Helper para ordenar: pendentes/revisão primeiro, depois finalizados/cancelados
  const sortByStatusAndDate = (items) => {
    return items.sort((a, b) => {
      // Finalizados e cancelados vão para o final
      const aIsFinished = a.status === 'finalizado' || a.cancelado;
      const bIsFinished = b.status === 'finalizado' || b.cancelado;
      
      if (aIsFinished !== bIsFinished) {
        return aIsFinished ? 1 : -1; // Pendentes primeiro, finalizados/cancelados depois
      }
      
      // Se mesmo status, ordenar por data (mais recentes primeiro)
      const dataA = new Date(a.data_portaria || a.data_ocorrido || 0);
      const dataB = new Date(b.data_portaria || b.data_ocorrido || 0);
      return dataB - dataA;
    });
  };

  // --- FILTRAGEM ---
  const apontamentosFiltrados = apontamentos.filter(item => {
    const termo = searchTerm.toLowerCase();
    const textoMatch = 
      (item.nboletim || '').toLowerCase().includes(termo) ||
      (item.colaborador || '').toLowerCase().includes(termo) ||
      (item.area || '').toLowerCase().includes(termo) ||
      (item.municipio || '').toLowerCase().includes(termo) ||
      (item.local || '').toLowerCase().includes(termo);

    // Corrigir filtro de status para considerar subcategorias
    let statusMatch = true;
    if (statusFilter === 'Todos') {
      statusMatch = true;
    } else if (statusFilter === 'pendente') {
      // Filtrar pendentes (supervisor ou gerente)
      statusMatch = item.status === 'pendente_supervisor' || item.status === 'pendente_gerente';
    } else if (statusFilter === 'revisao') {
      // Filtrar apontamentos em revisão (com observações do supervisor)
      statusMatch = item.observacoes_supervisor && item.observacoes_supervisor.trim() !== '';
    } else if (statusFilter === 'finalizado') {
      statusMatch = item.status === 'finalizado';
    } else if (statusFilter === 'rejeitado') {
      // Ajustar conforme necessário no backend
      statusMatch = false;
    }

    let dataMatch = true;
    if (dataInicio || dataFim) {
      const dataItem = (item.data_portaria || item.data_ocorrido || '').split(/[T\s]/)[0]; // Extrai apenas YYYY-MM-DD
      if (dataInicio) dataMatch = dataMatch && dataItem >= dataInicio;
      if (dataFim) dataMatch = dataMatch && dataItem <= dataFim;
    }

    // --- FILTRAGEM POR CARGO ---
    let cargoMatch = true;
    
    // Apontamentos finalizados são visíveis para TODOS os usuários
    if (item.status === 'finalizado') {
      cargoMatch = true;
    } else if (userAdmin) {
      // Admin vê todos os apontamentos
      cargoMatch = true;
    } else if (userVisitor) {
      // Visitante vê TODOS os apontamentos (não tem restrição de acesso)
      cargoMatch = true;
    } else if (userSupervisor) {
      // Supervisor é INTERMEDIÁRIO: vê TODOS os apontamentos (inclusive cancelados)
      // para ter visibilidade completa dos apontamentos sob sua responsabilidade
      cargoMatch = item.status !== 'finalizado';
    } else if (userGerente) {
      // Gerente vê apontamentos que supervisor já aprovou E ele ainda não assinou
      // Inclusive apontamentos cancelados por ele (para auditoria)
      cargoMatch = item.assinado_supervisor && !item.assinado_gerente && item.status !== 'revisao';
    }

    return textoMatch && statusMatch && dataMatch && cargoMatch;
  }).sort((a, b) => {
    // Ordenar: pendentes/revisão primeiro, depois finalizados/cancelados
    const aIsFinished = a.status === 'finalizado' || a.cancelado;
    const bIsFinished = b.status === 'finalizado' || b.cancelado;
    
    if (aIsFinished !== bIsFinished) {
      return aIsFinished ? 1 : -1;
    }
    
    // Se mesmo status, ordenar por data (mais recentes primeiro)
    const dataA = new Date(a.data_portaria || a.data_ocorrido || 0);
    const dataB = new Date(b.data_portaria || b.data_ocorrido || 0);
    return dataB - dataA;
  });

  // --- LÓGICA DE PAGINAÇÃO ---
  const totalItems = apontamentosFiltrados.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = apontamentosFiltrados.slice(indexOfFirstItem, indexOfLastItem);

  const handleNew = () => {
    if (userAdmin) {
      alert.error("Admin não pode criar apontamentos. Apenas para visualização.");
      return;
    }
    // Abre modal de criar (apenas Visitante e Supervisor)
    if (canCreate) {
      setApontamentoEmAnalise(null); // Limpar dados anteriores
      
      // Supervisor usa o modal de assinar (com regras do convencional)
      // Visitante usa o modal de criar
      if (userSupervisor) {
        setShowModalAssinar(true);
      } else {
        setShowModalCriar(true);
      }
    } else {
      alert.error("Você não tem permissão para criar apontamentos.");
    }
  };

  const handleEdit = (item) => {
    if (userAdmin) {
      alert.error("Admin não pode editar apontamentos. Apenas para visualização.");
      return;
    }

    // Se está cancelado, abrir apenas em visualização
    if (item.status === 'cancelado') {
      alert.error("Este apontamento foi cancelado e não pode ser editado. Apenas visualização é permitida.");
      return;
    }

    // Se está finalizado, abrir apenas em visualização
    if (item.status === 'finalizado') {
      setApontamentoEmAnalise(item);
      setShowModalAssinar(true);
      return;
    }
    
    if (userVisitor || userSupervisor || userGerente) {
      // Se é Supervisor, pode editar qualquer apontamento (intermediário)
      // Apenas bloqueado quando finalizado (gerente aprovou)
      if (userSupervisor) {
        setApontamentoEmAnalise(item);
        setShowModalAssinar(true);
      } 
      // Se é Gerente, abre modal de assinar gerente
      // Não pode abrir apontamentos em revisão (são do supervisor)
      else if (userGerente && !item.assinado_gerente && item.status !== 'revisao') {
        setApontamentoEmAnalise(item);
        setShowModalGerente(true);
      } 
      // Se é Visitante, pode editar se em revisão (rejeitado)
      else if (userVisitor && item.observacoes_supervisor && item.observacoes_supervisor.trim() !== '') {
        setApontamentoEmAnalise(item);
        setShowModalCriar(true);
      }
      else {
        // Se é Visitante e não há rejeição
        alert.error("Você não tem permissão para editar apontamentos nesta etapa.");
      }
    }
  };

  const handleView = (item) => {
    // Se é visitante ou está finalizado, abrir visualização formatada
    if (userVisitor || item.status === 'finalizado' || item.cancelado) {
      setApontamentoParaVisualizar(item);
      setShowBoletimVisualizacao(true);
    } else {
      // Caso contrário, abrir modal para edição/assinatura
      setApontamentoEmAnalise(item);
      setShowModalAssinar(true);
    }
  };

  const handleCancel = async (item) => {
    // Confirmação usando AlertContext
    const confirmed = await alert.confirm(
      'Cancelar apontamento?',
      `Tem certeza que deseja cancelar o apontamento ${item.nboletim}?\n\nEsta ação não pode ser desfeita.`
    );
    
    if (!confirmed) return;

    try {
      const endpoint = import.meta.env.VITE_CRIAR_APONTAMENTO_POST;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          NBOLETIM: item.nboletim,
          STATUS: 'cancelado'
        })
      });

      const result = await response.json();
      if (result.status === 'sucesso') {
        alert.success('Apontamento cancelado com sucesso.');
        
        // Recarregar apontamentos
        const getEndpoint = import.meta.env.VITE_CRIAR_APONTAMENTO_GET;
        const getResponse = await fetch(getEndpoint);
        const getResult = await getResponse.json();
        
        if (getResult.status === 'sucesso' && Array.isArray(getResult.dados_apontamentos)) {
          let apontamentosFormatados = getResult.dados_apontamentos.map(i => {
            const assinSuperv = toBoolean(i.ASSINADO_SUPERVISOR);
            const assinGer = toBoolean(i.ASSINADO_GERENTE);
            // Usar STATUS do banco diretamente (já foi salvo corretamente durante aprovação)
            let statusFinal = i.STATUS || 'pendente_supervisor';

            return {
              id: i.ID,
              nboletim: i.NBOLETIM,
              colaborador: i.COLABORADOR,
              area: i.AREA,
              local: i.LOCAL,
              municipio: i.MUNICIPIO,
              supervisor: i.SUPERVISOR,
              email_supervisor: i.EMAIL_SUPERVISOR,
              data_portaria: i.DATA_PORTARIA,
              data_ocorrido: i.DATA_OCORRIDO,
              ocorrencia: i.OCORRENCIA,
              equipamento: i.EQUIPAMENTO,
              frota: i.FROTA,
              safra: i.SAFRA,
              elaborado_por: i.ELABORADO_POR,
              unidade: i.UNIDADE,
              status: statusFinal,
              cancelado: toBoolean(i.CANCELADO) || statusFinal === 'cancelado',
              assinado_supervisor: assinSuperv,
              assinado_gerente: assinGer,
              status_supervisor: i.STATUS_SUPERVISOR,
              status_gerente: i.STATUS_GERENTE,
              observacoes_supervisor: i.OBSERVACOES_SUPERVISOR,
              relato_colaborador: i.RELATO_COLABORADOR,
              relato_superior: i.RELATO_SUPERIOR,
              assinatura_supervisor: i.ASSINATURA_SUPERVISOR,
              assinatura_gerente: i.ASSINATURA_GERENTE,
              conclusao_causa: i.CONCLUSAO_CAUSA,
              observacoes_gerente: i.OBSERVACOES_GERENTE,
              rg: i.RG,
              cpf: i.CPF,
              matricula: i.MATRICULA,
              data_admissao: i.DATA_ADMISSAO,
              funcao: i.FUNCAO,
              telefone: i.TELEFONE,
              ncnh: i.NCNH,
              categoria_cnh: i.CATEGORIA_CNH,
              validade_cnh: i.VALIDADE_CNH
            };
          });
          // Ordenar por data (mais recentes primeiro) - finalizados por último
          apontamentosFormatados = sortByStatusAndDate(apontamentosFormatados);
          setApontamentos(apontamentosFormatados);
        }
      } else {
        throw new Error(result.mensagem || 'Erro ao cancelar apontamento');
      }
    } catch (err) {
      console.error('Erro ao cancelar:', err);
      alert.error('Erro: ' + err.message);
    }
  };

  // Nota: Funções de drag-drop foram removidas - funcionalidade incompleta
  // Para futuros desenvolvimentos, considere usar uma biblioteca como react-dropzone

  const toggleSelect = (id) => {
    if (userAdmin) return;
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (userAdmin) return;
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentItems.map(item => item.id));
    }
  };

  const handleExport = () => {
    if (selectedItems.length === 0) {
      alert.error("Nenhum apontamento selecionado. Selecione pelo menos um apontamento para exportar.");
      return;
    }

    setShowExportModal(true);
  };

  const confirmExport = () => {
    const nomeArquivo = `APONTAMENTOS_${new Date().toISOString().split('T')[0]}`;

    // Filtrar apenas os apontamentos selecionados
    const apontamentosSelecionados = apontamentosFiltrados.filter(i => selectedItems.includes(i.id));

    const dadosFiltrados = apontamentosSelecionados.map(i => {
      const dataFormatada = i.data_portaria?.split(/[T\s]/)[0] || 'N/A';
      return {
        b_o: i.nboletim,
        colaborador: i.colaborador,
        area: i.area,
        municipio: i.municipio,
        data_apontamento: dataFormatada,
        supervisor: i.supervisor,
        status: i.status || 'Pendente'
      };
    });

    if (exportFormat === 'pdf') {
      const doc = new jsPDF({ orientation: 'l' });
      doc.text("Apontamentos", 14, 11);
      autoTable(doc, {
        head: [["B.O.", "Colaborador", "Área", "Município", "Data", "Supervisor", "Status"]],
        body: apontamentosSelecionados.map(i => [
          i.nboletim,
          i.colaborador,
          i.area,
          i.municipio,
          i.data_portaria?.split(/[T\s]/)[0] || 'N/A',
          i.supervisor,
          i.status || 'Pendente'
        ]),
        startY: 25, theme: 'grid', styles: { fontSize: 8 }
      });
      doc.save(`${nomeArquivo}.pdf`);
    } else if (exportFormat === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(dadosFiltrados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Apontamentos");
      XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
    } else {
      // CSV format
      const ws = XLSX.utils.json_to_sheet(dadosFiltrados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Apontamentos");
      XLSX.writeFile(wb, `${nomeArquivo}.csv`);
    }

    setShowExportModal(false);
  };

  return (
    <div className="space-y-8">
      {/* TELA SIMPLIFICADA PARA VISITANTE */}
      {userVisitor ? (
        <div className="flex flex-col items-center justify-center min-h-96 space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-slate-800">CRIE UM NOVO APONTAMENTO OU BAIXE NOSSO APK</h2>
            <p className="text-slate-500 text-base">Clique no botão abaixo para registrar um novo apontamento</p>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={handleNew}
              className="bg-[#004927] hover:bg-[#003220] text-white px-8 py-4 font-bold text-lg transition-all flex items-center gap-3 shadow-lg hover:shadow-xl"
            >
              <Plus size={24} /> Novo Apontamento
            </button>
            
            <a 
              href="https://pub-482430420b844c5db71ab1b6b6748536.r2.dev/aplicativo%20boletin%20de%20ocorrencias%20(facilities)/apontamentos-app.apk" 
              download="apontamentos-app.apk"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 font-bold text-lg transition-all flex items-center gap-3 shadow-lg hover:shadow-xl rounded"
              title="Baixar aplicativo móvel para Android"
            >
              <Download size={24} /> Baixar APK
            </a>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Apontamentos</h2>
            <p className="text-slate-500 mt-1 text-xs font-medium">Gerenciamento de apontamentos | Total: <strong>{totalItems}</strong> registros {selectedItems.length > 0 && `| ${selectedItems.length} selecionado(s)`}</p>
            {userAdmin && (
              <div className="mt-2 text-xs font-semibold px-2 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 inline-flex items-center gap-1.5">
                <span>i</span> Admin: Visualização apenas
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExport} 
              disabled={selectedItems.length === 0 || userAdmin || user?.isVisitor}
              title={userAdmin ? "Apenas visualização" : user?.isVisitor ? "Visitantes não podem exportar" : selectedItems.length === 0 ? "Selecione apontamentos para exportar" : ""}
              className={`flex items-center gap-1.5 px-4 py-2 font-bold text-sm transition-all ${userAdmin || user?.isVisitor ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white'}`}
            >
              <Download size={16} className={userAdmin || user?.isVisitor ? "text-slate-300" : "text-[#004927]"} /> Exportar
            </button>
            <a 
              href="https://pub-482430420b844c5db71ab1b6b6748536.r2.dev/aplicativo%20boletin%20de%20ocorrencias%20(facilities)/apontamentos-app.apk" 
              download="apontamentos-app.apk"
              className="flex items-center gap-1.5 px-4 py-2 font-bold text-sm transition-all bg-green-600 text-white border border-green-600 hover:bg-green-700 rounded shadow-md"
              title="Baixar aplicativo móvel para Android"
            >
              <Download size={16} /> Baixar APK
            </a>
            {canCreate && !userAdmin && (
              <button onClick={handleNew} className="bg-[#004927] hover:bg-[#003220] text-white px-4 py-2 font-bold text-sm transition-all flex items-center gap-1.5">
                <Plus size={16} /> Novo
              </button>
            )}
            {userAdmin && (
              <div className="text-xs font-semibold px-2 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-1">
                <span>i</span> Visualização
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-3 mb-3 border border-slate-200">
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="flex-1 min-w-75 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#004927] transition-colors" size={16} />
            <input 
              className="w-full pl-10 pr-3 py-2 border border-slate-200 outline-none bg-slate-50/50 transition-all text-sm font-medium" 
              placeholder="Pesquisar por B.O., Colaborador, Área, Município ou Local..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Filter size={12} /> Filtros:
            </div>
            <select className="border-slate-200 border px-3 py-1.5 text-xs outline-none font-semibold text-slate-600 bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="Todos">Todos Status</option>
              <option value="pendente">Pendente (Aguardando Gerente)</option>
              <option value="revisao">Revisão Necessária</option>
              <option value="finalizado">Finalizado</option>
              <option value="rejeitado">Rejeitado</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1 border border-slate-200">
            <Calendar size={14} className="text-slate-400 ml-1" />
            <input type="date" className="bg-transparent border-none px-1.5 py-0.5 text-xs font-bold text-slate-600 outline-none" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            <span className="text-slate-300 font-bold text-xs">à</span>
            <input type="date" className="bg-transparent border-none px-1.5 py-0.5 text-xs font-bold text-slate-600 outline-none" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
        </div>
      </div>

      {/* TABELA DE APONTAMENTOS */}
      <div className="bg-white border border-slate-200 overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-[#004927]" size={32} /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="min-w-300 divide-y divide-slate-100">
                {/* Header */}
                <div className="grid grid-cols-12 px-4 py-2 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider items-center">
                  <div className="col-span-1">
                    <input 
                      type="checkbox" 
                      checked={selectedItems.length === currentItems.length && currentItems.length > 0}
                      onChange={toggleSelectAll}
                      disabled={userAdmin}
                      className={`w-4 h-4 ${userAdmin ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    />
                  </div>
                  <div className="col-span-2">B.O. / Data</div>
                  <div className="col-span-2">Colaborador / Área</div>
                  <div className="col-span-2">Local / Município</div>
                  <div className="col-span-2">Supervisor</div>
                  <div className="col-span-2">Assinaturas</div>
                  <div className="col-span-1 text-right">Ações</div>
                </div>

                {currentItems.length > 0 ? (
                  currentItems.map((item) => (
                    <div key={item.id} className={`grid grid-cols-12 px-4 py-2.5 items-center transition-all border-b border-slate-100 ${item.cancelado ? 'bg-red-50/40 opacity-60' : ''} ${selectedItems.includes(item.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <div className="col-span-1">
                        <input 
                          type="checkbox" 
                          checked={selectedItems.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          disabled={userAdmin || item.cancelado}
                          className={`w-4 h-4 ${userAdmin || item.cancelado ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-xs ${item.cancelado ? 'text-red-600 line-through' : 'text-slate-800'}`}>{item.nboletim}</span>
                          {item.cancelado && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-red-200 text-red-700 text-[9px] font-black">CANCELADO</span>
                          )}
                          {item.status === 'finalizado' && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-[#004927] text-white text-[9px] font-black">FINALIZADO</span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold">{item.data_portaria?.split(/[T\s]/)[0] || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-bold text-xs text-slate-700">{item.colaborador}</p>
                        <p className="text-[9px] text-slate-400">{item.area}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-slate-600">{item.local}</p>
                        <p className="text-[9px] text-slate-400">{item.municipio}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs font-medium text-slate-700">{item.supervisor}</span>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          {/* Bolinha Colaborador */}
                          <div className="flex items-center">
                            <div className={`w-7 h-7 flex items-center justify-center text-xs font-bold ${
                              item.observacoes_supervisor && item.observacoes_supervisor.trim() !== ''
                                ? 'bg-amber-500 text-white'
                                : 'bg-[#004927] text-white'
                            }`} title={item.observacoes_supervisor ? "Em revisão" : "Criado"}>
                              {item.observacoes_supervisor && item.observacoes_supervisor.trim() !== '' ? 'X' : 'V'}
                            </div>
                          </div>

                          {/* Bolinha Supervisor */}
                          <div className="flex items-center">
                            <div className={`w-7 h-7 flex items-center justify-center text-xs font-bold ${
                              item.status_supervisor === 'revisao'
                                ? 'bg-amber-500 text-white'
                                : item.assinado_supervisor 
                                ? 'bg-[#004927] text-white'
                                : 'bg-slate-300 text-slate-500'
                            }`} title={item.status_supervisor === 'revisao' ? "Revisão necessária" : item.assinado_supervisor ? "Supervisor aprovou" : "Aguardando supervisor"}>
                              {item.status_supervisor === 'revisao' ? '!' : item.assinado_supervisor ? 'V' : 'O'}
                            </div>
                          </div>

                          {/* Bolinha Gerente */}
                          <div className="flex items-center">
                            <div className={`w-7 h-7 flex items-center justify-center text-xs font-bold ${
                              item.status_gerente === 'revisao'
                                ? 'bg-amber-500 text-white'
                                : item.assinado_gerente 
                                ? 'bg-[#004927] text-white'
                                : 'bg-slate-300 text-slate-500'
                            }`} title={item.status_gerente === 'revisao' ? "Revisão necessária" : item.assinado_gerente ? "Gerente aprovou" : "Aguardando gerente"}>
                              {item.status_gerente === 'revisao' ? '!' : item.assinado_gerente ? 'V' : 'O'}
                            </div>
                          </div>
                        </div>

                        {/* Caixa de observações do supervisor se houver revisão */}
                        {item.observacoes_supervisor && item.observacoes_supervisor.trim() !== '' && (
                          <div className="bg-amber-50 border border-amber-200 p-2 text-[8px] text-amber-700 font-semibold">
                            <p className="font-bold mb-0.5 text-[9px]">Pendências:</p>
                            <p>{item.observacoes_supervisor}</p>
                          </div>
                        )}
                      </div>
                      <div className="col-span-1 flex flex-col gap-1 items-end justify-end">
                        {/* VISITANTE: sem acesso ao visualizar outros apontamentos */}
                        {user?.isVisitor ? (
                          <span className="text-xs text-slate-400 text-right">—</span>
                        ) : item.cancelado ? (
                          <button onClick={() => handleView(item)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Visualizar apontamento cancelado">
                            <Eye size={16} />
                          </button>
                        ) : item.status === 'finalizado' ? (
                          // FINALIZADO: apenas visualizar para todos (read-only)
                          <button onClick={() => handleView(item)} className="p-2 text-slate-400 hover:text-green-500 transition-colors" title="Visualizar apontamento finalizado">
                            <Eye size={16} />
                          </button>
                        ) : userAdmin ? (
                          // ADMIN: apenas visualizar (read-only)
                          <button onClick={() => handleView(item)} disabled={true} className="p-2 text-slate-200 cursor-not-allowed" title="Apenas visualização">
                            <Eye size={16} />
                          </button>
                        ) : userSupervisor && !item.assinado_supervisor && item.status !== 'pendente_gerente' ? (
                          // SUPERVISOR: editar (abre modal com OK/Negar) - se não assinou ainda E não está pendente de gerente
                          <div className="w-full flex flex-col gap-1">
                            <button 
                              onClick={() => handleEdit(item)}
                              className="w-full px-2 py-1 bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-1"
                              title="Editar e assinar apontamento"
                            >
                              <Edit size={12} /> Editar
                            </button>
                            <button 
                              onClick={() => handleCancel(item)}
                              className="w-full px-2 py-1 bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-1"
                              title="Cancelar apontamento"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : userSupervisor && item.status === 'pendente_gerente' ? (
                          // SUPERVISOR: apontamento aguardando gerente - não pode editar
                          <button onClick={() => handleView(item)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Aguardando aprovação do gerente. Não é possível editar.">
                            <Eye size={16} />
                          </button>
                        ) : userSupervisor ? (
                          // SUPERVISOR: já assinou - permite visualizar em read-only
                          <button onClick={() => handleView(item)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Visualizar apontamento assinado">
                            <Eye size={16} />
                          </button>
                        ) : userGerente && !item.assinado_gerente ? (
                          // GERENTE: editar (abre modal com Aprovar/Rejeitar) - se não assinou ainda
                          <div className="w-full flex flex-col gap-1">
                            <button 
                              onClick={() => handleEdit(item)}
                              className="w-full px-2 py-1 bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-1"
                              title="Editar e assinar apontamento"
                            >
                              <Edit size={12} /> Editar
                            </button>
                            <button 
                              onClick={() => handleCancel(item)}
                              className="w-full px-2 py-1 bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-1"
                              title="Cancelar apontamento"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : userGerente ? (
                          // GERENTE: já assinou - permite visualizar em read-only
                          <button onClick={() => handleView(item)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Visualizar apontamento aprovado">
                            <Eye size={16} />
                          </button>
                        ) : (
                          // USUÁRIO COMUM: editar se em revisão, visualizar se normal
                          <>
                            {item.observacoes_supervisor && item.observacoes_supervisor.trim() !== '' && item.status !== 'pendente_gerente' ? (
                              <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-green-500 transition-colors" title="Editar apontamento">
                                <Edit size={16} />
                              </button>
                            ) : (
                              <button onClick={() => handleView(item)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Visualizar apontamento">
                                <Eye size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-8 py-12 text-center">
                    <p className="text-slate-400 font-medium">Nenhum apontamento encontrado</p>
                  </div>
                )}
              </div>
            </div>

            {/* PAGINAÇÃO */}
            {totalPages > 1 && (
              <div className="px-8 py-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-500">
                  Mostrando <span className="text-indigo-600">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)}</span> de <span className="text-slate-800">{totalItems}</span> registros
                </div>
                
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2.5 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-20 transition-all">
                    <ChevronsLeft size={20} />
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2.5 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-20 transition-all">
                    <ChevronLeft size={20} />
                  </button>

                  <div className="bg-white border border-slate-200 px-5 py-2 text-sm font-black text-slate-700">
                    {currentPage} / {totalPages}
                  </div>

                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2.5 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-20 transition-all">
                    <ChevronRight size={20} />
                  </button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-2.5 hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-20 transition-all">
                    <ChevronsRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

        </>
      )}

      {/* MODAL PARA CRIAR APONTAMENTO (Visitante) */}
      <ApontamentosModalCriar 
        isOpen={showModalCriar} 
        onClose={() => {
          setShowModalCriar(false);
          setApontamentoEmAnalise(null);
        }}
        apontamento={apontamentoEmAnalise}
        user={user}
        onSuccess={async () => {
          // Recarregar apontamentos
          const endpoint_get = import.meta.env.VITE_CRIAR_APONTAMENTO_GET;
          try {
            const response = await fetch(endpoint_get);
            const result = await response.json();
            if (result.status === 'sucesso' && Array.isArray(result.dados_apontamentos)) {
              let apontamentosFormatados = result.dados_apontamentos.map(item => {
                // Converter booleanos do Oracle (que vêm como '0' ou '1')
                const assinadoSupervisor = toBoolean(item.ASSINADO_SUPERVISOR);
                const assinadoGerente = toBoolean(item.ASSINADO_GERENTE);
                // Usar STATUS do banco diretamente (já foi salvo corretamente durante aprovação)
                let statusFinal = item.STATUS || 'pendente_supervisor';
                return {
                  id: item.ID,
                  nboletim: item.NBOLETIM,
                  colaborador: item.COLABORADOR,
                  area: item.AREA,
                  local: item.LOCAL,
                  municipio: item.MUNICIPIO,
                  supervisor: item.SUPERVISOR,
                  email_supervisor: item.EMAIL_SUPERVISOR,
                  data_portaria: item.DATA_PORTARIA,
                  data_ocorrido: item.DATA_OCORRIDO,
                  ocorrencia: item.OCORRENCIA,
                  equipamento: item.EQUIPAMENTO,
                  frota: item.FROTA,
                  safra: item.SAFRA,
                  elaborado_por: item.ELABORADO_POR,
                  unidade: item.UNIDADE,
                  status: statusFinal,
                  cancelado: toBoolean(item.CANCELADO) || statusFinal === 'cancelado',
                  assinado_supervisor: assinadoSupervisor,
                  assinado_gerente: assinadoGerente,
                  status_supervisor: item.STATUS_SUPERVISOR,
                  status_gerente: item.STATUS_GERENTE,
                  observacoes_supervisor: item.OBSERVACOES_SUPERVISOR,
                  relato_colaborador: item.RELATO_COLABORADOR,
                  relato_superior: item.RELATO_SUPERIOR,
                  assinatura_supervisor: item.ASSINATURA_SUPERVISOR,
                  assinatura_gerente: item.ASSINATURA_GERENTE,
                  conclusao_causa: item.CONCLUSAO_CAUSA,
                  observacoes_gerente: item.OBSERVACOES_GERENTE,
                  rg: item.RG,
                  cpf: item.CPF,
                  matricula: item.MATRICULA,
                  data_admissao: item.DATA_ADMISSAO,
                  funcao: item.FUNCAO,
                  telefone: item.TELEFONE,
                  ncnh: item.NCNH,
                  categoria_cnh: item.CATEGORIA_CNH,
                  validade_cnh: item.VALIDADE_CNH
                };
              });
              // Ordenar por data (mais recentes primeiro) - finalizados por último
              apontamentosFormatados = sortByStatusAndDate(apontamentosFormatados);
              setApontamentos(apontamentosFormatados);
            }
          } catch (err) {
            console.error('Erro ao recarregar apontamentos:', err);
          }
        }}
      />

      {/* MODAL PARA ASSINAR APONTAMENTO (Supervisor/Gerente) */}
      <ApontamentosModalAssinar 
        isOpen={showModalAssinar}
        onClose={() => setShowModalAssinar(false)}
        apontamento={apontamentoEmAnalise}
        user={user}
        onSave={() => {
          // Recarregar apontamentos após assinatura
          const endpoint_get = import.meta.env.VITE_CRIAR_APONTAMENTO_GET;
          try {
            fetch(endpoint_get).then(response => response.json()).then(result => {
              if (result.status === 'sucesso' && Array.isArray(result.dados_apontamentos)) {
                let apontamentosFormatados = result.dados_apontamentos.map(item => {
                  // Converter booleanos do Oracle (que vêm como '0' ou '1')
                  const assinadoSupervisor = toBoolean(item.ASSINADO_SUPERVISOR);
                  const assinadoGerente = toBoolean(item.ASSINADO_GERENTE);
                  
                  // Usar STATUS do banco diretamente (já foi salvo corretamente durante aprovação)
                  let statusFinal = item.STATUS || 'pendente_supervisor';

                  return {
                    id: item.ID,
                    nboletim: item.NBOLETIM,
                    colaborador: item.COLABORADOR,
                    area: item.AREA,
                    local: item.LOCAL,
                    municipio: item.MUNICIPIO,
                    supervisor: item.SUPERVISOR,
                    data_portaria: item.DATA_PORTARIA,
                    data_ocorrido: item.DATA_OCORRIDO,
                    ocorrencia: item.OCORRENCIA,
                    equipamento: item.EQUIPAMENTO,
                    frota: item.FROTA,
                    safra: item.SAFRA,
                    elaborado_por: item.ELABORADO_POR,
                    unidade: item.UNIDADE,
                    status: statusFinal,
                    cancelado: toBoolean(item.CANCELADO) || statusFinal === 'cancelado',
                    assinado_supervisor: assinadoSupervisor,
                    assinado_gerente: assinadoGerente,
                    status_supervisor: item.STATUS_SUPERVISOR,
                    status_gerente: item.STATUS_GERENTE,
                    observacoes_supervisor: item.OBSERVACOES_SUPERVISOR,
                    relato_colaborador: item.RELATO_COLABORADOR,
                    relato_superior: item.RELATO_SUPERIOR,
                    assinatura_supervisor: item.ASSINATURA_SUPERVISOR,
                    assinatura_gerente: item.ASSINATURA_GERENTE,
                    conclusao_causa: item.CONCLUSAO_CAUSA,
                    observacoes_gerente: item.OBSERVACOES_GERENTE,
                    rg: item.RG,
                    cpf: item.CPF,
                    matricula: item.MATRICULA,
                    data_admissao: item.DATA_ADMISSAO,
                    funcao: item.FUNCAO,
                    telefone: item.TELEFONE,
                    ncnh: item.NCNH,
                    categoria_cnh: item.CATEGORIA_CNH,
                    validade_cnh: item.VALIDADE_CNH
                  };
                });
                // Ordenar por data (mais recentes primeiro) - finalizados por último
                apontamentosFormatados = sortByStatusAndDate(apontamentosFormatados);
                setApontamentos(apontamentosFormatados);
                setCurrentPage(1); // Reset para primeira página
              }
            });
          } catch (err) {
            console.error('Erro ao recarregar apontamentos:', err);
          }
          setApontamentoEmAnalise(null);
        }}
      />

      {/* MODAL PARA GERENTE ASSINAR APONTAMENTO */}
      <ApontamentosModalGerente 
        isOpen={showModalGerente}
        onClose={() => setShowModalGerente(false)}
        apontamento={apontamentoEmAnalise}
        user={user}
        onSave={() => {
          // Recarregar apontamentos após assinatura do gerente
          const endpoint_get = import.meta.env.VITE_CRIAR_APONTAMENTO_GET;
          try {
            fetch(endpoint_get).then(response => response.json()).then(result => {
              if (result.status === 'sucesso' && Array.isArray(result.dados_apontamentos)) {
                let apontamentosFormatados = result.dados_apontamentos.map(item => {
                  const assinadoSupervisor = toBoolean(item.ASSINADO_SUPERVISOR);
                  const assinadoGerente = toBoolean(item.ASSINADO_GERENTE);
                  
                  // Usar STATUS do banco diretamente (já foi salvo corretamente durante aprovação)
                  let statusFinal = item.STATUS || 'pendente_supervisor';

                  return {
                    id: item.ID,
                    nboletim: item.NBOLETIM,
                    colaborador: item.COLABORADOR,
                    area: item.AREA,
                    local: item.LOCAL,
                    municipio: item.MUNICIPIO,
                    supervisor: item.SUPERVISOR,
                    email_supervisor: item.EMAIL_SUPERVISOR,
                    data_portaria: item.DATA_PORTARIA,
                    data_ocorrido: item.DATA_OCORRIDO,
                    ocorrencia: item.OCORRENCIA,
                    equipamento: item.EQUIPAMENTO,
                    frota: item.FROTA,
                    safra: item.SAFRA,
                    elaborado_por: item.ELABORADO_POR,
                    unidade: item.UNIDADE,
                    status: statusFinal,
                    cancelado: toBoolean(item.CANCELADO) || statusFinal === 'cancelado',
                    assinado_supervisor: assinadoSupervisor,
                    assinado_gerente: assinadoGerente,
                    status_supervisor: item.STATUS_SUPERVISOR,
                    status_gerente: item.STATUS_GERENTE,
                    observacoes_supervisor: item.OBSERVACOES_SUPERVISOR,
                    relato_colaborador: item.RELATO_COLABORADOR,
                    relato_superior: item.RELATO_SUPERIOR,
                    assinatura_supervisor: item.ASSINATURA_SUPERVISOR,
                    assinatura_gerente: item.ASSINATURA_GERENTE,
                    conclusao_causa: item.CONCLUSAO_CAUSA,
                    observacoes_gerente: item.OBSERVACOES_GERENTE,
                    rg: item.RG,
                    cpf: item.CPF,
                    matricula: item.MATRICULA,
                    data_admissao: item.DATA_ADMISSAO,
                    funcao: item.FUNCAO,
                    telefone: item.TELEFONE,
                    ncnh: item.NCNH,
                    categoria_cnh: item.CATEGORIA_CNH,
                    validade_cnh: item.VALIDADE_CNH
                  };
                });
                // Ordenar por data (mais recentes primeiro) - finalizados por último
                apontamentosFormatados = sortByStatusAndDate(apontamentosFormatados);
                setApontamentos(apontamentosFormatados);
                setCurrentPage(1); // Reset para primeira página
              }
            });
          } catch (err) {
            console.error('Erro ao recarregar apontamentos:', err);
          }
          setApontamentoEmAnalise(null);
        }}
      />

      {/* VISUALIZAÇÃO DO BOLETIM DE OCORRÊNCIA */}
      <BoletimVisualizacao
        isOpen={showBoletimVisualizacao}
        onClose={() => setShowBoletimVisualizacao(false)}
        apontamento={apontamentoParaVisualizar}
      />

      {/* MODAL DE EXPORTAÇÃO */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 max-w-md w-full space-y-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Exportar Apontamentos</h3>
            </div>
            
            <div className="px-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Formato</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="format" 
                      value="xlsx" 
                      checked={exportFormat === 'xlsx'}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-700">Excel (.xlsx)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="format" 
                      value="csv" 
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-700">CSV (.csv)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="format" 
                      value="pdf" 
                      checked={exportFormat === 'pdf'}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-700">PDF</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmExport}
                className="flex-1 px-4 py-2 bg-[#004927] text-white hover:bg-[#003220] font-bold transition-all"
              >
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
