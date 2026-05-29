import React from 'react';
import { X } from 'lucide-react';

export function BoletimVisualizacao({ isOpen, onClose, apontamento }) {
  if (!isOpen || !apontamento) return null;

  // Formata data removendo hora
  const formatDate = (dateStr) => {
    if (!dateStr) return '(Não informado)';
    // Remove hora: "2026-05-28T17:26:00" → "2026-05-28"
    return dateStr.split('T')[0].split(' ')[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl max-h-[95vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Boletim de Ocorrência</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-8 space-y-8 bg-white">
          {/* Título principal */}
          <div className="text-center border-b-2 border-black pb-4">
            <h1 className="text-2xl font-bold">BOLETIM DE OCORRÊNCIA</h1>
            <p className="text-sm mt-2">B.O. Nº: <strong>{apontamento.nboletim || '(Não informado)'}</strong></p>
          </div>

          {/* DADOS DO APONTAMENTO */}
          <div className="border-2 border-slate-400 bg-slate-100 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Dados do Apontamento</h3>
            
            {/* Grid de informações básicas - 4 colunas */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">B.O.</p>
                <p className="text-sm font-bold text-slate-900">{apontamento.nboletim || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Data Ocorrência</p>
                <p className="text-sm text-slate-900">{formatDate(apontamento.data_ocorrido)}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Data Apontamento/Portaria</p>
                <p className="text-sm text-slate-900">{formatDate(apontamento.data_portaria)}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Ocorrência</p>
                <p className="text-sm font-bold text-slate-900">{apontamento.ocorrencia || '(Não informado)'}</p>
              </div>
            </div>

            {/* Segunda linha - Local, Área, Município */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Local</p>
                <p className="text-sm text-slate-900">{apontamento.local || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Área</p>
                <p className="text-sm text-slate-900">{apontamento.area || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Município</p>
                <p className="text-sm text-slate-900">{apontamento.municipio || '(Não informado)'}</p>
              </div>
            </div>

            {/* Terceira linha - Unidade, Equipamento, Elaborado por, Supervisor */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Unidade</p>
                <p className="text-sm text-slate-900">{apontamento.unidade || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Equipamento</p>
                <p className="text-sm text-slate-900">{apontamento.equipamento || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Elaborado por</p>
                <p className="text-sm text-slate-900">{apontamento.elaborado_por || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Supervisor</p>
                <p className="text-sm text-slate-900">{apontamento.supervisor || '(Não informado)'}</p>
              </div>
            </div>

            {/* Quarta linha - Email Supervisor, Frota, Safra */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Email Supervisor</p>
                <p className="text-sm text-slate-900">{apontamento.email_supervisor || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Frota</p>
                <p className="text-sm text-slate-900">{apontamento.frota || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Safra</p>
                <p className="text-sm text-slate-900">{apontamento.safra || '(Não informado)'}</p>
              </div>
            </div>
          </div>

          {/* DADOS DO COLABORADOR */}
          <div className="border-2 border-slate-400 bg-slate-100 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Dados do Colaborador</h3>
            
            {/* Primeira linha - Colaborador, Matrícula, RG, CPF */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-slate-300 p-3 rounded col-span-1">
                <p className="text-xs font-bold text-slate-600 mb-1">Colaborador</p>
                <p className="text-sm font-bold text-slate-900">{apontamento.colaborador || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Matrícula</p>
                <p className="text-sm text-slate-900">{apontamento.matricula || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">RG</p>
                <p className="text-sm text-slate-900">{apontamento.rg || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">CPF</p>
                <p className="text-sm text-slate-900">{apontamento.cpf || '(Não informado)'}</p>
              </div>
            </div>

            {/* Segunda linha - Data Admissão, Função, Telefone, Nº CNH */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Data Admissão</p>
                <p className="text-sm text-slate-900">{formatDate(apontamento.data_admissao)}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Função</p>
                <p className="text-sm text-slate-900">{apontamento.funcao || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Telefone</p>
                <p className="text-sm text-slate-900">{apontamento.telefone || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Nº CNH</p>
                <p className="text-sm text-slate-900">{apontamento.ncnh || '(Não informado)'}</p>
              </div>
            </div>

            {/* Terceira linha - Categoria CNH, Validade CNH */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Categoria CNH</p>
                <p className="text-sm text-slate-900">{apontamento.categoria_cnh || '(Não informado)'}</p>
              </div>
              <div className="bg-white border border-slate-300 p-3 rounded">
                <p className="text-xs font-bold text-slate-600 mb-1">Validade CNH</p>
                <p className="text-sm text-slate-900">{formatDate(apontamento.validade_cnh)}</p>
              </div>
            </div>
          </div>

          {/* RELATO DO COLABORADOR */}
          <div className="border-2 border-slate-400 bg-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Relato do Colaborador</h3>
            <div className="bg-white border border-slate-300 p-4 rounded min-h-20 text-sm text-slate-900 whitespace-pre-wrap">
              {apontamento.relato_colaborador || '(Não informado)'}
            </div>
          </div>

          {/* RELATO DO SUPERIOR */}
          <div className="border-2 border-slate-400 bg-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Relato do Superior</h3>
            <div className="bg-white border border-slate-300 p-4 rounded min-h-20 text-sm text-slate-900 whitespace-pre-wrap">
              {apontamento.relato_superior || '(Não informado)'}
            </div>
          </div>

          {/* CONCLUSÃO */}
          <div className="border-2 border-slate-400 bg-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Conclusão</h3>
            <div className="bg-white border border-slate-300 p-4 rounded text-sm text-slate-900 whitespace-pre-wrap">
              {apontamento.conclusao_causa ? apontamento.conclusao_causa : '(Não informado)'}
            </div>
          </div>

          {/* ASSINATURAS */}
          <div className="mt-12 pt-12 border-t-2 border-black">
            <div className="grid grid-cols-2 gap-12">
              <div className="text-center">
                <div className="border-t-2 border-black mb-8 min-h-16"></div>
                <p className="font-bold text-sm">{apontamento.supervisor || ''}</p>
                <p className="text-sm text-slate-600">Supervisor</p>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-black mb-8 min-h-16"></div>
                <p className="font-bold text-sm">{apontamento.assinatura_gerente || ''}</p>
                <p className="text-sm text-slate-600">Gerente</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
