import React, { useState, useEffect, useCallback, memo } from 'react';
import { Search, Download, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Eye, X, FileDown } from 'lucide-react';
import { Notification } from '../components/Notification';
import { BoletimVisualizacao } from '../components/BoletimVisualizacao';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// CSS para animação pulsante
const pulseStyle = `
  @keyframes pulseGreen {
    0%, 100% {
      background-color: rgba(0, 73, 39, 0.1);
    }
    50% {
      background-color: rgba(0, 73, 39, 0.2);
    }
  }
  .pulse-green {
    animation: pulseGreen 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

export function Dashboard({ user }) {
  const [apontamentos, setApontamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConcluidos, setShowConcluidos] = useState(false);
  
  // Proteção: Admin não tem acesso a dashboard
  if (user?.cargo === 'admin') {
    return (
      <div className="bg-white p-8 border border-slate-200 text-center">
        <p className="text-slate-600 font-medium">Acesso negado. Administradores acessam apenas as configurações de usuários.</p>
      </div>
    );
  }
  
  // States para Gastos com Acidente/Falha/Sinistro
  const [editedRows, setEditedRows] = useState({});
  const [gastosData, setGastosData] = useState({});
  const [newApontamentos, setNewApontamentos] = useState(new Set());
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx'); // xlsx, pdf, csv
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [saveNotificationMessage, setSaveNotificationMessage] = useState('');
  const [saveNotificationIsError, setSaveNotificationIsError] = useState(false);
  const [showConcluirNotification, setShowConcluirNotification] = useState(false);
  const [apontamentoParaConcluir, setApontamentoParaConcluir] = useState(null);
  const [apontamentoSelecionado, setApontamentoSelecionado] = useState(null);
  const [showVisualizacao, setShowVisualizacao] = useState(false);

  // Normalizar dados do apontamento: converter de MAIÚSCULAS para minúsculas
  const normalizarApontamento = (apt) => {
    if (!apt) return null;
    return {
      // Dados do Apontamento
      nboletim: apt.NBOLETIM || apt.nboletim,
      data_apontamento: apt.DATA_APONTAMENTO || apt.data_apontamento,
      data_ocorrido: apt.DATA_OCORRIDO || apt.data_ocorrido,
      data_portaria: apt.DATA_PORTARIA || apt.data_portaria,
      ocorrencia: apt.OCORRENCIA || apt.ocorrencia,
      local: apt.LOCAL || apt.local,
      area: apt.AREA || apt.area,
      municipio: apt.MUNICIPIO || apt.municipio,
      unidade: apt.UNIDADE || apt.unidade,
      equipamento: apt.EQUIPAMENTO || apt.equipamento,
      frota: apt.FROTA || apt.frota,
      safra: apt.SAFRA || apt.safra,
      elaborado_por: apt.ELABORADO_POR || apt.elaborado_por,
      supervisor: apt.SUPERVISOR || apt.supervisor,
      email_supervisor: apt.EMAIL_SUPERVISOR || apt.email_supervisor,
      // Dados do Colaborador
      relato_colaborador: apt.RELATO_COLABORADOR || apt.relato_colaborador,
      colaborador: apt.COLABORADOR || apt.colaborador,
      matricula: apt.MATRICULA || apt.matricula,
      rg: apt.RG || apt.rg,
      cpf: apt.CPF || apt.cpf,
      data_admissao: apt.DATA_ADMISSAO || apt.data_admissao,
      funcao: apt.FUNCAO || apt.funcao,
      telefone: apt.TELEFONE || apt.telefone,
      ncnh: apt.NCNH || apt.ncnh,
      categoria_cnh: apt.CATEGORIA_CNH || apt.categoria_cnh,
      validade_cnh: apt.VALIDADE_CNH || apt.validade_cnh,
      // Análise e Conclusão
      relato_superior: apt.RELATO_SUPERIOR || apt.relato_superior,
      conclusao_causa: apt.CONCLUSAO_CAUSA || apt.conclusao_causa || '',
      // Assinaturas
      assinatura_supervisor: apt.ASSINATURA_SUPERVISOR || apt.assinatura_supervisor,
      assinatura_gerente: apt.ASSINATURA_GERENTE || apt.assinatura_gerente,
      assinado_gerente: apt.ASSINADO_GERENTE || apt.assinado_gerente,
      assinado_supervisor: apt.ASSINADO_SUPERVISOR || apt.assinado_supervisor,
      // Dados de Gastos (Dashboard)
      marca_modelo: apt.MARCA_MODELO || apt.marca_modelo || '',
      os: apt.OS || apt.os || '', // Ordem de Serviço
      valor_os: apt.VALOR_OS || apt.valor_os || 0, // Valor da OS
      requisicao: apt.REQUISICAO || apt.requisicao || '', // Requisição
      valor_requisicao: apt.VALOR_REQUISICAO || apt.valor_requisicao || 0, // Valor da Requisição
      gasto_total: apt.GASTO_TOTAL || apt.gasto_total || 0, // Gasto Total
      // Status
      concluido: apt.CONCLUIDO || apt.concluido || 'N',
      novo_apontamento: apt.NOVO_APONTAMENTO || apt.novo_apontamento || 'N',
      status: apt.STATUS || apt.status || '',
      id: apt.ID || apt.id,
    };
  };

  // Injetar estilos de animação
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = pulseStyle;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Carregar apontamentos aprovados
  useEffect(() => {
    const toBoolean = (value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value === '1' || value === 'S' || value.toLowerCase() === 'true';
      if (typeof value === 'number') return value === 1;
      return !!value;
    };

    const loadApontamentos = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('agromanager_token');
        const endpoint = import.meta.env.VITE_CRIAR_APONTAMENTO_GET;
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.status === 401) {
          localStorage.removeItem('agromanager_token');
          localStorage.removeItem('agromanager_user');
          window.location.href = '/';
          return;
        }
        const data = await response.json();
        
        console.log('Dados recebidos do backend:', data);
        
        if (data.status === 'sucesso' && data.dados_apontamentos) {
          // Recalcular status e filtrar apenas aprovados
          const apontamentosAprovados = data.dados_apontamentos
            .map(item => {
              const assinadoSupervisor = toBoolean(item.ASSINADO_SUPERVISOR);
              const assinadoGerente = toBoolean(item.ASSINADO_GERENTE);
              
              let statusFinal = item.STATUS || 'pendente';
              
              if (statusFinal !== 'cancelado' && statusFinal !== 'revisao') {
                if (assinadoSupervisor && assinadoGerente) {
                  statusFinal = 'aprovado';
                } else if (assinadoSupervisor && !assinadoGerente) {
                  statusFinal = 'pendente_gerente';
                } else {
                  statusFinal = 'pendente_supervisor';
                }
              }
              
              return { ...item, status: statusFinal };
            })
            .filter(item => item.status === 'aprovado');
          
          console.log('Apontamentos aprovados:', apontamentosAprovados);
          if (apontamentosAprovados.length > 0) {
            console.log('Primeiro apontamento (para debug):', apontamentosAprovados[0]);
          }
          
          setApontamentos(apontamentosAprovados);
          // Marcar apenas apontamentos com NOVO_APONTAMENTO='S' como novo
          const novosIds = apontamentosAprovados
            .filter(a => {
              const novo = String(a.NOVO_APONTAMENTO || '').toUpperCase() === 'S' || a.NOVO_APONTAMENTO === true || a.NOVO_APONTAMENTO === 1;
              if (novo) console.log('Apontamento marcado como novo:', a.ID, a.NOVO_APONTAMENTO);
              return novo;
            })
            .map(a => a.ID);
          console.log('IDs marcados como novos:', novosIds);
          setNewApontamentos(new Set(novosIds));
        }
      } catch (error) {
        console.error('Erro ao carregar apontamentos:', error);
        setApontamentos([]);
      } finally {
        setLoading(false);
      }
    };

    loadApontamentos();
  }, []);

  // Filtrar apontamentos
  const apontamentosFiltrados = apontamentos
    .filter(item => {
      // Filtro de busca
      const termo = searchTerm.toLowerCase();
      const passaBusca = (
        (item.UNIDADE || '').toLowerCase().includes(termo) ||
        (item.COLABORADOR || '').toLowerCase().includes(termo) ||
        (item.AREA || '').toLowerCase().includes(termo) ||
        (item.NBOLETIM || '').toLowerCase().includes(termo) ||
        (item.EQUIPAMENTO || '').toLowerCase().includes(termo)
      );
      
      // Filtro de conclusão: se showConcluidos=false, oculta os concluídos
      const isConcluido = item.CONCLUIDO === 'S' || item.CONCLUIDO === true;
      const passaConclusao = showConcluidos || !isConcluido;
      
      return passaBusca && passaConclusao;
    })
    .sort((a, b) => {
      // PRIORIDADE 1: Não-concluídos sempre primeiro
      const isConcuidoA = a.CONCLUIDO === 'S' || a.CONCLUIDO === true;
      const isConcuidoB = b.CONCLUIDO === 'S' || b.CONCLUIDO === true;
      if (isConcuidoA !== isConcuidoB) {
        return isConcuidoA ? 1 : -1; // não-concluídos (false) vêm antes
      }
      // PRIORIDADE 2: Dentro de cada grupo, ordenar por data mais recente
      const dataA = new Date(a.DATA_OCORRIDO || 0);
      const dataB = new Date(b.DATA_OCORRIDO || 0);
      return dataB - dataA;
    });

  // Handlers para seleção de linhas
  const toggleRowSelection = useCallback((apontamentoId) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(apontamentoId)) {
        newSet.delete(apontamentoId);
      } else {
        newSet.add(apontamentoId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedRows.size === apontamentosFiltrados.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(apontamentosFiltrados.map(a => a.ID)));
    }
  }, [apontamentosFiltrados, selectedRows]);

  // Handler para editar célula de gasto inline
  const handleEditGastoCell = useCallback((apontamentoId, field, value) => {
    console.log(`🖊️ EDITANDO CAMPO: ID=${apontamentoId}, field=${field}, value=${value}`);
    
    // Remover da lista de "novo" quando editar
    setNewApontamentos(prev => {
      const newSet = new Set(prev);
      newSet.delete(apontamentoId);
      return newSet;
    });
    
    let dataToUpdate = {
      [field]: value
    };

    // Se for valor_os ou valor_requisicao, calcular gasto_total automaticamente
    if (field === 'valor_os' || field === 'valor_requisicao') {
      const currentValues = editedRows[apontamentoId] || {};
      const apontamento = apontamentos.find(a => a.ID === apontamentoId) || {};
      
      const valorOS = field === 'valor_os' ? value : (currentValues.valor_os ?? apontamento.VALOR_OS ?? '0');
      const valorReq = field === 'valor_requisicao' ? value : (currentValues.valor_requisicao ?? apontamento.VALOR_REQUISICAO ?? '0');
      
      // Converter para números e somar
      const numOS = parseFloat(valorOS.toString().replace(',', '.')) || 0;
      const numReq = parseFloat(valorReq.toString().replace(',', '.')) || 0;
      const total = (numOS + numReq).toFixed(2);
      
      dataToUpdate.gasto_total = total.toString().replace('.', ',');
      console.log(`🧮 CÁLCULO: ${numOS} + ${numReq} = ${total}`);
    }
    
    setEditedRows(prev => {
      const newState = {
        ...prev,
        [apontamentoId]: {
          ...(prev[apontamentoId] || {}),
          ...dataToUpdate
        }
      };
      console.log(`💾 editedRows[${apontamentoId}] após atualização:`, newState[apontamentoId]);
      return newState;
    });
    
    setGastosData(prev => ({
      ...prev,
      [apontamentoId]: {
        ...(prev[apontamentoId] || {}),
        ...dataToUpdate
      }
    }));
  }, [apontamentos, editedRows]);

  // Handler para salvar todos os gastos editados
  const handleSaveGastos = useCallback(async () => {
    try {
      console.log('=== INICIANDO SALVAMENTO ===');
      console.log('editedRows:', editedRows);
      console.log('Quantidade de linhas a salvar:', Object.keys(editedRows).length);
      
      const rowsToSave = Object.entries(editedRows).map(([apontamentoId, fields]) => ({
        id: parseInt(apontamentoId),
        ...fields
      }));

      if (rowsToSave.length === 0) {
        console.warn('Nenhuma linha para salvar!');
        return;
      }

      console.log('Linhas para salvar:', rowsToSave);

      // Enviar para o backend
      const endpoint = import.meta.env.VITE_CRIAR_APONTAMENTO_POST;
      console.log('Endpoint POST:', endpoint);
      
      if (!endpoint) {
        throw new Error('Endpoint VITE_CRIAR_APONTAMENTO_POST não configurado!');
      }
      
      for (const row of rowsToSave) {
        console.log(`\n--- Salvando linha ID ${row.id} ---`);
        console.log('row object completo:', row);
        console.log('row.requisicao:', row.requisicao);
        console.log('row.valor_requisicao:', row.valor_requisicao);
        
        // Encontrar o apontamento para pegar NBOLETIM e outros dados
        const apontamento = apontamentos.find(a => a.ID === row.id);
        console.log('Apontamento encontrado:', apontamento);
        
        if (!apontamento) {
          console.warn(`Apontamento com ID ${row.id} não encontrado!`);
          continue;
        }
        
        // Converter valores monetários para números
        const valorOS = row.valor_os ? parseFloat(row.valor_os.toString().replace(',', '.')) : null;
        const valorRequisicao = row.valor_requisicao ? parseFloat(row.valor_requisicao.toString().replace(',', '.')) : null;
        const gastoTotal = row.gasto_total ? parseFloat(row.gasto_total.toString().replace(',', '.')) : null;
        
        const payload = {
          ID: row.id,
          NBOLETIM: apontamento?.NBOLETIM || ''
        };
        
        // SÓ INCLUIR CAMPOS QUE FORAM REALMENTE EDITADOS
        if (row.ordem_servico !== undefined) {
          payload.ORDEM_SERVICO = row.ordem_servico || null;
        }
        if (row.valor_os !== undefined) {
          payload.VALOR_OS = valorOS;
        }
        if (row.requisicao !== undefined) {
          payload.REQUISICAO = row.requisicao || null;
        }
        if (row.valor_requisicao !== undefined) {
          payload.VALOR_REQUISICAO = valorRequisicao;
        }
        if (row.gasto_total !== undefined) {
          payload.GASTO_TOTAL = gastoTotal;
        }
        if (row.marca !== undefined) {
          payload.MARCA_MODELO = row.marca || null;
        }
        
        // SEMPRE ENVIAR NOVO_APONTAMENTO='N' para marcar como "não novo"
        payload.NOVO_APONTAMENTO = 'N';

        console.log('Valores convertidos:');
        console.log('  valorOS:', valorOS);
        console.log('  valorRequisicao:', valorRequisicao);
        console.log('  gastoTotal:', gastoTotal);
        
        console.log('Enviando payload completo:', payload);
        console.log('  ✓ REQUISICAO no payload:', payload.REQUISICAO);
        console.log('  ✓ VALOR_REQUISICAO no payload:', payload.VALOR_REQUISICAO);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        console.log('✅ Response status:', response.status, response.statusText);
        console.log('Response headers:', {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        });
        
        const responseData = await response.json();
        console.log('📥 Resposta completa do servidor:', responseData);

        if (!response.ok) {
          console.error('❌ ERRO NA RESPOSTA:', responseData.mensagem || response.statusText);
          throw new Error(`Erro ao salvar linha ${row.id}: ${responseData.mensagem || response.statusText}`);
        }
        
        console.log('✅ Linha salva com sucesso!');
      }

      console.log('=== SALVAMENTO COMPLETADO COM SUCESSO ===');
      
      // Atualizar apontamentos com os valores editados
      setApontamentos(prevApontamentos =>
        prevApontamentos.map(apt => {
          if (editedRows[apt.ID]) {
            return {
              ...apt,
              ORDEM_SERVICO: editedRows[apt.ID].ordem_servico !== undefined ? editedRows[apt.ID].ordem_servico : apt.ORDEM_SERVICO,
              VALOR_OS: editedRows[apt.ID].valor_os !== undefined ? editedRows[apt.ID].valor_os : apt.VALOR_OS,
              REQUISICAO: editedRows[apt.ID].requisicao !== undefined ? editedRows[apt.ID].requisicao : apt.REQUISICAO,
              VALOR_REQUISICAO: editedRows[apt.ID].valor_requisicao !== undefined ? editedRows[apt.ID].valor_requisicao : apt.VALOR_REQUISICAO,
              GASTO_TOTAL: editedRows[apt.ID].gasto_total !== undefined ? editedRows[apt.ID].gasto_total : apt.GASTO_TOTAL,
              MARCA_MODELO: editedRows[apt.ID].marca !== undefined ? editedRows[apt.ID].marca : apt.MARCA_MODELO,
              NOVO_APONTAMENTO: 'N'
            };
          }
          return apt;
        })
      );

      // Limpar estados após salvar
      setEditedRows({});
      setGastosData({});
      // Remover dos novos apenas os que foram salvos
      setNewApontamentos(prev => {
        const newSet = new Set(prev);
        Object.keys(editedRows).forEach(id => newSet.delete(parseInt(id)));
        return newSet;
      });
      setSaveNotificationMessage('Dados salvos com sucesso!');
      setSaveNotificationIsError(false);
      setShowSaveNotification(true);
      setTimeout(() => setShowSaveNotification(false), 4000);
    } catch (error) {
      console.error('=== ERRO AO SALVAR ===');
      console.error('Erro completo:', error);
      console.error('Stack:', error.stack);
      setSaveNotificationMessage(`Erro ao salvar as alterações: ${error.message}`);
      setSaveNotificationIsError(true);
      setShowSaveNotification(true);
    }
  }, [editedRows, apontamentos]);

  // Função para formatar número como moeda (ex: 2444 → 2.444,00)
  const formatarMoeda = (valor) => {
    if (!valor) return '';
    const num = parseFloat(valor.toString().replace(',', '.'));
    if (isNaN(num)) return valor;
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Função para validar se todos os dados estão preenchidos
  const isApontamentoCompleto = useCallback((item) => {
    // Verificar se os valores atuais (editedRows OU os valores do item) estão preenchidos
    const ordemServico = editedRows[item.ID]?.ordem_servico ?? item.ORDEM_SERVICO;
    const valorOS = editedRows[item.ID]?.valor_os ?? item.VALOR_OS;
    const requisicao = editedRows[item.ID]?.requisicao ?? item.REQUISICAO;
    const valorRequisicao = editedRows[item.ID]?.valor_requisicao ?? item.VALOR_REQUISICAO;
    const marca = editedRows[item.ID]?.marca ?? item.MARCA_MODELO;

    // Todos os campos precisam estar preenchidos
    return (
      ordemServico && 
      ordemServico.toString().trim() !== '' &&
      valorOS && 
      valorOS.toString().trim() !== '' &&
      requisicao && 
      requisicao.toString().trim() !== '' &&
      valorRequisicao && 
      valorRequisicao.toString().trim() !== '' &&
      marca && 
      marca.toString().trim() !== ''
    );
  }, [editedRows]);

  // Handler para marcar como concluído
  const handleMarcarConcluido = useCallback((apontamentoId) => {
    const apt = apontamentos.find(a => a.ID === apontamentoId);
    
    // Se já está concluído, permitir desmarcar diretamente
    if (apt.CONCLUIDO === 'S' || apt.CONCLUIDO === true) {
      setApontamentoParaConcluir(apt);
      setShowConcluirNotification(true);
      return;
    }
    
    // Validar se está completo antes de marcar
    if (!isApontamentoCompleto(apt)) {
      setSaveNotificationMessage('Preencha todos os campos antes de finalizar!');
      setSaveNotificationIsError(true);
      setShowSaveNotification(true);
      return;
    }

    setApontamentoParaConcluir(apt);
    setShowConcluirNotification(true);
  }, [apontamentos, isApontamentoCompleto]);

  // Handler para confirmar conclusão
  const confirmConcluir = useCallback(async () => {
    if (!apontamentoParaConcluir) return;

    try {
      const isDesmarcar = apontamentoParaConcluir.CONCLUIDO === 'S' || apontamentoParaConcluir.CONCLUIDO === true;
      console.log(isDesmarcar ? '↩️ Desmarcando como concluído:' : '🏁 Marcando como concluído:', apontamentoParaConcluir.ID);
      
      const endpoint = import.meta.env.VITE_CRIAR_APONTAMENTO_POST;
      const payload = {
        ID: apontamentoParaConcluir.ID,
        NBOLETIM: apontamentoParaConcluir.NBOLETIM,
        CONCLUIDO: isDesmarcar ? 'N' : 'S'
      };

      console.log('Enviando payload:', payload);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      console.log('Resposta:', responseData);

      if (!response.ok) {
        throw new Error(responseData.mensagem || 'Erro ao atualizar status');
      }

      // Atualizar state local
      setApontamentos(prev =>
        prev.map(apt =>
          apt.ID === apontamentoParaConcluir.ID
            ? { ...apt, CONCLUIDO: isDesmarcar ? 'N' : 'S' }
            : apt
        )
      );

      setSaveNotificationMessage(
        isDesmarcar 
          ? 'OS reabrida para edição!' 
          : 'OS finalizada com sucesso!'
      );
      setSaveNotificationIsError(false);
      setShowSaveNotification(true);
      setTimeout(() => setShowSaveNotification(false), 4000);
      setShowConcluirNotification(false);
      setApontamentoParaConcluir(null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setSaveNotificationMessage(`Erro: ${error.message}`);
      setSaveNotificationIsError(true);
      setShowSaveNotification(true);
      setShowConcluirNotification(false);
    }
  }, [apontamentoParaConcluir, apontamentos]);

  // Handler para abrir modal de confirmação de exportação
  const handleExportGastos = useCallback(() => {
    setShowExportModal(true);
  }, []);

  // Handler para confirmar exportação
  const confirmExport = useCallback((exportarSelecionados = false) => {
    // Exportar apenas linhas selecionadas
    const linhasParaExportar = exportarSelecionados && selectedRows.size > 0
      ? apontamentos.filter(a => selectedRows.has(a.ID))
      : apontamentos;

    const dadosExportacao = linhasParaExportar.map(item => {
      const osEditada = editedRows[item.ID]?.ordem_servico ?? item.ORDEM_SERVICO ?? '';
      const valorOsEditado = formatarMoeda(editedRows[item.ID]?.valor_os ?? item.VALOR_OS ?? '');
      const requisicaoEditada = editedRows[item.ID]?.requisicao ?? item.REQUISICAO ?? '';
      const valorReqEditado = formatarMoeda(editedRows[item.ID]?.valor_requisicao ?? item.VALOR_REQUISICAO ?? '');
      const gastoTotalEditado = formatarMoeda(editedRows[item.ID]?.gasto_total ?? item.GASTO_TOTAL ?? '');
      const marcaEditada = editedRows[item.ID]?.marca ?? item.MARCA_MODELO ?? item.EQUIPAMENTO ?? '';

      return {
        'Unidade': item.UNIDADE || '',
        'Data da Ocorrência': item.DATA_OCORRIDO || '',
        'Frota': item.EQUIPAMENTO || '',
        'Marca/Modelo': marcaEditada,
        'Área': item.AREA || '',
        'Relato da Ocorrência': item.RELATO_COLABORADOR || '',
        'Número do BO': item.NBOLETIM || '',
        'Ocorrência': item.OCORRENCIA || '',
        'Ordem de Serviço': osEditada,
        'Ordem de Serviço (R$)': valorOsEditado,
        'Requisição': requisicaoEditada,
        'Requisição (R$)': valorReqEditado,
        'Gasto Total (R$)': gastoTotalEditado,
        'SAFRA': item.SAFRA || '',
        'Concluído': item.CONCLUIDO === 'S' ? '✓' : ''
      };
    });

    const nomeBase = exportarSelecionados 
      ? `Gastos_Acidentes_Selecionados_${new Date().toISOString().split('T')[0]}`
      : `Gastos_Acidentes_${new Date().toISOString().split('T')[0]}`;

    if (exportFormat === 'pdf') {
      const doc = new jsPDF({ orientation: 'l' });
      autoTable(doc, {
        head: [Object.keys(dadosExportacao[0] || {})],
        body: dadosExportacao.map(item => Object.values(item)),
        theme: 'grid',
        headStyles: { fillColor: [0, 73, 39], textColor: [255, 255, 255], fontStyle: 'bold' }
      });
      doc.save(`${nomeBase}.pdf`);
    } else if (exportFormat === 'csv') {
      const ws = XLSX.utils.json_to_sheet(dadosExportacao);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
      XLSX.writeFile(wb, `${nomeBase}.csv`);
    } else {
      // xlsx (padrão)
      const ws = XLSX.utils.json_to_sheet(dadosExportacao);
      ws['!cols'] = [
        { wch: 12 },  // Unidade
        { wch: 15 },  // Data
        { wch: 12 },  // Frota
        { wch: 20 },  // Marca
        { wch: 15 },  // Área
        { wch: 40 },  // Relato
        { wch: 12 },  // BO
        { wch: 20 },  // Ocorrência
        { wch: 15 },  // OS
        { wch: 15 },  // Valor OS
        { wch: 15 },  // Requisição
        { wch: 15 },  // Valor Req
        { wch: 15 },  // Gasto Total
        { wch: 12 },  // SAFRA
        { wch: 12 }   // Concluído
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
      XLSX.writeFile(wb, `${nomeBase}.xlsx`);
    }
    
    setShowExportModal(false);
  }, [apontamentos, editedRows, selectedRows, exportFormat]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-[#004927]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* TÍTULO PRINCIPAL COM BOTÃO DE EXPORTAR */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 mt-1 text-xs font-medium">Gerenciamento de gastos com acidentes, falhas operacionais e sinistros</p>
        </div>
        <button
          onClick={handleExportGastos}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-all text-sm font-bold mt-0"
        >
          <FileDown size={16} /> Exportar Gastos
        </button>
      </div>

      {/* SEÇÃO GASTOS COM ACIDENTE/FALHA/SINISTRO */}
      <div className="mt-2 space-y-4">
        <div className="flex justify-start items-center">
          <div className="flex gap-2">
            {Object.keys(editedRows).length > 0 && (
              <button
                onClick={handleSaveGastos}
                className="px-4 py-2 bg-[#004927] text-white hover:bg-[#003220] transition-all text-sm font-bold"
              >
                Salvar Alterações ({Object.keys(editedRows).length})
              </button>
            )}
          </div>
        </div>

        {/* NOTIFICAÇÃO DE CONCLUSÃO DE OS */}
        {showConcluirNotification && apontamentoParaConcluir && (
          <Notification
            title={apontamentoParaConcluir.CONCLUIDO === 'S' || apontamentoParaConcluir.CONCLUIDO === true ? "Reabrir OS" : "Finalizar OS"}
            message={
              apontamentoParaConcluir.CONCLUIDO === 'S' || apontamentoParaConcluir.CONCLUIDO === true
                ? `Deseja reabrir a OS ${apontamentoParaConcluir.NBOLETIM} para edição? Isso permitirá alterar os dados novamente.`
                : `Tem certeza que deseja finalizar a OS ${apontamentoParaConcluir.NBOLETIM}? Isso marcará a ordem de serviço como concluída e desabilitará as edições.`
            }
            actions={[
              {
                label: apontamentoParaConcluir.CONCLUIDO === 'S' || apontamentoParaConcluir.CONCLUIDO === true ? 'Reabrir' : 'Finalizar',
                onClick: confirmConcluir,
                variant: 'danger'
              },
              {
                label: 'Cancelar',
                onClick: () => {
                  setShowConcluirNotification(false);
                  setApontamentoParaConcluir(null);
                },
                variant: 'light'
              }
            ]}
          />
        )}

        {/* NOTIFICAÇÃO DE SALVAMENTO */}
        {showSaveNotification && (
          <Notification
            title={saveNotificationIsError ? "Erro ao Salvar" : "Sucesso"}
            message={saveNotificationMessage}
            onClose={() => setShowSaveNotification(false)}
          />
        )}

        {/* MODAL DE EXPORTAÇÃO */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white border border-slate-200 max-w-md w-full space-y-4">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-800">Exportar Dados</h3>
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

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Dados</label>
                  <div className="space-y-2">
                    {selectedRows.size > 0 && (
                      <button
                        onClick={() => confirmExport(true)}
                        className="w-full px-4 py-2 bg-[#004927] text-white hover:bg-[#003220] font-bold text-sm transition-all"
                      >
                        Exportar Selecionados ({selectedRows.size})
                      </button>
                    )}
                    <button
                      onClick={() => confirmExport(false)}
                      className="w-full px-4 py-2 bg-slate-600 text-white hover:bg-slate-700 font-bold text-sm transition-all"
                    >
                      Exportar Todos ({apontamentos.length})
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-full px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FILTRO DE BUSCA */}
        <div className="bg-white p-2 border border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <Search className="text-slate-400" size={16} />
            <input
              className="flex-1 px-2 py-1 border border-slate-200 outline-none bg-white transition-all text-sm font-medium text-slate-900 focus:border-[#004927] dashboard-input"
              placeholder="Pesquisar por Unidade, Colaborador, Área, BO ou Equipamento..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Filter size={16} className="text-slate-400" />
          </div>
          <div className="flex items-center gap-2 pl-6">
            <input
              type="checkbox"
              id="showConcluidos"
              checked={showConcluidos}
              onChange={e => setShowConcluidos(e.target.checked)}
              className="cursor-pointer"
            />
            <label htmlFor="showConcluidos" className="text-sm text-slate-700 cursor-pointer font-medium">
              Mostrar apontamentos concluídos
            </label>
          </div>
        </div>

        <div className="bg-white border-2 border-[#004927] overflow-hidden">
          {apontamentosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nenhum apontamento aprovado para registrar gastos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="overflow-y-auto" style={{maxHeight: '300px'}}>
              <table className="w-full text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-[#004927] text-white font-bold uppercase">
                    <th className="px-2 py-1 text-center border border-slate-300" style={{width: '30px'}}>
                      <input
                        type="checkbox"
                        checked={selectedRows.size === apontamentosFiltrados.length && apontamentosFiltrados.length > 0}
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                        title="Selecionar todos"
                      />
                    </th>
                    <th className="px-3 py-1 text-left">Unidade</th>
                    <th className="px-3 py-1 text-left">Data Ocorr.</th>
                    <th className="px-3 py-1 text-left">Frota</th>
                    <th className="px-3 py-1 text-left">Marca</th>
                    <th className="px-3 py-1 text-left">Área</th>
                    <th className="px-3 py-1 text-left max-w-xs">Relato</th>
                    <th className="px-3 py-1 text-left">BO</th>
                    <th className="px-3 py-1 text-left">Ocorrência</th>
                    <th className="px-3 py-1 text-left">Ordem de Serviço</th>
                    <th className="px-3 py-1 text-right">Valor OS (R$)</th>
                    <th className="px-3 py-1 text-left">Requisição</th>
                    <th className="px-3 py-1 text-right">Valor Req. (R$)</th>
                    <th className="px-3 py-1 text-right">Gasto Total (R$)</th>
                    <th className="px-3 py-1 text-left">SAFRA</th>
                    <th className="px-3 py-1 text-center">Concluído</th>
                    <th className="px-3 py-1 text-center">Visualizar</th>
                  </tr>
                </thead>
                <tbody>
                  {apontamentosFiltrados.map((item) => (
                    <tr key={item.ID} className={`border-b border-slate-300 hover:bg-slate-50 transition-colors ${newApontamentos.has(item.ID) ? 'pulse-green' : ''}`}>
                      <td className="px-2 py-1 text-center border border-slate-300">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(item.ID)}
                          onChange={() => toggleRowSelection(item.ID)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-1 text-slate-700 border border-slate-300">{item.UNIDADE || '-'}</td>
                      <td className="px-2 py-1 text-slate-700 border border-slate-300">{item.DATA_OCORRIDO || '-'}</td>
                      <td className="px-2 py-1 text-slate-700 border border-slate-300">{item.EQUIPAMENTO || '-'}</td>
                      <td className="px-2 py-1 border border-slate-300">
                        <input
                          type="text"
                          value={
                            editedRows[item.ID]?.marca !== undefined
                              ? editedRows[item.ID].marca
                              : (item.MARCA_MODELO || '')
                          }
                          onChange={(e) => handleEditGastoCell(item.ID, 'marca', e.target.value)}
                          disabled={item.CONCLUIDO === 'S' || item.CONCLUIDO === true}
                          className={`w-full px-1 py-1 border border-slate-300 text-xs text-slate-900 outline-none focus:border-2 focus:border-[#004927] dashboard-input ${
                            item.CONCLUIDO === 'S' || item.CONCLUIDO === true
                              ? 'bg-slate-100 cursor-not-allowed opacity-60'
                              : 'bg-white'
                          }`}
                          placeholder="Marca/Modelo"
                        />
                      </td>
                      <td className="px-2 py-1 text-slate-700 border border-slate-300">{item.AREA || '-'}</td>
                      <td className="px-2 py-1 text-slate-700 border border-slate-300 max-w-xs truncate" title={item.RELATO_COLABORADOR}>
                        {item.RELATO_COLABORADOR || '-'}
                      </td>
                      <td className="px-2 py-1 font-bold text-[#004927] border border-slate-300">{item.NBOLETIM || '-'}</td>
                      <td className="px-2 py-1 text-slate-700 border border-slate-300">{item.OCORRENCIA || '-'}</td>
                      {/* Campos Editáveis */}
                      <td className="px-2 py-1 border border-slate-300">
                        <input
                          type="text"
                          value={
                            editedRows[item.ID]?.ordem_servico !== undefined
                              ? editedRows[item.ID].ordem_servico
                              : (item.ORDEM_SERVICO || '')
                          }
                          onChange={(e) => handleEditGastoCell(item.ID, 'ordem_servico', e.target.value.toUpperCase())}
                          disabled={item.CONCLUIDO === 'S' || item.CONCLUIDO === true}
                          className={`w-full px-1 py-1 border border-slate-300 text-xs text-slate-900 outline-none focus:border-2 focus:border-[#004927] uppercase dashboard-input ${
                            item.CONCLUIDO === 'S' || item.CONCLUIDO === true
                              ? 'bg-slate-100 cursor-not-allowed opacity-60'
                              : 'bg-white'
                          }`}
                          placeholder="OS"
                        />
                      </td>
                      <td className="px-2 py-1 border border-slate-300">
                        <input
                          type="text"
                          value={
                            editedRows[item.ID]?.valor_os !== undefined
                              ? editedRows[item.ID].valor_os
                              : (item.VALOR_OS || '')
                          }
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9,]/g, '');
                            handleEditGastoCell(item.ID, 'valor_os', val);
                          }}
                          disabled={item.CONCLUIDO === 'S' || item.CONCLUIDO === true}
                          className={`w-full px-1 py-1 border border-slate-300 text-xs text-slate-900 outline-none focus:border-2 focus:border-[#004927] text-right dashboard-input ${
                            item.CONCLUIDO === 'S' || item.CONCLUIDO === true
                              ? 'bg-slate-100 cursor-not-allowed opacity-60'
                              : 'bg-white'
                          }`}
                          placeholder="0,00"
                        />
                      </td>
                      <td className="px-2 py-1 border border-slate-300">
                        <input
                          type="text"
                          value={
                            editedRows[item.ID]?.requisicao !== undefined
                              ? editedRows[item.ID].requisicao
                              : (item.REQUISICAO || '')
                          }
                          onChange={(e) => handleEditGastoCell(item.ID, 'requisicao', e.target.value.toUpperCase())}
                          disabled={item.CONCLUIDO === 'S' || item.CONCLUIDO === true}
                          className={`w-full px-1 py-1 border border-slate-300 text-xs text-slate-900 outline-none focus:border-2 focus:border-[#004927] uppercase dashboard-input ${
                            item.CONCLUIDO === 'S' || item.CONCLUIDO === true
                              ? 'bg-slate-100 cursor-not-allowed opacity-60'
                              : 'bg-white'
                          }`}
                          placeholder="REQ"
                        />
                      </td>
                      <td className="px-2 py-1 border border-slate-300">
                        <input
                          type="text"
                          value={
                            editedRows[item.ID]?.valor_requisicao !== undefined
                              ? editedRows[item.ID].valor_requisicao
                              : (item.VALOR_REQUISICAO || '')
                          }
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9,]/g, '');
                            handleEditGastoCell(item.ID, 'valor_requisicao', val);
                          }}
                          disabled={item.CONCLUIDO === 'S' || item.CONCLUIDO === true}
                          className={`w-full px-1 py-1 border border-slate-300 text-xs text-slate-900 outline-none focus:border-2 focus:border-[#004927] text-right dashboard-input ${
                            item.CONCLUIDO === 'S' || item.CONCLUIDO === true
                              ? 'bg-slate-100 cursor-not-allowed opacity-60'
                              : 'bg-white'
                          }`}
                          placeholder="0,00"
                        />
                      </td>
                      <td className="px-2 py-1 border border-slate-300">
                        <input
                          type="text"
                          value={
                            editedRows[item.ID]?.gasto_total !== undefined
                              ? formatarMoeda(editedRows[item.ID].gasto_total)
                              : formatarMoeda(item.GASTO_TOTAL)
                          }
                          disabled={true}
                          className="w-full px-1 py-1 border border-slate-300 text-xs text-slate-900 outline-none focus:border-2 focus:border-[#004927] text-right font-bold bg-slate-100 cursor-not-allowed dashboard-input"
                          placeholder="0,00"
                        />
                      </td>
                      <td className="px-2 py-1 text-slate-700 border border-slate-300">{item.SAFRA || '-'}</td>
                      <td className="px-2 py-1 text-center border border-slate-300">
                        <input
                          type="checkbox"
                          checked={item.CONCLUIDO === 'S' || item.CONCLUIDO === true}
                          onChange={() => handleMarcarConcluido(item.ID)}
                          disabled={!isApontamentoCompleto(item) && item.CONCLUIDO !== 'S'}
                          className={`cursor-pointer ${(!isApontamentoCompleto(item) && item.CONCLUIDO !== 'S') ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={
                            item.CONCLUIDO === 'S' || item.CONCLUIDO === true
                              ? 'Clique para reabrir e editar'
                              : isApontamentoCompleto(item) 
                              ? 'Clique para finalizar' 
                              : 'Preencha: OS, Valor OS, Requisição, Valor Req. e Marca'
                          }
                        />
                      </td>
                      <td className="px-2 py-1 text-center border border-slate-300">
                        <button
                          onClick={() => {
                            setApontamentoSelecionado(normalizarApontamento(item));
                            setShowVisualizacao(true);
                          }}
                          className="text-slate-600 hover:text-[#004927] transition-colors"
                          title="Visualizar detalhes"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO DO APONTAMENTO */}
      <BoletimVisualizacao 
        isOpen={showVisualizacao} 
        onClose={() => {
          setShowVisualizacao(false);
          setApontamentoSelecionado(null);
        }} 
        apontamento={apontamentoSelecionado}
      />
    </div>
  );
}
