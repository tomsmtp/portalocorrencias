/**
 * Constants - Constantes globais da aplicação
 * Evita hardcoding de valores repetidos
 */

// Status dos Apontamentos
export const APONTAMENTO_STATUS = {
  NOVO: 'novo',
  PENDENTE_SUPERVISOR: 'pendente_supervisor',
  PENDENTE_GERENTE: 'pendente_gerente',
  REVISAO: 'revisao',
  APROVADO: 'aprovado',
  REJEITADO: 'rejeitado',
  CANCELADO: 'cancelado'
};

// Labels de Status para exibição
export const STATUS_LABELS = {
  [APONTAMENTO_STATUS.NOVO]: 'Novo',
  [APONTAMENTO_STATUS.PENDENTE_SUPERVISOR]: 'Aguardando Supervisor',
  [APONTAMENTO_STATUS.PENDENTE_GERENTE]: 'Aguardando Gerente',
  [APONTAMENTO_STATUS.REVISAO]: 'Em Revisão',
  [APONTAMENTO_STATUS.APROVADO]: 'Aprovado',
  [APONTAMENTO_STATUS.REJEITADO]: 'Rejeitado',
  [APONTAMENTO_STATUS.CANCELADO]: 'Cancelado'
};

// Cores de Status para exibição
export const STATUS_COLORS = {
  [APONTAMENTO_STATUS.NOVO]: 'bg-blue-50 text-blue-900 border-blue-200',
  [APONTAMENTO_STATUS.PENDENTE_SUPERVISOR]: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  [APONTAMENTO_STATUS.PENDENTE_GERENTE]: 'bg-orange-50 text-orange-900 border-orange-200',
  [APONTAMENTO_STATUS.REVISAO]: 'bg-purple-50 text-purple-900 border-purple-200',
  [APONTAMENTO_STATUS.APROVADO]: 'bg-green-50 text-green-900 border-green-200',
  [APONTAMENTO_STATUS.REJEITADO]: 'bg-red-50 text-red-900 border-red-200',
  [APONTAMENTO_STATUS.CANCELADO]: 'bg-slate-50 text-slate-900 border-slate-200'
};

// Conclusões de Investigação
export const CONCLUSOES = {
  FALHA_OPERACIONAL: 'falha_operacional',
  CONDICAO_INSEGURA: 'condicao_insegura',
  FALHA_MECANICA: 'falha_mecanica',
  CONDICAO_ADVERSA: 'condicao_adversa',
  CAUSA_DESCONHECIDA: 'causa_desconhecida'
};

// Labels de Conclusões
export const CONCLUSAO_LABELS = {
  [CONCLUSOES.FALHA_OPERACIONAL]: 'Falha operacional',
  [CONCLUSOES.CONDICAO_INSEGURA]: 'Condição insegura',
  [CONCLUSOES.FALHA_MECANICA]: 'Falha mecânica',
  [CONCLUSOES.CONDICAO_ADVERSA]: 'Condição adversa/tempo',
  [CONCLUSOES.CAUSA_DESCONHECIDA]: 'Causa desconhecida/furto/outro'
};

// Ocorrências disponíveis
export const OCORRENCIAS = [
  'AVARIAS DIVERSAS',
  'COLISÃO',
  'INCÊNDIO',
  'TOMBAMENTO',
  'DANO',
  'FURTO',
  'OUTROS'
];

// Unidades
export const UNIDADES = [
  { id: '115', nome: 'Maracaí' },
  { id: '112', nome: 'Paraguaçu Paulista' },
  { id: '250', nome: 'Anaurilândia' }
];

// Timeout padrão para requisições
export const API_TIMEOUT = 10000; // 10 segundos

// Timeout de sessão
export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos

// Paginação
export const ITEMS_PER_PAGE = 10;

// Tamanho máximo de arquivo
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Comprimento máximo de campos
export const MAX_LENGTH = {
  NOME: 100,
  EMAIL: 100,
  TELEFONE: 20,
  RG: 20,
  CPF: 11,
  MATRICULA: 20,
  NCNH: 12,
  CATEGORIA_CNH: 5,
  TEXTO_CURTO: 100,
  TEXTO_MEDIO: 255,
  TEXTO_LONGO: 2000
};
