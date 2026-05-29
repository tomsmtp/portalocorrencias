import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { isSupervisor } from '../lib/roles';
import { apiCriarApontamento, apiAtualizarApontamento, handleApiError } from '../lib/apiService';
import { useAlert } from '../context/AlertContext';

/**
 * Modal com MÚLTIPLAS PÁGINAS para Visitante CRIAR apontamento
 * Também funciona para EDITAR apontamentos que foram rejeitados
 * Página 1: Dados Gerais
 * Página 2: Dados Colaborador
 */
export function ApontamentosModalCriar({ isOpen, onClose, onSuccess, user, apontamento }) {
  const isEditMode = !!apontamento;
  const isBlockedByGerente = isEditMode && apontamento?.status === 'pendente_gerente';
  const canEdit = !isBlockedByGerente;
  const userIsSupervisor = isSupervisor(user?.cargo);
  const alert = useAlert();
  
  // Supervisor pode preencher tudo ao criar. Visitante não pode preencher conclusão/assinatura.
  const canEditSupervisorFields = userIsSupervisor;
  
  const modalRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    // Auto-preenchidos
    NBOLETIM: '',
    COLABORADOR: user?.nome || '',
    SUPERVISOR: '',
    EMAIL_SUPERVISOR: '',
    
    // Página 1: Dados Gerais
    OCORRENCIA: '',
    DATA_OCORRIDO: new Date().toISOString().split('T')[0],
    LOCAL: '',
    DATA_PORTARIA: new Date().toISOString().split('T')[0],
    MUNICIPIO: '',
    UNIDADE: '',
    ELABORADO_POR: user?.nome || '',
    EQUIPAMENTO: '',
    FROTA: '',
    SAFRA: '',
    
    // Página 2: Dados Colaborador
    RG: '',
    MATRICULA: '',
    CPF: '',
    DATA_ADMISSAO: '',
    NCNH: '',
    AREA: '',
    VALIDADE_CNH: '',
    FUNCAO: '',
    CATEGORIA_CNH: '',
    TELEFONE: '',
    RELATO_COLABORADOR: '',
    RELATO_SUPERIOR: '',
    ASSINATURA_SUPERVISOR: ''
  });
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [ocorrenciaCustomizada, setOcorrenciaCustomizada] = useState('');
  const [loadingAlertId, setLoadingAlertId] = useState(null);
  const [conclusoes, setConclusoes] = useState({
    falha_operacional: false,
    condicao_insegura: false,
    falha_mecanica: false,
    condicao_adversa: false,
    causa_desconhecida: false
  });

  // Gerar número de B.O. automático quando modal abre
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && apontamento) {
        // Modo EDIÇÃO: carregar TODOS os dados do apontamento do banco
        setFormData({
          NBOLETIM: apontamento.nboletim || '',
          COLABORADOR: apontamento.colaborador || user?.nome || '',
          SUPERVISOR: apontamento.supervisor || user?.nome || '',
          EMAIL_SUPERVISOR: apontamento.email_supervisor || apontamento.EMAIL_SUPERVISOR || '',
          OCORRENCIA: apontamento.ocorrencia || '',
          DATA_OCORRIDO: apontamento.data_ocorrido ? apontamento.data_ocorrido.replace(' ', 'T') : new Date().toISOString().slice(0, 16),
          LOCAL: apontamento.local || '',
          DATA_PORTARIA: apontamento.data_portaria?.split('T')[0] || new Date().toISOString().split('T')[0],
          MUNICIPIO: apontamento.municipio || '',
          UNIDADE: apontamento.unidade || '',
          ELABORADO_POR: apontamento.elaborado_por || user?.nome || '',
          EQUIPAMENTO: apontamento.equipamento || '',
          FROTA: apontamento.frota || apontamento.FROTA || '',
          SAFRA: apontamento.safra || apontamento.SAFRA || '',
          RG: apontamento.rg || '',
          MATRICULA: apontamento.matricula || user?.matricula || '',
          CPF: apontamento.cpf || '',
          DATA_ADMISSAO: apontamento.data_admissao?.split('T')[0] || '',
          NCNH: apontamento.ncnh || '',
          AREA: apontamento.area || '',
          VALIDADE_CNH: apontamento.validade_cnh?.split(/[T\s]/)[0] || '',
          FUNCAO: apontamento.funcao || '',
          CATEGORIA_CNH: apontamento.categoria_cnh || '',
          TELEFONE: apontamento.telefone || '',
          RELATO_COLABORADOR: apontamento.relato_colaborador || '',
          RELATO_SUPERIOR: apontamento.relato_superior || '',
          ASSINATURA_SUPERVISOR: apontamento.assinatura_supervisor || ''
        });

        // Verificar se a ocorrência é uma das padrões
        const ocorrenciasPadrao = ['AVARIAS DIVERSAS', 'COLISÃO', 'INCÊNDIO', 'TOMBAMENTO', 'DANO', 'FURTO'];
        if (apontamento.ocorrencia && !ocorrenciasPadrao.includes(apontamento.ocorrencia)) {
          setOcorrenciaCustomizada(apontamento.ocorrencia);
        } else {
          setOcorrenciaCustomizada('');
        }

        // Carregar as conclusões se existirem
        const conclusaoCausa = apontamento.conclusao_causa || '';
        setConclusoes({
          falha_operacional: conclusaoCausa.includes('Falha operacional'),
          condicao_insegura: conclusaoCausa.includes('Condição insegura'),
          falha_mecanica: conclusaoCausa.includes('Falha mecânica'),
          condicao_adversa: conclusaoCausa.includes('Condição adversa'),
          causa_desconhecida: conclusaoCausa.includes('Causa desconhecida')
        });
      } else {
        // Modo CRIAR: gerar novo B.O. com campos vazios
        const gerarNumeroBo = () => {
          const randomNum = Math.floor(Math.random() * 900000) + 1000000;
          return `BO-${randomNum}-`;
        };

        // Formulário completamente limpo para novo apontamento
        setFormData({
          NBOLETIM: gerarNumeroBo(),
          COLABORADOR: '',
          SUPERVISOR: '',
          EMAIL_SUPERVISOR: '',
          OCORRENCIA: '',
          DATA_OCORRIDO: new Date().toISOString().slice(0, 16),
          LOCAL: '',
          DATA_PORTARIA: new Date().toISOString().split('T')[0],
          MUNICIPIO: '',
          UNIDADE: '',
          ELABORADO_POR: user?.nome || '',
          EQUIPAMENTO: '',
          FROTA: '',
          SAFRA: '',
          RG: '',
          MATRICULA: '',
          CPF: '',
          DATA_ADMISSAO: '',
          NCNH: '',
          AREA: '',
          VALIDADE_CNH: '',
          FUNCAO: '',
          CATEGORIA_CNH: '',
          TELEFONE: '',
          RELATO_COLABORADOR: '',
          RELATO_SUPERIOR: ''
        });
      }
      setCurrentPage(1);
    }
  }, [isOpen, apontamento, isEditMode]);

  useEffect(() => {
    // Resetar estado quando modal abre/fecha
    if (!isOpen) {
      setLoading(false);
      setIsSubmitting(false);
      setCurrentPage(1);
      setShowConfirmDialog(false);
      setOcorrenciaCustomizada('');
      setLoadingAlertId(null);
      setConclusoes({
        falha_operacional: false,
        condicao_insegura: false,
        falha_mecanica: false,
        condicao_adversa: false,
        causa_desconhecida: false
      });
      setFormData(prev => ({
        ...prev,
        ASSINATURA_SUPERVISOR: '',
        RELATO_SUPERIOR: ''
      }));
    }
  }, [isOpen]);

  // Rolar para topo quando modal abre ou página muda
  useEffect(() => {
    if (isOpen && modalRef.current) {
      setTimeout(() => {
        modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        modalRef.current.scrollTop = 0; // Resetar scroll interno do modal
      }, 0);
    }
  }, [isOpen, currentPage]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Campos de assinatura SEMPRE em maiúscula
    if (name === 'ASSINATURA_SUPERVISOR') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }
    
    // Campos que devem ser convertidos para MAIÚSCULA
    const camposMaiuscula = ['FUNCAO', 'AREA', 'CATEGORIA_CNH', 'LOCAL', 'MUNICIPIO', 'OCORRENCIA', 'EQUIPAMENTO', 'COLABORADOR', 'RG', 'CPF', 'TELEFONE', 'NCNH', 'ELABORADO_POR', 'SUPERVISOR', 'FROTA', 'SAFRA', 'RELATO_COLABORADOR', 'RELATO_SUPERIOR', 'UNIDADE', 'OBSERVACOES_SUPERVISOR'];
    const valorFinal = camposMaiuscula.includes(name) ? value.toUpperCase() : value;
    
    // Se mudou a UNIDADE (apenas em modo de criação), regenera o NBOLETIM
    if (name === 'UNIDADE' && valorFinal && !isEditMode) {
      const randomNum = Math.floor(Math.random() * 90000) + 10000;
      const novoNBOLETIM = `BO-${randomNum}-${valorFinal}`;
      setFormData(prev => ({ 
        ...prev, 
        [name]: valorFinal,
        NBOLETIM: novoNBOLETIM
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: valorFinal }));
    }
  }, [isEditMode]);

  const handleOcorrenciaChange = (e) => {
    const value = e.target.value;
    if (value === 'OUTROS') {
      setFormData(prev => ({ ...prev, OCORRENCIA: 'OUTROS' }));
      setOcorrenciaCustomizada('');
    } else {
      setFormData(prev => ({ ...prev, OCORRENCIA: value }));
      setOcorrenciaCustomizada('');
    }
  };

  const handleOcorrenciaCustomizada = (e) => {
    const value = e.target.value.toUpperCase();
    setOcorrenciaCustomizada(value);
    setFormData(prev => ({ ...prev, OCORRENCIA: value }));
  };

  if (!isOpen) return null;

  const handleCheckboxChange = (key) => {
    setConclusoes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const goToNextPage = () => { 
    // CAMPOS OBRIGATORIOS DADOS GERAIS
    const camposObrigatorios = [
        { key: 'LOCAL', label: 'Local é obrigatório' },
        { key: 'MUNICIPIO', label: 'Município é obrigatório' },
        { key: 'UNIDADE', label: 'Unidade é obrigatória' },
        { key: 'OCORRENCIA', label: 'Ocorrência é obrigatória' },
        { key: 'EQUIPAMENTO', label: 'Equipamento é obrigatório' },
        { key: 'DATA_PORTARIA', label: 'Data/Portaria é obrigatória' },
        { key: 'ELABORADO_POR', label: 'Elaborado por é obrigatório' },
        { key: 'SUPERVISOR', label: 'Supervisor é obrigatório' },
        { key: 'EMAIL_SUPERVISOR', label: 'Email do Supervisor é obrigatório' },
        { key: 'FROTA', label: 'Frota é obrigatória' },
        { key: 'SAFRA', label: 'Safra é obrigatória' }
    ];

    if (currentPage === 1) {
        for (const campos of camposObrigatorios) {
        if (!(formData[campos.key] || '').trim()) {
                alert.error(campos.label);
                return;
                }
            }
            setCurrentPage(2);
        }
    };

  const resetForm = () => {
    setFormData({
      NBOLETIM: '',
      COLABORADOR: '',
      SUPERVISOR: '',
      OCORRENCIA: '',
      DATA_OCORRIDO: new Date().toISOString().slice(0, 16),
      LOCAL: '',
      DATA_PORTARIA: new Date().toISOString().split('T')[0],
      MUNICIPIO: '',
      UNIDADE: '',
      ELABORADO_POR: '',
      EQUIPAMENTO: '',
      RG: '',
      MATRICULA: '',
      CPF: '',
      DATA_ADMISSAO: '',
      NCNH: '',
      AREA: '',
      VALIDADE_CNH: '',
      FUNCAO: '',
      CATEGORIA_CNH: '',
      TELEFONE: '',
      RELATO_COLABORADOR: '',
      RELATO_SUPERIOR: ''
    });
  };

  const goToPreviousPage = () => {
    setCurrentPage(1);
  };

  const handleConfirmPending = async () => {
    // Fechar dialog de confirmação
    setShowConfirmDialog(false);
    
    // Evitar dupla submissão
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    const alertId = alert.info('Enviando dados pendentes... Aguarde.', 0);

    // Timeout de segurança: remover alerta após 60 segundos (se ainda estiver preso)
    const safetyTimeout = setTimeout(() => {
      if (alertId) {
        alert.removeAlert(alertId);
        console.warn('Alerta de envio removido por timeout de segurança');
      }
    }, 60000);

    // Usar PUT para edição, POST para criação
    const isEditMode2 = isEditMode && apontamento && apontamento.nboletim;
    let endpoint = isEditMode2 
      ? import.meta.env.VITE_ATUALIZAR_APONTAMENTO_PUT
      : import.meta.env.VITE_CRIAR_APONTAMENTO_POST;
    
    // Se é UPDATE, adicionar o ID do apontamento à URL
    if (isEditMode2) {
      endpoint = `${endpoint}${apontamento.nboletim}/`;
    }
    
    if (!endpoint) {
      alert.error('Endpoint não configurado');
      setIsSubmitting(false);
      setLoading(false);
      return;
    }

    const dataToSend = {
      NBOLETIM: formData.NBOLETIM,
      COLABORADOR: formData.COLABORADOR,
      SUPERVISOR: formData.SUPERVISOR,
      EMAIL_SUPERVISOR: formData.EMAIL_SUPERVISOR,
      DATA_OCORRIDO: formData.DATA_OCORRIDO,
      LOCAL: formData.LOCAL,
      MUNICIPIO: formData.MUNICIPIO,
      UNIDADE: formData.UNIDADE || '',
      AREA: formData.AREA,
      OCORRENCIA: formData.OCORRENCIA || '',
      DATA_PORTARIA: formData.DATA_PORTARIA || '',
      EQUIPAMENTO: formData.EQUIPAMENTO || '',
      FROTA: formData.FROTA || '',
      SAFRA: formData.SAFRA || '',
      ELABORADO_POR: formData.ELABORADO_POR || '',
      RG: formData.RG || '',
      MATRICULA: formData.MATRICULA || '',
      CPF: formData.CPF || '',
      DATA_ADMISSAO: formData.DATA_ADMISSAO || '',
      NCNH: formData.NCNH || '',
      VALIDADE_CNH: formData.VALIDADE_CNH || '',
      FUNCAO: formData.FUNCAO || '',
      CATEGORIA_CNH: formData.CATEGORIA_CNH || '',
      TELEFONE: formData.TELEFONE || '',
      RELATO_COLABORADOR: formData.RELATO_COLABORADOR || '',
      RELATO_SUPERIOR: formData.RELATO_SUPERIOR || '',
      // Conclusões do Investigador (pode estar vazia)
      CONCLUSAO_CAUSA: (() => {
        const conclusoesSelecionadas = [];
        if (conclusoes.falha_operacional) conclusoesSelecionadas.push('Falha operacional');
        if (conclusoes.condicao_insegura) conclusoesSelecionadas.push('Condição insegura');
        if (conclusoes.falha_mecanica) conclusoesSelecionadas.push('Falha mecânica');
        if (conclusoes.condicao_adversa) conclusoesSelecionadas.push('Condição adversa/tempo');
        if (conclusoes.causa_desconhecida) conclusoesSelecionadas.push('Causa desconhecida/furto/outro');
        return conclusoesSelecionadas.length > 0 ? conclusoesSelecionadas.join(', ') : '';
      })(),
      ASSINATURA_SUPERVISOR: formData.ASSINATURA_SUPERVISOR || '',
      // Se é edição, preservar status anteriores. Se é criação, marcar como novo
      ASSINADO_SUPERVISOR: (formData.ASSINATURA_SUPERVISOR || '').trim() ? 'S' : 'N',
      STATUS: 'pendente_supervisor',
      OBSERVACOES_SUPERVISOR: '',
      CRIADO_POR: user?.cargo || ''
    };

    try {
      let result;
      
      if (isEditMode2) {
        result = await apiAtualizarApontamento(apontamento.nboletim, dataToSend);
      } else {
        result = await apiCriarApontamento(dataToSend);
      }

      // Limpar timeout de segurança
      clearTimeout(safetyTimeout);

      // Remover alerta de "Enviando" 
      if (alertId) {
        alert.removeAlert(alertId);
      }

      // Se recebeu resposta (status 200), apenas fecha silenciosamente
      if (result) {
        if (onSuccess) await onSuccess();
        
        // Fechar modal após 1 segundo
        setTimeout(() => {
          setLoading(false);
          setIsSubmitting(false);
          onClose();
        }, 1000);
      } else {
        // Se não teve resposta, mostra alerta de sucesso
        alert.success('Apontamento salvo com sucesso!');
        if (onSuccess) await onSuccess();
        
        setTimeout(() => {
          setLoading(false);
          setIsSubmitting(false);
          onClose();
        }, 2000);
      }

    } catch (err) {
      console.error('Erro ao salvar:', err);
      // Limpar timeout de segurança
      clearTimeout(safetyTimeout);
      // Remover alerta de "Enviando" e mostrar erro
      if (alertId) {
        alert.removeAlert(alertId);
      }
      const errorMsg = handleApiError(err);
      alert.error(errorMsg);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Bloquear submissão se apontamento está aguardando gerente
    if (isEditMode && apontamento?.status === 'pendente_gerente') {
      alert.error('Apontamento aguardando aprovação do gerente. Não é possível editar.');
      return;
    }

    if (currentPage === 2) {
    const camposcolaborador = [
        { key: 'COLABORADOR', label: 'Colaborador é obrigatório' },
        { key: 'RG', label: 'RG é obrigatório' },
        { key: 'MATRICULA', label: 'Matrícula é obrigatória' },
        { key: 'CPF', label: 'CPF é obrigatório' },
        { key: 'DATA_ADMISSAO', label: 'Data de Admissão é obrigatória' },
        { key: 'NCNH', label: 'Nº CNH é obrigatório' },
        { key: 'AREA', label: 'Área é obrigatória' },
        { key: 'VALIDADE_CNH', label: 'Validade CNH é obrigatória' },
        { key: 'FUNCAO', label: 'Função é obrigatória' },
        { key: 'CATEGORIA_CNH', label: 'Categoria CNH é obrigatória' },
        { key: 'TELEFONE', label: 'Telefone é obrigatório' },
        { key: 'RELATO_COLABORADOR', label: 'Relato Colaborador é obrigatório' },
         {key: 'ELABORADO_POR', label: 'Elaborado por é obrigatório' },
        { key: 'FROTA', label: 'Frota é obrigatória' },
        { key: 'SAFRA', label: 'Safra é obrigatória' }
    ];

    for (const campo of camposcolaborador) {
        const valor = formData[campo.key];

        if (typeof valor === 'string') {
        if (!(valor || '').trim()) {
            alert.error(campo.label);
            return;
        }
        }
    }

    // Verificar se faltam campos de Análise do Supervisor (apenas se for supervisor)
    // Visitantes não precisam preencher esses campos
    if (userIsSupervisor) {
      const faltaAssinatura = !(formData.ASSINATURA_SUPERVISOR || '').trim();
      const faltaRelato = !(formData.RELATO_SUPERIOR || '').trim();
      const faltaConclusao = Object.values(conclusoes).every(v => !v);
      
      if (faltaAssinatura || faltaRelato || faltaConclusao) {
        // Mostrar confirmação em vez de bloquear
        setShowConfirmDialog(true);
        return;
      }
    }
    }
    setIsSubmitting(true);
    setLoading(true);
    const alertId = alert.info('Enviando dados... Aguarde.', 0);

    // Timeout de segurança: remover alerta após 60 segundos (se ainda estiver preso)
    const safetyTimeout = setTimeout(() => {
      if (alertId) {
        alert.removeAlert(alertId);
        console.warn('Alerta de envio removido por timeout de segurança');
      }
    }, 60000);

    // Usar PUT para edição, POST para criação
    const isEditMode3 = isEditMode && apontamento && apontamento.nboletim;
    let endpoint = isEditMode3 
      ? import.meta.env.VITE_ATUALIZAR_APONTAMENTO_PUT
      : import.meta.env.VITE_CRIAR_APONTAMENTO_POST;
    
    // Se é UPDATE, adicionar o ID do apontamento à URL
    if (isEditMode3) {
      endpoint = `${endpoint}${apontamento.nboletim}/`;
    }
    
    if (!endpoint) {
      alert.error('Endpoint não configurado');
      setIsSubmitting(false);
      setLoading(false);
      return;
    }

    const dataToSend = {
      NBOLETIM: formData.NBOLETIM,
      COLABORADOR: formData.COLABORADOR,
      SUPERVISOR: formData.SUPERVISOR,
      EMAIL_SUPERVISOR: formData.EMAIL_SUPERVISOR,
      DATA_OCORRIDO: formData.DATA_OCORRIDO,
      LOCAL: formData.LOCAL,
      MUNICIPIO: formData.MUNICIPIO,
      UNIDADE: formData.UNIDADE || '',
      AREA: formData.AREA,
      OCORRENCIA: formData.OCORRENCIA || '',
      DATA_PORTARIA: formData.DATA_PORTARIA || '',
      EQUIPAMENTO: formData.EQUIPAMENTO || '',
      FROTA: formData.FROTA || '',
      SAFRA: formData.SAFRA || '',
      ELABORADO_POR: formData.ELABORADO_POR || '',
      RG: formData.RG || '',
      MATRICULA: formData.MATRICULA || '',
      CPF: formData.CPF || '',
      DATA_ADMISSAO: formData.DATA_ADMISSAO || '',
      NCNH: formData.NCNH || '',
      VALIDADE_CNH: formData.VALIDADE_CNH || '',
      FUNCAO: formData.FUNCAO || '',
      CATEGORIA_CNH: formData.CATEGORIA_CNH || '',
      TELEFONE: formData.TELEFONE || '',
      RELATO_COLABORADOR: formData.RELATO_COLABORADOR || '',
      RELATO_SUPERIOR: formData.RELATO_SUPERIOR || '',
      // Conclusões do Investigador
      CONCLUSAO_CAUSA: (() => {
        const conclusoesSelecionadas = [];
        if (conclusoes.falha_operacional) conclusoesSelecionadas.push('Falha operacional');
        if (conclusoes.condicao_insegura) conclusoesSelecionadas.push('Condição insegura');
        if (conclusoes.falha_mecanica) conclusoesSelecionadas.push('Falha mecânica');
        if (conclusoes.condicao_adversa) conclusoesSelecionadas.push('Condição adversa/tempo');
        if (conclusoes.causa_desconhecida) conclusoesSelecionadas.push('Causa desconhecida/furto/outro');
        return conclusoesSelecionadas.length > 0 ? conclusoesSelecionadas.join(', ') : '';
      })(),
      ASSINATURA_SUPERVISOR: formData.ASSINATURA_SUPERVISOR || '',
      // Se é edição, preservar status anteriores. Se é criação, marcar como novo
      ASSINADO_SUPERVISOR: (formData.ASSINATURA_SUPERVISOR || '').trim() ? 'S' : 'N',
      ASSINADO_GERENTE: isEditMode ? (apontamento?.assinado_gerente ? 'S' : 'N') : 'N',
      STATUS_SUPERVISOR: isEditMode ? (apontamento?.status_supervisor || 'N') : 'N',
      STATUS: 'pendente_supervisor',
      OBSERVACOES_SUPERVISOR: '', // Limpar observações quando colaborador corrige
      CRIADO_POR: user?.cargo || '' // Preencher nível do usuário que criou (supervisor ou comum)
    };

    try {
      let result;
      
      if (isEditMode3) {
        result = await apiAtualizarApontamento(apontamento.nboletim, dataToSend);
      } else {
        result = await apiCriarApontamento(dataToSend);
      }

      // Limpar timeout de segurança
      clearTimeout(safetyTimeout);

      // Remover alerta de "Enviando"
      if (alertId) {
        alert.removeAlert(alertId);
      }

      // Se recebeu resposta (status 200), apenas fecha silenciosamente
      if (result) {
        if (onSuccess) await onSuccess();
        
        // Fechar modal após 1 segundo
        setTimeout(() => {
          setLoading(false);
          setIsSubmitting(false);
          onClose();
        }, 1000);
      } else {
        // Se não teve resposta, mostra alerta de sucesso
        const mensagem = isEditMode ? "Apontamento atualizado com sucesso!" : "Apontamento criado com sucesso!";
        alert.success(mensagem);
        if (onSuccess) await onSuccess();
        
        setTimeout(() => {
          setLoading(false);
          setIsSubmitting(false);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      // Limpar timeout de segurança
      clearTimeout(safetyTimeout);
      // Remover alerta de "Enviando" e mostrar erro
      if (alertId) {
        alert.removeAlert(alertId);
      }
      const errorMsg = handleApiError(err);
      alert.error(errorMsg);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 overflow-y-auto">
      <div ref={modalRef} className="bg-[#0f172a] w-full max-w-2xl max-h-[95vh] overflow-y-auto relative border border-slate-700">
        {/* OVERLAY DE CARREGAMENTO */}
        {loading && (
          <div className="absolute inset-0 bg-[#0f172a]/80 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="animate-spin text-[#004927]" />
              <p className="text-lg font-bold text-slate-300">
                {isEditMode ? 'Atualizando apontamento...' : 'Criando apontamento...'}
              </p>
              <p className="text-sm text-slate-500">Por favor, aguarde...</p>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-[#004927] sticky top-0">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isEditMode ? 'Editar Apontamento' : 'Criar Apontamento'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">Página {currentPage} de 2</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6 text-slate-300">
          {/* ALERTA SE AGUARDANDO GERENTE */}
          {isEditMode && apontamento?.status === 'pendente_gerente' && (
            <div className="bg-red-900/20 border border-red-700 p-4">
              <p className="text-sm font-bold text-red-300">APONTAMENTO BLOQUEADO</p>
              <p className="text-xs text-red-300 mt-1">Este apontamento está aguardando aprovação do gerente e não pode ser editado no momento. Você será notificado quando mudar de status.</p>
            </div>
          )}

          {/* Alerta de Rejeição */}
          {isEditMode && apontamento?.observacoes_supervisor && (
            <div className="bg-amber-900/20 border-l-4 border-amber-600 p-4">
              <p className="text-sm font-bold text-amber-300 mb-2">Apontamento Devolvido para Revisão</p>
              <p className="text-sm text-amber-300 whitespace-pre-wrap font-medium">{apontamento.observacoes_supervisor}</p>
            </div>
          )}

          {/* Análise do Supervisor - apenas em modo edição */}
          {isEditMode && formData.RELATO_SUPERIOR && (
            <div className="bg-slate-700 border-l-4 border-blue-500 p-4">
              <p className="text-sm font-bold text-blue-300 mb-2">Análise do Supervisor</p>
              <p className="text-sm text-blue-300 whitespace-pre-wrap font-medium">{formData.RELATO_SUPERIOR}</p>
            </div>
          )}

          {/* DIALOG DE CONFIRMAÇÃO - Dados Pendentes */}
          {showConfirmDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
              <div className="bg-white p-8 shadow-2xl max-w-md mx-4">
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">!</div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Análise Incompleta</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Você não preencheu alguns campos da análise do supervisor:
                    </p>
                    <ul className="text-sm text-slate-300 space-y-1 mb-4">
                      {userIsSupervisor && !(formData.RELATO_SUPERIOR || '').trim() && <li>• Relato do Superior</li>}
                      {userIsSupervisor && Object.values(conclusoes).every(v => !v) && <li>• Conclusões</li>}
                      {userIsSupervisor && !(formData.ASSINATURA_SUPERVISOR || '').trim() && <li>• Assinatura</li>}
                    </ul>
                    <p className="text-sm font-semibold text-amber-700 bg-amber-900/20 p-2 mb-4">
                      Os dados ficarão marcados como PENDENTES e precisarão ser completados depois.
                    </p>
                    <p className="text-sm font-bold text-red-600 mb-4">
                      Você deverá entrar em contato com a Portaria para finalizar.
                    </p>
                    <p className="text-sm font-semibold text-blue-700 bg-slate-700 p-2 mb-4 border border-blue-200">
                      Salvar o número do B.O. para passar para Portaria depois caso precise:
                      <br />
                      <span className="text-base font-black text-blue-300">{formData.NBOLETIM}</span>
                    </p>
                  </div>
                </div>

                <p className="text-sm font-semibold text-white mb-6">
                  Deseja continuar mesmo assim?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
                  >
                    Não, voltar
                  </button>
                  <button
                    onClick={handleConfirmPending}
                    className="flex-1 px-4 py-2 bg-amber-900/200 text-white font-bold hover:bg-amber-600 transition-colors"
                  >
                    Sim, continuar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* B.O. Automático - sempre visível */}
          <div className="bg-slate-100 p-4 border border-slate-600">
            <p className="text-xs font-bold text-slate-500 uppercase">B.O. Número</p>
            <p className="text-2xl font-black text-[#004927]">{formData.NBOLETIM}</p>
          </div>

          {/* PÁGINA 1: DADOS GERAIS */}
          {currentPage === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Dados Gerais</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Ocorrência */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Ocorrência *</label>
                  <select
                    required
                    value={ocorrenciaCustomizada ? 'OUTROS' : formData.OCORRENCIA}
                    onChange={handleOcorrenciaChange}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                  >
                    <option value="">-- Selecione uma Ocorrência --</option>
                    <option value="AVARIAS DIVERSAS">AVARIAS DIVERSAS</option>
                    <option value="COLISÃO">COLISÃO</option>
                    <option value="INCÊNDIO">INCÊNDIO</option>
                    <option value="TOMBAMENTO">TOMBAMENTO</option>
                    <option value="DANO">DANO</option>
                    <option value="FURTO">FURTO</option>
                    <option value="OUTROS">OUTROS (Especificar)</option>
                  </select>
                </div>

                {/* Campo customizado para "OUTROS" */}
                {(formData.OCORRENCIA === 'OUTROS' || (formData.OCORRENCIA && !['AVARIAS DIVERSAS', 'COLISÃO', 'INCÊNDIO', 'TOMBAMENTO', 'DANO', 'FURTO'].includes(formData.OCORRENCIA))) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Digite a Ocorrência *</label>
                    <input
                      type="text"
                      value={ocorrenciaCustomizada}
                      onChange={handleOcorrenciaCustomizada}
                      maxLength="255"
                      required
                      className="w-full px-4 py-2 border border-blue-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927] uppercase"
                      placeholder="Digite o tipo de ocorrência"
                    />
                  </div>
                )}

                {/* Data Ocorrência */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Data da Ocorrência *</label>
                  <input
                    type="datetime-local"
                    name="DATA_OCORRIDO"
                    value={formData.DATA_OCORRIDO}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                  />
                </div>

                {/* Unidade */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Unidade *</label>
                    <select
                    name="UNIDADE"
                    value={formData.UNIDADE}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                    >
                      <option value=" ">-- Selecione uma Unidade --</option>
                      <option value="115">Maracaí</option>
                      <option value="112">Paraguaçu Paulista</option>
                      <option value="250">Anaurilândia</option>
                    </select>
                </div>

                {/* Local */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Local *</label>
                  <input
                    type="text"
                    name="LOCAL"
                    value={formData.LOCAL}
                    onChange={handleChange}
                    disabled={!canEdit}
                    required
                    maxLength="255"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927] uppercase disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400"
                    placeholder="Local do incidente"
                  />
                </div>

                {/* Data Apontamento/Portaria */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Data Apontamento/Portaria</label>
                  <input
                    type="date"
                    name="DATA_PORTARIA"
                    required
                    value={formData.DATA_PORTARIA}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                  />
                </div>

                {/* Município */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Município *</label>
                  <input
                    type="text"
                    name="MUNICIPIO"
                    value={formData.MUNICIPIO}
                    onChange={handleChange}
                    required
                    maxLength="100"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927] uppercase"
                    placeholder="Município"
                  />
                </div>

                {/* Equipamento */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Equipamento *</label>
                  <input
                    type="text"
                    name="EQUIPAMENTO"
                    value={formData.EQUIPAMENTO}
                    required
                    onChange={handleChange}
                    maxLength="100"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927] uppercase"
                    placeholder="Equipamento envolvido"
                  />
                </div>

                {/* Frota */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Frota</label>
                  <input
                    type="text"
                    name="FROTA"
                    value={formData.FROTA}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                    placeholder="Frota"
                  />
                </div>

                {/* Safra */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Safra</label>
                  <input
                    type="text"
                    name="SAFRA"
                    value={formData.SAFRA}
                    onChange={handleChange}
                    maxLength="20"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                    placeholder="Ex: 2024-2025"
                  />
                </div>
              </div>

              {/* Elaborado por */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Elaborado por</label>
                <input
                  type="text"
                  required
                  value={formData.ELABORADO_POR}
                  onChange={handleChange}
                  name="ELABORADO_POR"
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927] uppercase"
                />
              </div>

              {/* Supervisor */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Supervisor *</label>
                <input
                  type="text"
                  required
                  value={formData.SUPERVISOR}
                  onChange={handleChange}
                  name="SUPERVISOR"
                  maxLength="150"
                  placeholder="NOME DO SUPERVISOR"
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927] uppercase"
                />
              </div>

              {/* Email Supervisor */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email do Supervisor *</label>
                <input
                  type="email"
                  required
                  value={formData.EMAIL_SUPERVISOR}
                  onChange={handleChange}
                  name="EMAIL_SUPERVISOR"
                  maxLength="150"
                  placeholder="email@example.com"
                  className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                />
              </div>
            </div>
          )}

          {/* PÁGINA 2: DADOS COLABORADOR */}
          {currentPage === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Dados do Colaborador</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Colaborador */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Colaborador *</label>
                  <input
                    type="text"
                    name="COLABORADOR"
                    value={formData.COLABORADOR}
                    onChange={handleChange}
                    maxLength="150"
                    required
                    placeholder="NOME DO COLABORADOR"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927] uppercase"
                  />    
                </div>

                {/* RG */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">RG</label>
                  <input
                    type="number"
                    name="RG"
                    value={formData.RG}
                    onChange={handleChange}
                    maxLength="20"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                    placeholder="APENAS NUMEROS"
                  />
                </div>

                {/* Matrícula */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Matrícula</label>
                  <input
                    type="number"
                    name="MATRICULA"
                    value={formData.MATRICULA}
                    onChange={handleChange}
                    maxLength="10"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                    placeholder="APENAS NUMEROS"
                  />
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">CPF</label>
                  <input
                    type="number"
                    name="CPF"
                    value={formData.CPF}
                    onChange={handleChange}
                    maxLength="20"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                    placeholder="APENAS NUMEROS"
                  />
                </div>

                {/* Data Admissão */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Data de Admissão</label>
                  <input
                    type="date"
                    name="DATA_ADMISSAO"
                    value={formData.DATA_ADMISSAO}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                  />
                </div>

                {/* Nº CNH */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nº (CNH)</label>
                  <input
                    type="number"
                    name="NCNH"
                    value={formData.NCNH}
                    onChange={handleChange}
                    maxLength="20"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                    placeholder="APENAS NUMEROS"
                  />
                </div>

                {/* Área */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">SETOR *</label>
                  <input
                    type="text"
                    name="AREA"
                    value={formData.AREA}
                    onChange={handleChange}
                    required
                    maxLength="100"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927] uppercase"
                    placeholder="SETOR/DEPARTAMENTO"
                  />
                </div>

                {/* Validade CNH */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Validade (CNH)</label>
                  <input
                    type="date"
                    name="VALIDADE_CNH"
                    value={formData.VALIDADE_CNH}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                  />
                </div>

                {/* Função */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Função</label>
                  <input
                    type="text"
                    name="FUNCAO"
                    value={formData.FUNCAO}
                    onChange={handleChange}
                    maxLength="100"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927] uppercase"
                    placeholder="Função"
                  />
                </div>

                {/* Categoria CNH */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Categoria (CNH)</label>
                  <input
                    type="text"
                    name="CATEGORIA_CNH"
                    value={formData.CATEGORIA_CNH}
                    onChange={handleChange}
                    maxLength="7"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927] uppercase"
                    placeholder="A/B"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Telefone</label>
                  <input
                    type="tel"
                    name="TELEFONE"
                    value={formData.TELEFONE}
                    onChange={handleChange}
                    maxLength="20"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927] uppercase"
                    placeholder="DD+NUMERO ** APENAS NUMEROS"
                  />
                </div>

                {/* RELATO COLABORADOR */}
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Relato Colaborador</label>
                    <textarea
                    name="RELATO_COLABORADOR"
                    value={formData.RELATO_COLABORADOR}
                    onChange={handleChange}
                    placeholder="Descreva os detalhes da ocorrência conforme sua visão"
                    rows="4"
                    maxLength="4000"
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]"
                    />
                </div>

                {/* RELATO DO SUPERIOR - Sempre visível e editável */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Relato do Superior (Análise)</label>
                  <textarea
                    name="RELATO_SUPERIOR"
                    value={formData.RELATO_SUPERIOR}
                    onChange={handleChange}
                    rows="4"
                    maxLength="4000"
                    placeholder="Descreva a análise do superior sobre o ocorrido, mesmo que seja um relato inicial. Este campo é importante para documentar a visão do supervisor desde o início, e pode ser atualizado posteriormente conforme a investigação avança."
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 outline-none focus:border-[#004927] text-slate-300"
                  />
                </div>

                {/* ANÁLISE DO Supervisor - Conclusões (Checkboxes) */}
                <div className={`col-span-2 p-4 border ${canEditSupervisorFields ? 'bg-slate-700 border-blue-200' : 'bg-slate-100 border-slate-600'}`}>
                  <label className="block text-sm font-bold mb-3">
                    {canEditSupervisorFields ? (
                      'Conclusão (marque uma ou mais):'
                    ) : (
                      '🔒 Conclusão do Superior (preenchido pelo Supervisor)'
                    )}
                  </label>
                  {!canEditSupervisorFields && (
                    <p className="text-xs text-slate-500 mb-3">Este campo é preenchido apenas durante a análise do supervisor</p>
                  )}
                  
                  <div className={`space-y-2 ${!canEditSupervisorFields ? 'opacity-50' : ''}`}>
                    {[
                      { key: 'falha_operacional', label: 'Falha operacional' },
                      { key: 'condicao_insegura', label: 'Condição insegura' },
                      { key: 'falha_mecanica', label: 'Falha mecânica' },
                      { key: 'condicao_adversa', label: 'Condição adversa/tempo' },
                      { key: 'causa_desconhecida', label: 'Causa desconhecida/furto/outro' }
                    ].map(item => (
                      <label key={item.key} className={`flex items-center gap-3 ${canEditSupervisorFields ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <input
                          type="checkbox"
                          checked={conclusoes[item.key]}
                          onChange={() => canEditSupervisorFields && handleCheckboxChange(item.key)}
                          disabled={!canEditSupervisorFields}
                          className={`w-4 h-4 ${canEditSupervisorFields ? 'accent-[#004927]' : 'accent-slate-400'}`}
                        />
                        <span className={`text-sm ${canEditSupervisorFields ? 'text-slate-300' : 'text-slate-500'}`}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* ASSINATURA DO Supervisor */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    {canEditSupervisorFields ? (
                      'Assinatura do Supervisor *'
                    ) : (
                      '🔒 Assinatura do Supervisor (preenchida pelo Supervisor)'
                    )}
                  </label>
                  <input
                    type="text"
                    name="ASSINATURA_SUPERVISOR"
                    value={formData.ASSINATURA_SUPERVISOR}
                    onChange={canEditSupervisorFields ? handleChange : undefined}
                    disabled={!canEditSupervisorFields}
                    placeholder={canEditSupervisorFields ? "Digite seu nome completo" : "Este campo será preenchido durante a análise do supervisor"}
                    className={`w-full px-4 py-2 border outline-none font-bold ${
                      canEditSupervisorFields 
                        ? 'border-blue-300 bg-slate-700 focus:border-blue-600 text-white' 
                        : 'border-slate-600 bg-slate-700 cursor-not-allowed text-slate-300'
                    }`}
                  />
                </div>

              </div>
            </div>
          )}

          {/* Botões de Navegação */}
          <div className="flex gap-3 pt-4 border-t">
            {currentPage === 2 && (
              <button
                onClick={goToPreviousPage}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={18} /> Voltar
              </button>
            )}
            
            {currentPage === 1 && (
              <button
                onClick={goToNextPage}
                disabled={loading}
                className="ml-auto flex items-center gap-2 px-6 py-2 bg-[#004927] text-white font-medium hover:bg-[#003220] disabled:opacity-50 transition-colors"
              >
                Próxima <ChevronRight size={18} />
              </button>
            )}

            {currentPage === 2 && (
              <>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-6 py-2 bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || isBlockedByGerente}
                  className={`flex-1 px-6 py-2 font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${
                    isBlockedByGerente 
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                      : 'bg-[#004927] text-white hover:bg-[#003220]'
                  }`}
                  title={isBlockedByGerente ? 'Apontamento aguardando gerente' : 'Enviar apontamento'}
                >
                  {loading ? (isEditMode ? 'Atualizando...' : 'Criando...') : (isEditMode ? 'Atualizar Apontamento' : 'Criar Apontamento')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
