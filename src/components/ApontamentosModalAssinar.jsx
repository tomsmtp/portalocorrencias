import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { isVisitor } from '../lib/roles';
import { apiAtualizarApontamento, handleApiError } from '../lib/apiService';
import { useAlert } from '../context/AlertContext';

/**
 * Modal para SUPERVISOR revisar e aprovar apontamento
 * Se for VISITANTE: tudo read-only (visualização)
 * Se for SUPERVISOR: ver dados, aprovar (enviar pro gerente) ou rejeitar (devolver pro visitante)
 */
export function ApontamentosModalAssinar({ isOpen, onClose, apontamento, user, onSave }) {
  const isUserVisitor = isVisitor(user?.cargo);
  const alert = useAlert();
  const modalRef = useRef(null);
  
  // Verificar se é um novo apontamento (ainda não foi criado no banco)
  const isNewApontamento = !apontamento || !apontamento.nboletim;
  
  // Apontamento bloqueado se: cancelado OU já foi aprovado (status !== 'pendente_supervisor')
  const isBlocked = apontamento?.cancelado || (apontamento?.status && apontamento.status !== 'pendente_supervisor');
  // Supervisor pode editar dados APENAS se status é 'pendente_supervisor' ou novo apontamento
  const canEditData = !isUserVisitor && (isNewApontamento || apontamento?.status === 'pendente_supervisor');
  // Análise (Conclusão + Assinatura) pode ser editada por supervisor:
  // - Em novo apontamento (criação)
  // - Enquanto status é 'pendente_supervisor' (análise de existente)
  const canEditAnalysis = !isUserVisitor && !apontamento?.cancelado && (isNewApontamento || apontamento?.status === 'pendente_supervisor');
  // Relato do Colaborador NUNCA pode ser editado após criação - só em novos apontamentos
  const canEditRelatoColaborador = isNewApontamento;
  // Relato do Superior NUNCA pode ser editado após criação - só em novos apontamentos
  const canEditRelatoSuperior = isNewApontamento;
  const [formData, setFormData] = useState({
    // Dados do Apontamento
    NBOLETIM: '',
    DATA_OCORRIDO: '',
    DATA_PORTARIA: '',
    OCORRENCIA: '',
    LOCAL: '',
    AREA: '',
    MUNICIPIO: '',
    UNIDADE: '',
    EQUIPAMENTO: '',
    FROTA: '',
    SAFRA: '',
    ELABORADO_POR: '',
    SUPERVISOR: '',
    EMAIL_SUPERVISOR: '',
    RELATO_COLABORADOR: '',
    
    // Dados do Colaborador
    COLABORADOR: '',
    MATRICULA: '',
    RG: '',
    CPF: '',
    DATA_ADMISSAO: '',
    FUNCAO: '',
    TELEFONE: '',
    NCNH: '',
    CATEGORIA_CNH: '',
    VALIDADE_CNH: '',
    
    // Análise do Supervisor
    RELATO_SUPERIOR: '',
    ASSINATURA_SUPERVISOR: '',
    
    // Assinatura do Gerente (apenas leitura)
    ASSINATURA_GERENTE: '',
    STATUS_GERENTE: ''
  });
  const [conclusoes, setConclusoes] = useState({
    falha_operacional: false,
    condicao_insegura: false,
    falha_mecanica: false,
    condicao_adversa: false,
    causa_desconhecida: false
  });
  const [ocorrenciaCustomizada, setOcorrenciaCustomizada] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && apontamento) {
      // Carregar TODOS os dados do apontamento do banco
      const assinaturaSupervisor = apontamento.assinatura_supervisor || apontamento.ASSINATURA_SUPERVISOR || '';
      const emailSupervisor = apontamento.email_supervisor || apontamento.EMAIL_SUPERVISOR || '';
      
      // Preparar Data Portaria
      let dataPortaria = apontamento.data_portaria?.split(/[T\s]/)[0] || '';
      
      // Se supervisor está acessando para assinar E Data Portaria está vazia, preencher com data de hoje
      if (!isUserVisitor && !dataPortaria) {
        const hoje = new Date();
        dataPortaria = hoje.toISOString().split('T')[0];
      }

      // Verificar se a ocorrência é uma das padrões
      const ocorrenciasPadrao = ['AVARIAS DIVERSAS', 'COLISÃO', 'INCÊNDIO', 'TOMBAMENTO', 'DANO', 'FURTO'];
      if (apontamento.ocorrencia && !ocorrenciasPadrao.includes(apontamento.ocorrencia)) {
        setOcorrenciaCustomizada(apontamento.ocorrencia);
      } else {
        setOcorrenciaCustomizada('');
      }

      setFormData({
        // Dados do Apontamento
        NBOLETIM: apontamento.nboletim || '',
        DATA_OCORRIDO: apontamento.data_ocorrido ? apontamento.data_ocorrido.replace(' ', 'T') : '',
        DATA_PORTARIA: dataPortaria,
        OCORRENCIA: apontamento.ocorrencia || '',
        LOCAL: apontamento.local || '',
        AREA: apontamento.area || '',
        MUNICIPIO: apontamento.municipio || '',
        UNIDADE: apontamento.unidade || '',
        EQUIPAMENTO: apontamento.equipamento || '',
        FROTA: apontamento.frota || apontamento.FROTA || '',
        SAFRA: apontamento.safra || apontamento.SAFRA || '',
        ELABORADO_POR: apontamento.elaborado_por || '',
        SUPERVISOR: apontamento.supervisor || '',
        EMAIL_SUPERVISOR: emailSupervisor,
        RELATO_COLABORADOR: apontamento.relato_colaborador || '',
        // Dados do Colaborador
        COLABORADOR: apontamento.colaborador || '',
        MATRICULA: apontamento.matricula || '',
        RG: apontamento.rg || '',
        CPF: apontamento.cpf || '',
        DATA_ADMISSAO: apontamento.data_admissao?.split(/[T\s]/)[0] || '',
        FUNCAO: apontamento.funcao || '',
        TELEFONE: apontamento.telefone || '',
        NCNH: apontamento.ncnh || '',
        CATEGORIA_CNH: apontamento.categoria_cnh || '',
        VALIDADE_CNH: apontamento.validade_cnh?.split(/[T\s]/)[0] || '',
        
        // Análise do Supervisor
        RELATO_SUPERIOR: apontamento.relato_superior || '',
        ASSINATURA_SUPERVISOR: assinaturaSupervisor,
        
        // Assinatura do Gerente (apenas leitura)
        ASSINATURA_GERENTE: apontamento.assinatura_gerente || apontamento.ASSINATURA_GERENTE || '',
        STATUS_GERENTE: apontamento.status_gerente || apontamento.STATUS_GERENTE || ''
      });
      
      // Parsear CONCLUSAO_CAUSA (string com items separados por vírgula)
      const conclusaoCausa = apontamento.conclusao_causa || '';
      setConclusoes({
        falha_operacional: conclusaoCausa.includes('Falha operacional'),
        condicao_insegura: conclusaoCausa.includes('Condição insegura'),
        falha_mecanica: conclusaoCausa.includes('Falha mecânica'),
        condicao_adversa: conclusaoCausa.includes('Condição adversa'),
        causa_desconhecida: conclusaoCausa.includes('Causa desconhecida')
      });
    } else if (isOpen && !apontamento) {
      // NOVO APONTAMENTO - preencher com valores padrão para supervisor
      const hoje = new Date();
      const dataHoje = hoje.toISOString().split('T')[0];
      const dataHojeCompleta = hoje.toISOString().slice(0, 16);
      
      // Gerar número de B.O. automático (mesmo padrão do modal convencional)
      const gerarNumeroBo = () => {
        const randomNum = Math.floor(Math.random() * 900000) + 1000000;
        return `BO-${randomNum}-`;
      };
      
      setFormData({
        // Dados do Apontamento
        NBOLETIM: gerarNumeroBo(),
        DATA_OCORRIDO: dataHojeCompleta,
        DATA_PORTARIA: dataHoje,
        OCORRENCIA: '',
        LOCAL: '',
        AREA: '',
        MUNICIPIO: '',
        UNIDADE: '',
        EQUIPAMENTO: '',
        FROTA: '',
        SAFRA: '',
        ELABORADO_POR: 'SUPERVISOR',
        SUPERVISOR: user?.nome || '',
        EMAIL_SUPERVISOR: '',
        RELATO_COLABORADOR: '',
        
        // Dados do Colaborador
        COLABORADOR: '',
        MATRICULA: '',
        RG: '',
        CPF: '',
        DATA_ADMISSAO: '',
        FUNCAO: '',
        TELEFONE: '',
        NCNH: '',
        CATEGORIA_CNH: '',
        VALIDADE_CNH: '',
        
        // Análise do Supervisor
        RELATO_SUPERIOR: '',
        ASSINATURA_SUPERVISOR: '',
        
        // Assinatura do Gerente (apenas leitura)
        ASSINATURA_GERENTE: '',
        STATUS_GERENTE: ''
      });
      
      setConclusoes({
        falha_operacional: false,
        condicao_insegura: false,
        falha_mecanica: false,
        condicao_adversa: false,
        causa_desconhecida: false
      });
    }
  }, [isOpen, apontamento]);

  useEffect(() => {
    // Resetar estado quando modal abre/fecha
    if (!isOpen) {
      setLoading(false);
      setIsSubmitting(false);
      setOcorrenciaCustomizada('');
    }
  }, [isOpen]);

  // Rolar para topo quando modal abre
  useEffect(() => {
    if (isOpen && modalRef.current) {
      setTimeout(() => {
        modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Campos que SEMPRE devem ser maiúsculas (assinaturas)
    const camposAlfasempre = ['ASSINATURA_SUPERVISOR', 'ASSINATURA_GERENTE'];
    // Lógica de apontamento normal: aplicar APENAS para NOVOS apontamentos (supervisor criando)
    const camposMaiuscula = ['FUNCAO', 'AREA', 'CATEGORIA_CNH', 'LOCAL', 'MUNICIPIO', 'OCORRENCIA', 'EQUIPAMENTO', 'COLABORADOR', 'RG', 'CPF', 'TELEFONE', 'NCNH', 'ELABORADO_POR', 'SUPERVISOR', 'SAFRA', 'FROTA', 'RELATO_COLABORADOR', 'RELATO_SUPERIOR', 'UNIDADE', 'OBSERVACOES_SUPERVISOR'];
    const valorFinal = camposAlfasempre.includes(name) ? value.toUpperCase() : (!apontamento && camposMaiuscula.includes(name) ? value.toUpperCase() : value);
    
    // Se mudou a UNIDADE (apenas em modo de criação), regenera o NBOLETIM
    if (name === 'UNIDADE' && valorFinal && !apontamento) {
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
  };

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

  const handleCheckboxChange = (key) => {
    setConclusoes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSupervisorAction = async (action) => {
    // Visitantes não podem aprovar, apenas editar análise
    if (isUserVisitor) {
      alert.error('Apenas supervisores podem aprovar apontamentos.');
      return;
    }

    // Se supervisor está tentando APROVAR, validar se todos os campos estão preenchidos
    if (action === 'approve' && !isUserVisitor) {
      const camposObrigatorios = [
        { key: 'OCORRENCIA', label: 'Ocorrência' },
        { key: 'DATA_OCORRIDO', label: 'Data da Ocorrência' },
        { key: 'LOCAL', label: 'Local' },
        { key: 'DATA_PORTARIA', label: 'Data Portaria' },
        { key: 'MUNICIPIO', label: 'Município' },
        { key: 'UNIDADE', label: 'Unidade' },
        { key: 'EQUIPAMENTO', label: 'Equipamento' },
        { key: 'FROTA', label: 'Frota' },
        { key: 'SAFRA', label: 'Safra' },
        { key: 'ELABORADO_POR', label: 'Elaborado Por' },
        { key: 'COLABORADOR', label: 'Colaborador' },
        { key: 'MATRICULA', label: 'Matrícula' },
        { key: 'RG', label: 'RG' },
        { key: 'CPF', label: 'CPF' },
        { key: 'DATA_ADMISSAO', label: 'Data de Admissão' },
        { key: 'FUNCAO', label: 'Função' },
        { key: 'TELEFONE', label: 'Telefone' },
        { key: 'NCNH', label: 'Nº CNH' },
        { key: 'CATEGORIA_CNH', label: 'Categoria CNH' },
        { key: 'VALIDADE_CNH', label: 'Validade CNH' },
        { key: 'RELATO_COLABORADOR', label: 'Relato Colaborador' },
        { key: 'RELATO_SUPERIOR', label: 'Relato Superior (Análise)' },
        { key: 'ASSINATURA_SUPERVISOR', label: 'Assinatura' }
      ];

      for (const campo of camposObrigatorios) {
        const valor = formData[campo.key];
        if (typeof valor === 'string' && !valor.trim()) {
          alert.error(`Campo obrigatório não preenchido: ${campo.label}`);
          return;
        }
      }

      // Validar se tem conclusão selecionada
      const temConclusao = Object.values(conclusoes).some(v => v);
      if (!temConclusao) {
        alert.error('Selecione pelo menos uma conclusão antes de aprovar.');
        return;
      }
    }

    // Evitar dupla submissão
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    
    const alertId = alert.info('Processando... Aguarde.', 0);
    const safetyTimeout = setTimeout(() => {
      alert.removeAlert(alertId);
    }, 60000); // 60 segundos de safety timeout

    try {
      // Usar UPDATE quando apontamento já existe
      const isUpdate = apontamento && apontamento.nboletim;

      // Montar lista de conclusões selecionadas
      const conclusoesSelecionadas = [];
      if (conclusoes.falha_operacional) conclusoesSelecionadas.push('Falha operacional');
      if (conclusoes.condicao_insegura) conclusoesSelecionadas.push('Condição insegura');
      if (conclusoes.falha_mecanica) conclusoesSelecionadas.push('Falha mecânica');
      if (conclusoes.condicao_adversa) conclusoesSelecionadas.push('Condição adversa/tempo');
      if (conclusoes.causa_desconhecida) conclusoesSelecionadas.push('Causa desconhecida/furto/outro');

      const requestData = {
        NBOLETIM: apontamento?.nboletim || formData.NBOLETIM || '',
        // Dados do apontamento
        DATA_PORTARIA: formData.DATA_PORTARIA,
        DATA_OCORRIDO: formData.DATA_OCORRIDO,
        OCORRENCIA: formData.OCORRENCIA,
        LOCAL: formData.LOCAL,
        AREA: formData.AREA,
        MUNICIPIO: formData.MUNICIPIO,
        UNIDADE: formData.UNIDADE,
        EQUIPAMENTO: formData.EQUIPAMENTO,
        FROTA: formData.FROTA,
        SAFRA: formData.SAFRA,
        ELABORADO_POR: formData.ELABORADO_POR,
        SUPERVISOR: formData.SUPERVISOR,
        EMAIL_SUPERVISOR: formData.EMAIL_SUPERVISOR,
        COLABORADOR: formData.COLABORADOR,
        MATRICULA: formData.MATRICULA,
        RG: formData.RG,
        CPF: formData.CPF,
        DATA_ADMISSAO: formData.DATA_ADMISSAO,
        FUNCAO: formData.FUNCAO,
        TELEFONE: formData.TELEFONE,
        NCNH: formData.NCNH,
        CATEGORIA_CNH: formData.CATEGORIA_CNH,
        VALIDADE_CNH: formData.VALIDADE_CNH,
        RELATO_COLABORADOR: formData.RELATO_COLABORADOR,
        // Análise do visitante
        RELATO_SUPERIOR: formData.RELATO_SUPERIOR,
        ASSINATURA_SUPERVISOR: formData.ASSINATURA_SUPERVISOR,
        CONCLUSAO_CAUSA: conclusoesSelecionadas.length > 0 ? conclusoesSelecionadas.join(', ') : '',
        CRIADO_POR: user?.cargo || '',
        // Default: pendente_supervisor (será alterado se action === 'approve')
        STATUS: 'pendente_supervisor'
      };

      // SUPERVISOR APROVA: enviar pro gerente
      if (action === 'approve') {
        requestData.STATUS = 'pendente_gerente';
        requestData.STATUS_SUPERVISOR = 'aprovado';
        // Se supervisor preencheu assinatura, marca como assinado
        requestData.ASSINADO_SUPERVISOR = (formData.ASSINATURA_SUPERVISOR || '').trim() ? 'S' : 'N';
      }

      let result;
      if (isUpdate) {
        result = await apiAtualizarApontamento(apontamento.nboletim, requestData);
      } else {
        const { apiCriarApontamento } = await import('../lib/apiService');
        result = await apiCriarApontamento(requestData);
      }

      // Limpar timeout de segurança
      clearTimeout(safetyTimeout);

      // Remover alerta de "Processando"
      if (alertId) {
        alert.removeAlert(alertId);
      }

      // Se recebeu resposta (status 200), apenas fecha silenciosamente
      if (result) {
        if (onSave) onSave(result.dados_apontamento || apontamento);
        
        // Fechar modal após 1 segundo
        setTimeout(() => {
          setLoading(false);
          setIsSubmitting(false);
          onClose();
        }, 1000);
      } else {
        // Se não teve resposta, mostra alerta de sucesso
        if (action === 'approve') {
          alert.success('Sucesso! Apontamento enviado ao Gerente.');
        } else {
          alert.success('Sucesso! Apontamento criado e enviado à Portaria para análise.');
        }
        
        if (onSave) onSave(result?.dados_apontamento || apontamento);
        
        // Fechar modal após 1.5 segundos
        setTimeout(() => {
          setLoading(false);
          setIsSubmitting(false);
          onClose();
        }, 1500);
      }

    } catch (err) {
      console.error('Erro:', err);
      
      // Limpar timeout de segurança
      clearTimeout(safetyTimeout);
      
      // Remover alerta de "Processando"
      if (alertId) {
        alert.removeAlert(alertId);
      }
      
      const errorMsg = handleApiError(err);
      alert.error(errorMsg);
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 overflow-y-auto">
      <div ref={modalRef} className={`bg-[#0f172a] w-full max-w-4xl overflow-y-auto relative border border-slate-700 ${canEditData ? 'max-h-[85vh]' : 'max-h-[95vh]'}`}>
        {/* OVERLAY DE CARREGAMENTO */}
        {loading && (
          <div className="absolute inset-0 bg-[#0f172a]/80 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="animate-spin text-[#004927]" />
              <p className="text-lg font-bold text-white">Atualizando apontamento...</p>
              <p className="text-sm text-slate-400">Por favor, aguarde...</p>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-[#004927] sticky top-0">
          <div>
            <h2 className="text-2xl font-bold text-white">{apontamento ? 'Supervisionar Apontamento' : 'Novo Apontamento'}</h2>
            <p className="text-sm text-slate-400 mt-1">{apontamento ? `B.O. ${apontamento.nboletim}` : 'Criar novo apontamento'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* ALERTA SE CANCELADO */}
          {apontamento?.cancelado && (
            <div>
              <p className="text-sm font-bold text-red-300">APONTAMENTO CANCELADO</p>
            </div>
          )}

          {/* ALERTA SE AGUARDANDO GERENTE */}
          {apontamento?.status === 'pendente_gerente' && (
            <div className="bg-amber-900/20 border border-amber-200 p-4">
              <p className="text-sm font-bold text-amber-900">APONTAMENTO AGUARDANDO APROVAÇÃO DO GERENTE</p>
              <p className="text-xs text-amber-700 mt-1">Este apontamento está aguardando aprovação do gerente e não pode ser editado no momento.</p>
            </div>
          )}

          {/* SEÇÃO 1: Dados do Colaborador (Read-Only) */}
          <div className="space-y-4 bg-slate-800 p-4 border border-slate-700">
            <h3 className="text-lg font-bold text-white">Dados do Apontamento</h3>
            
            {/* Linha 1 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">B.O.</label>
                <p className="text-sm font-bold text-white px-3 py-2">{formData.NBOLETIM || '(Será gerado automaticamente)'}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Data Ocorrência</label>
                {canEditData ? (
                  <input type="datetime-local" name="DATA_OCORRIDO" value={formData.DATA_OCORRIDO} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927]" />
                ) : (
                  <p className="text-sm text-white">{formData.DATA_OCORRIDO}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Data Apontamento/Portaria</label>
                {canEditData ? (
                  <input type="date" name="DATA_PORTARIA" value={formData.DATA_PORTARIA} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927]" />
                ) : (
                  <p className="text-sm text-white">{formData.DATA_PORTARIA}</p>
                )}
              </div>
            </div>

            {/* Linha 2 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ocorrência</label>
                {canEditData ? (
                  <select
                    value={ocorrenciaCustomizada ? 'OUTROS' : formData.OCORRENCIA}
                    onChange={handleOcorrenciaChange}
                    className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927]"
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
                ) : (
                  <p className="text-sm text-white">{formData.OCORRENCIA}</p>
                )}
              </div>
              {canEditData && (formData.OCORRENCIA === 'OUTROS' || (formData.OCORRENCIA && !['AVARIAS DIVERSAS', 'COLISÃO', 'INCÊNDIO', 'TOMBAMENTO', 'DANO', 'FURTO'].includes(formData.OCORRENCIA))) && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Digite a Ocorrência</label>
                  <input
                    type="text"
                    value={ocorrenciaCustomizada}
                    onChange={handleOcorrenciaCustomizada}
                    maxLength="255"
                    className="w-full px-3 py-2 border border-blue-300 bg-slate-700 outline-none focus:border-[#004927] uppercase"
                    placeholder="Digite o tipo de ocorrência"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Local</label>
                {canEditData ? (
                  <input type="text" name="LOCAL" value={formData.LOCAL} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.LOCAL}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">SETOR</label>
                {canEditData ? (
                  <input 
                  type="text" 
                  name="AREA" 
                  value={formData.AREA} 
                  onChange={handleChange}
                  placeholder="SETOR/DEPARTAMENTO"
                  className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.AREA}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Município</label>
                {canEditData ? (
                  <input type="text" name="MUNICIPIO" value={formData.MUNICIPIO} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.MUNICIPIO}</p>
                )}
              </div>
            </div>

            {/* Linha 3 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Unidade</label>
                {canEditData ? (
                  <select name="UNIDADE" value={formData.UNIDADE} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927]">
                    <option value="">-- Selecione uma Unidade --</option>
                    <option value="115">Maracaí</option>
                    <option value="112">Paraguaçu Paulista</option>
                    <option value="250">Anaurilândia</option>
                  </select>
                ) : (
                  <p className="text-sm text-white">{formData.UNIDADE}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Equipamento</label>
                {canEditData ? (
                  <input type="text" name="EQUIPAMENTO" value={formData.EQUIPAMENTO} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.EQUIPAMENTO}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Elaborado por</label>
                {canEditData ? (
                  <input type="text" name="ELABORADO_POR" value={formData.ELABORADO_POR} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.ELABORADO_POR}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Supervisor</label>
                {canEditData ? (
                  <input type="text" name="SUPERVISOR" value={formData.SUPERVISOR} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.SUPERVISOR}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Email Supervisor</label>
                {canEditData ? (
                  <input type="email" name="EMAIL_SUPERVISOR" value={formData.EMAIL_SUPERVISOR} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-300 outline-none focus:border-[#004927]" />
                ) : (
                  <p className="text-sm text-white">{formData.EMAIL_SUPERVISOR}</p>
                )}
              </div>
            </div>

            {/* Frota e Safra */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Frota</label>
                {canEditData ? (
                  <input type="text" name="FROTA" value={formData.FROTA} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927]" />
                ) : (
                  <p className="text-sm text-white">{formData.FROTA}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Safra</label>
                {canEditData ? (
                  <input type="text" name="SAFRA" value={formData.SAFRA} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927]" />
                ) : (
                  <p className="text-sm text-white">{formData.SAFRA}</p>
                )}
              </div>
            </div>

            {/* Dados do Colaborador */}
            <h3 className="text-lg font-bold text-white mt-4">Dados do Colaborador</h3>

            {/* Linha 4 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Colaborador</label>
                {canEditData ? (
                  <input type="text" name="COLABORADOR" value={formData.COLABORADOR} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.COLABORADOR}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Matrícula</label>
                {canEditData ? (
                  <input type="text" name="MATRICULA" maxLength="10" value={formData.MATRICULA} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927]" />
                ) : (
                  <p className="text-sm text-white">{formData.MATRICULA}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">RG</label>
                {canEditData ? (
                  <input type="text" name="RG" value={formData.RG} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.RG}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">CPF</label>
                {canEditData ? (
                  <input type="text" name="CPF" value={formData.CPF} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.CPF}</p>
                )}
              </div>
            </div>

            {/* Linha 5 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Data Admissão</label>
                {canEditData ? (
                  <input type="date" name="DATA_ADMISSAO" value={formData.DATA_ADMISSAO} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927]" />
                ) : (
                  <p className="text-sm text-white">{formData.DATA_ADMISSAO}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Função</label>
                {canEditData ? (
                  <input type="text" name="FUNCAO" value={formData.FUNCAO} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.FUNCAO}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Telefone</label>
                {canEditData ? (
                  <input type="tel" name="TELEFONE" value={formData.TELEFONE} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.TELEFONE}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nº CNH</label>
                {canEditData ? (
                  <input type="text" name="NCNH" value={formData.NCNH} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.NCNH}</p>
                )}
              </div>
            </div>

            {/* Linha 6 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Categoria CNH</label>
                {canEditData ? (
                  <input type="text" name="CATEGORIA_CNH" value={formData.CATEGORIA_CNH} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927] uppercase" />
                ) : (
                  <p className="text-sm text-white">{formData.CATEGORIA_CNH}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Validade CNH</label>
                {canEditData ? (
                  <input type="date" name="VALIDADE_CNH" value={formData.VALIDADE_CNH} onChange={handleChange} className="w-full px-3 py-2 border border-slate-600 outline-none focus:border-[#004927]" />
                ) : (
                  <p className="text-sm text-white">{formData.VALIDADE_CNH}</p>
                )}
              </div>
              <div></div>
              <div></div>
            </div>
          </div>
          
          
            {/* Relato do Colaborador */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Relato do Colaborador</label>
              <textarea
                name="RELATO_COLABORADOR"
                value={formData.RELATO_COLABORADOR}
                onChange={handleChange}
                disabled={!canEditRelatoColaborador}
                className={`w-full px-3 py-2 border outline-none resize-vertical min-h-24 transition-colors ${
                  canEditRelatoColaborador 
                    ? 'border-slate-600 bg-slate-700 text-slate-300 focus:border-[#004927]' 
                    : 'border-slate-600 bg-slate-700 cursor-not-allowed text-slate-300'
                }`}
              />
            </div>


          {/* SEÇÃO 2: Preencher Supervisor */}
          <div className="space-y-4 border-t pt-6">
            {isBlocked && (
              <div className="bg-red-900/20 border-2 border-red-700 p-4 mb-4">
                <p className="text-sm text-red-300 font-bold">
                  🔒 APONTAMENTO FINALIZADO - CAMPOS TRAVADOS
                </p>
                <p className="text-xs text-red-300 mt-2">
                  Este apontamento não pode ser editado neste estágio. Todos os campos estão protegidos contra alterações.
                </p>
              </div>
            )}

            {apontamento?.status_gerente === 'revisao' && (
              <div className="bg-slate-700 border border-blue-300 p-4 mb-4">
                <p className="text-sm text-blue-300 font-semibold">Gerente devolveu para revisão</p>
                {apontamento?.observacoes_gerente && (
                  <p className="text-sm text-blue-700 mt-2"><strong>Motivo:</strong> {apontamento?.observacoes_gerente}</p>
                )}
              </div>
            )}

            {/* Relato do Superior */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Relato do Superior *</label>
              <textarea
                name="RELATO_SUPERIOR"
                value={formData.RELATO_SUPERIOR}
                onChange={handleChange}
                disabled={!canEditRelatoSuperior}
                rows="4"
                placeholder="Descreva sua análise do apontamento..."
                className={`w-full px-4 py-2 border outline-none resize-vertical transition-all ${
                  canEditRelatoSuperior
                    ? 'border-slate-600 bg-slate-700 text-slate-300 focus:border-[#004927]'
                    : 'border-slate-600 bg-slate-700 cursor-not-allowed text-slate-300'
                }`}
              />
            </div>
            
            <h3 className="text-lg font-bold text-white">Conclusão do Superior</h3>

            {/* Conclusões (Checkboxes) */}
            <div className={`bg-slate-700 p-4 border border-blue-200 transition-all ${!canEditAnalysis ? 'opacity-70 bg-slate-100' : ''}`}>
              <label className="block text-sm font-bold text-blue-300 mb-3">Conclusão (marque uma ou mais):</label>
              
              <div className="space-y-2">
                {[
                  { key: 'falha_operacional', label: 'Falha operacional' },
                  { key: 'condicao_insegura', label: 'Condição insegura' },
                  { key: 'falha_mecanica', label: 'Falha mecânica' },
                  { key: 'condicao_adversa', label: 'Condição adversa/tempo' },
                  { key: 'causa_desconhecida', label: 'Causa desconhecida/furto/outro' }
                ].map(item => (
                  <label key={item.key} className={`flex items-center gap-3 transition-all ${!canEditAnalysis ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={conclusoes[item.key]}
                      onChange={() => handleCheckboxChange(item.key)}
                      disabled={!canEditAnalysis}
                      className="w-4 h-4 accent-[#004927]"
                    />
                    <span className="text-sm text-slate-300">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Assinatura do Supervisor - editável para o supervisor */}
            {!isUserVisitor && (
              <div className={`border p-4 transition-all ${canEditAnalysis ? 'bg-slate-700 border-blue-200' : 'bg-slate-100 border-slate-600'}`}>
                <label className="block text-sm font-bold text-slate-300 mb-2">Assinatura do Supervisor</label>
                <textarea
                  name="ASSINATURA_SUPERVISOR"
                  value={formData.ASSINATURA_SUPERVISOR}
                  onChange={handleChange}
                  disabled={!canEditAnalysis}
                  className={`w-full px-4 py-2 border font-mono text-sm outline-none resize-vertical transition-all ${
                    canEditAnalysis
                      ? 'border-blue-300 focus:border-[#004927] bg-slate-700 text-slate-300'
                      : 'border-slate-600 bg-slate-700 cursor-not-allowed text-slate-300'
                  }`}
                  rows="3"
                  placeholder="Digite a assinatura ou iniciais..."
                />
              </div>
            )}

            {/* Assinatura do Gerente (apenas exibição quando gerente já assinou) */}
            {formData.ASSINATURA_GERENTE && (
              <div className="bg-green-50 border border-green-200 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Concordo Gerente</label>
                    <p className="text-sm font-bold text-green-700">{formData.ASSINATURA_GERENTE}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Status Gerente</label>
                    <div className="flex items-center gap-2">
                      <Check size={16} className="text-green-600" />
                      <span className="text-sm font-bold text-green-700">APROVADO</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            <div className="flex gap-3">
              {!isBlocked && !isUserVisitor ? (
                <>
                  <button
                    onClick={() => handleSupervisorAction('approve')}
                    disabled={loading}
                    className="flex-1 bg-[#004927] text-white font-medium py-2 px-4 hover:bg-[#003220] disabled:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Aprovar
                  </button>
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 bg-slate-600 text-slate-300 font-medium py-2 px-4 hover:bg-slate-400 transition-colors"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <button
                  onClick={onClose}
                  className="w-full bg-slate-600 text-slate-300 font-medium py-2 px-4 hover:bg-slate-400 transition-colors"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
