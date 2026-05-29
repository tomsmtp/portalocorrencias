import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { useAlert } from '../context/AlertContext';

/**
 * Modal para GERENTE assinar e dar aprovação final
 * Tudo é read-only: Dados do Colaborador + Relato do Colaborador + Análise do Supervisor
 * Editable: Apenas Assinatura do Gerente (se ele ainda não assinou)
 */
export function ApontamentosModalGerente({ isOpen, onClose, apontamento, user, onSave }) {
  const isGerenteJaAssinou = apontamento?.assinado_gerente === true;
  const isBlocked = isGerenteJaAssinou || apontamento?.cancelado;
  const alert = useAlert();
  const modalRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assinaturaGerente, setAssinaturaGerente] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Formata data removendo hora
  const formatDate = (dateStr) => {
    if (!dateStr) return '(Não informado)';
    return dateStr.split('T')[0].split(' ')[0];
  };

  // Formata data + hora (para data de ocorrência)
  const formatDateWithTime = (dateStr) => {
    if (!dateStr) return '(Não informado)';
    // "2026-05-28T17:26:00" → "2026-05-28 17:26"
    const date = dateStr.split('T')[0];
    const time = dateStr.split('T')[1]?.slice(0, 5); // pega HH:mm
    return time ? `${date} ${time}` : date;
  };
  const [formData, setFormData] = useState({
    NBOLETIM: '',
    DATA_APONTAMENTO: '',
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
    RELATO_SUPERIOR: '',
    ASSINATURA_SUPERVISOR: ''
  });
  const [conclusoes, setConclusoes] = useState({
    falha_operacional: false,
    condicao_insegura: false,
    falha_mecanica: false,
    condicao_adversa: false,
    causa_desconhecida: false
  });

  useEffect(() => {
    if (isOpen && apontamento) {
      const assinaturaGerente = apontamento.assinatura_gerente || '';
      const assinaturaSupervisor = apontamento.assinatura_supervisor || apontamento.ASSINATURA_SUPERVISOR || '';
      
      setFormData({
        NBOLETIM: apontamento.nboletim || '',
        DATA_APONTAMENTO: apontamento.data_apontamento?.split('T')[0] || '',
        DATA_OCORRIDO: apontamento.data_ocorrido ? apontamento.data_ocorrido.replace(' ', 'T') : '',
        DATA_PORTARIA: apontamento.data_portaria?.split('T')[0] || '',
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
        EMAIL_SUPERVISOR: apontamento.email_supervisor || apontamento.EMAIL_SUPERVISOR || '',
        RELATO_COLABORADOR: apontamento.relato_colaborador || '',
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
        RELATO_SUPERIOR: apontamento.relato_superior || '',
        ASSINATURA_SUPERVISOR: assinaturaSupervisor
      });
      
      const conclusaoCausa = apontamento.conclusao_causa || '';
      setConclusoes({
        falha_operacional: conclusaoCausa.includes('Falha operacional'),
        condicao_insegura: conclusaoCausa.includes('Condição insegura'),
        falha_mecanica: conclusaoCausa.includes('Falha mecânica'),
        condicao_adversa: conclusaoCausa.includes('Condição adversa'),
        causa_desconhecida: conclusaoCausa.includes('Causa desconhecida')
      });
      
      setAssinaturaGerente(assinaturaGerente);
      setIsRejectMode(false);
      setRejectionReason('');
    }
  }, [isOpen, apontamento]);

  useEffect(() => {
    // Resetar estado quando modal abre/fecha
    if (!isOpen) {
      setLoading(false);
      setIsSubmitting(false);
      setIsRejectMode(false);
      setRejectionReason('');
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

  if (!isOpen || !apontamento) return null;

  const handleSign = async (action) => {
    // Se clicou em rejeitar mas não está no modo de rejeição, entrar no modo
    if (action === 'reject' && !isRejectMode) {
      setIsRejectMode(true);
      return;
    }

    // Se está no modo de rejeição e quer rejeitar, valida o motivo
    if (action === 'reject' && isRejectMode) {
      if (!rejectionReason.trim()) {
        alert.error('Motivo da rejeição é obrigatório');
        return;
      }
    } else {
      // Para APROVAÇÃO, validações normais
      if (!assinaturaGerente.trim()) {
        alert.error('Assinatura é obrigatória');
        return;
      }
    }

    // Evitar dupla submissão
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    
    const alertId = alert.info('Enviando dados... Aguarde.', 0);
    const safetyTimeout = setTimeout(() => {
      alert.removeAlert(alertId);
    }, 60000); // 60 segundos de safety timeout

    try {
      const endpoint = import.meta.env.VITE_CRIAR_APONTAMENTO_POST;
      
      if (!endpoint) {
        throw new Error('Endpoint de atualização não configurado');
      }

      // Preparar dados para envio
      // NBOLETIM é o identificador único para UPDATE
      const requestData = {
        NBOLETIM: apontamento.nboletim,
        EMAIL_SUPERVISOR: formData.EMAIL_SUPERVISOR,
        ASSINATURA_GERENTE: assinaturaGerente,
      };

      // Se aprova
      if (action === 'approve') {
        requestData.ASSINADO_GERENTE = 'S';
        requestData.STATUS_GERENTE = 'aprovado';
        requestData.STATUS = 'aprovado';
        requestData.NOVO_APONTAMENTO = 'S'; // Reset para aparecer como novo na dashboard
      } 
      // Se rejeita (volta pro supervisor)
      else if (action === 'reject') {
        requestData.ASSINADO_GERENTE = 'N';
        requestData.STATUS_GERENTE = 'revisao';
        requestData.STATUS = 'revisao';
        requestData.OBSERVACOES_GERENTE = `Apontamento devolvido para revisão.\n\nMotivo: ${rejectionReason}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      // Limpar timeout de segurança
      clearTimeout(safetyTimeout);

      // Remover alerta de "Enviando"
      if (alertId) {
        alert.removeAlert(alertId);
      }

      if (result.status === 'sucesso') {
        const message = action === 'approve' ? 'Sucesso! Apontamento aprovado.' : 'Sucesso! Apontamento rejeitado.';
        alert.success(message);
        
        // Callback imediato para recarregar lista
        if (onSave) onSave(result.dados_apontamento || apontamento);
        
        // Fechar modal após 1.5 segundos
        setTimeout(() => {
          setLoading(false);
          setIsSubmitting(false);
          onClose();
        }, 1500);
      } else {
        throw new Error(result.mensagem || 'Erro ao processar assinatura');
      }
    } catch (err) {
      console.error('Erro ao assinar:', err);
      
      // Limpar timeout de segurança
      clearTimeout(safetyTimeout);
      
      // Remover alerta de "Enviando"
      if (alertId) {
        alert.removeAlert(alertId);
      }
      
      alert.error('Erro: ' + err.message);
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 overflow-y-auto">
      <div ref={modalRef} className="bg-[#0f172a] w-full max-w-4xl max-h-[95vh] overflow-y-auto relative border border-slate-700">
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
            <h2 className="text-2xl font-bold text-white">Aprovação Final</h2>
            <p className="text-sm text-slate-400 mt-1">B.O. {apontamento.nboletim}</p>
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
            <div className="bg-red-900/20 border-l-4 border-red-500 p-4">
              <p className="text-sm font-bold text-red-300">APONTAMENTO CANCELADO</p>
              <p className="text-sm text-red-300 mt-2">Este apontamento foi cancelado e não pode ser editado. Apenas visualização é permitida.</p>
            </div>
          )}

          {/* SEÇÃO 1: Dados do Apontamento (Read-Only) */}
          <div className="space-y-4 bg-slate-700 p-4 border border-slate-600">
            <h3 className="text-lg font-bold text-white">Dados do Apontamento</h3>
            
            {/* Linha 1 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">B.O.</label>
                <p className="text-sm font-bold text-white">{formData.NBOLETIM}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Data Ocorrência</label>
                <p className="text-sm text-slate-300">{formatDateWithTime(formData.DATA_OCORRIDO)}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Data Apontamento/Portaria</label>
                <p className="text-sm text-slate-300">{formatDate(formData.DATA_PORTARIA)}</p>
              </div>
            </div>

            {/* Linha 2 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Ocorrência</label>
                <p className="text-sm text-slate-300">{formData.OCORRENCIA}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Local</label>
                <p className="text-sm text-slate-300">{formData.LOCAL}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Área</label>
                <p className="text-sm text-slate-300">{formData.AREA}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Município</label>
                <p className="text-sm text-slate-300">{formData.MUNICIPIO}</p>
              </div>
            </div>

            {/* Linha 3 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Unidade</label>
                <p className="text-sm text-slate-300">{formData.UNIDADE}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Equipamento</label>
                <p className="text-sm text-slate-300">{formData.EQUIPAMENTO}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Elaborado por</label>
                <p className="text-sm text-slate-300">{formData.ELABORADO_POR}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Supervisor</label>
                <p className="text-sm text-slate-300">{formData.SUPERVISOR}</p>
              </div>
            </div>

            {/* Email e Frota/Safra */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Email Supervisor</label>
                <p className="text-sm text-slate-300">{formData.EMAIL_SUPERVISOR}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Frota</label>
                <p className="text-sm text-slate-300">{formData.FROTA}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Safra</label>
                <p className="text-sm text-slate-300">{formData.SAFRA}</p>
              </div>
            </div>

            {/* Dados do Colaborador */}
            <h3 className="text-lg font-bold text-white mt-4 mb-3">Dados do Colaborador</h3>

            {/* Linha 4 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Colaborador</label>
                <p className="text-sm text-slate-300">{formData.COLABORADOR}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Matrícula</label>
                <p className="text-sm text-slate-300">{formData.MATRICULA}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">RG</label>
                <p className="text-sm text-slate-300">{formData.RG}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">CPF</label>
                <p className="text-sm text-slate-300">{formData.CPF}</p>
              </div>
            </div>

            {/* Linha 5 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Data Admissão</label>
                <p className="text-sm text-slate-300">{formatDate(formData.DATA_ADMISSAO)}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Função</label>
                <p className="text-sm text-slate-300">{formData.FUNCAO}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Telefone</label>
                <p className="text-sm text-slate-300">{formData.TELEFONE}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nº CNH</label>
                <p className="text-sm text-slate-300">{formData.NCNH}</p>
              </div>
            </div>

            {/* Linha 6 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Categoria CNH</label>
                <p className="text-sm text-slate-300">{formData.CATEGORIA_CNH}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Validade CNH</label>
                <p className="text-sm text-slate-300">{formatDate(formData.VALIDADE_CNH)}</p>
              </div>
              <div></div>
            </div>

            {/* Relato do Colaborador */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Relato do Colaborador</label>
              <div className="p-4 bg-slate-800 border border-slate-600 text-slate-300 text-sm min-h-24 overflow-y-auto whitespace-pre-wrap rounded">
                {formData.RELATO_COLABORADOR || '(Não informado)'}
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: Análise do Supervisor (Read-Only) */}
          <div className="space-y-4 bg-slate-700 p-4 border border-slate-600">
            <h3 className="text-lg font-bold text-white">Análise do Supervisor</h3>

            {/* Relato do Superior */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Relato do Superior</label>
              <div className="p-4 bg-slate-800 border border-slate-600 text-slate-300 text-sm min-h-24 overflow-y-auto whitespace-pre-wrap rounded">
                {formData.RELATO_SUPERIOR || '(Não informado)'}
              </div>
            </div>

            {/* Conclusões (Read-Only) */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-3">Conclusões identificadas:</label>
              
              <div className="space-y-2">
                {[
                  { key: 'falha_operacional', label: 'Falha operacional' },
                  { key: 'condicao_insegura', label: 'Condição insegura' },
                  { key: 'falha_mecanica', label: 'Falha mecânica' },
                  { key: 'condicao_adversa', label: 'Condição adversa/tempo' },
                  { key: 'causa_desconhecida', label: 'Causa desconhecida/furto/outro' }
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-3 cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={conclusoes[item.key]}
                      disabled
                      className="w-4 h-4 accent-[#004927]"
                    />
                    <span className="text-sm text-slate-300">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Assinatura do Superior (Read-Only) */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Assinatura do Supervisor</label>
              <div className="p-3 bg-slate-800 border border-slate-600 text-slate-300 font-bold rounded">
                {formData.ASSINATURA_SUPERVISOR || '(Não informado)'}
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: Assinatura Final do Gerente */}
          <div className="space-y-4 bg-slate-700 p-4 border border-slate-600">
            <h3 className="text-lg font-bold text-white">Aprovação Final</h3>
            
            {isGerenteJaAssinou && (
              <div className="bg-green-900/20 border border-green-600 p-3 rounded">
                <p className="text-sm text-green-300 font-semibold">✓ Apontamento aprovado pelo Gerente</p>
              </div>
            )}

            {/* Assinatura do Gerente */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Assinatura do Gerente *</label>
              <input
                type="text"
                value={assinaturaGerente}
                onChange={(e) => setAssinaturaGerente(e.target.value.toUpperCase())}
                disabled={isGerenteJaAssinou}
                placeholder="Digite seu nome completo"
                className={`w-full px-4 py-2 border outline-none font-bold rounded transition-all ${
                  isGerenteJaAssinou
                    ? 'border-slate-600 bg-slate-800 cursor-not-allowed text-slate-300'
                    : 'border-slate-600 bg-slate-800 text-slate-300 focus:border-[#004927]'
                }`}
              />
            </div>

            {/* Campo de Motivo de Rejeição */}
            {isRejectMode && (
              <div className="bg-red-900/20 border border-red-600 p-4 space-y-3 rounded">
                <h3 className="text-sm font-bold text-red-300">Motivo da Rejeição</h3>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value.toUpperCase())}
                  rows="3"
                  placeholder="Descreva o motivo pelo qual está rejeitando este apontamento..."
                  className="w-full px-4 py-2 border border-red-600 outline-none bg-slate-800 text-slate-300 focus:border-red-500 rounded"
                />
                <p className="text-xs text-red-300">O supervisor receberá este motivo para revisar o apontamento.</p>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-6 border-t border-slate-600">
            {!isBlocked ? (
              <>
                {isRejectMode ? (
                  <>
                    <button
                      onClick={() => handleSign('reject')}
                      disabled={loading || !rejectionReason.trim()}
                      className="flex-1 bg-red-600 text-white font-medium py-2 px-4 hover:bg-red-700 disabled:bg-slate-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 rounded"
                    >
                      <Check size={18} />
                      Confirmar Rejeição
                    </button>
                    <button
                      onClick={() => {
                        setIsRejectMode(false);
                        setRejectionReason('');
                      }}
                      disabled={loading}
                      className="flex-1 bg-slate-700 text-slate-300 font-medium py-2 px-4 hover:bg-slate-600 disabled:opacity-50 transition-colors rounded"
                    >
                      Voltar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSign('approve')}
                      disabled={loading || !assinaturaGerente.trim()}
                      className="flex-1 bg-[#004927] text-white font-medium py-2 px-4 hover:bg-[#003220] disabled:bg-slate-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 rounded"
                    >
                      <Check size={18} />
                      Aprovar
                    </button>
                    
                    <button
                      onClick={() => setIsRejectMode(true)}
                      disabled={loading}
                      className="flex-1 bg-red-600 text-white font-medium py-2 px-4 hover:bg-red-700 disabled:opacity-50 transition-colors rounded"
                    >
                      Rejeitar
                    </button>

                    <button
                      onClick={onClose}
                      disabled={loading}
                      className="px-6 bg-slate-700 text-slate-300 font-medium py-2 hover:bg-slate-600 disabled:opacity-50 transition-colors rounded"
                    >
                      Fechar
                    </button>
                  </>
                )}
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full bg-slate-700 text-slate-300 font-medium py-2 hover:bg-slate-600 transition-colors rounded"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
