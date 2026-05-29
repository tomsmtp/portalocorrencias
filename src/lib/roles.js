/**
 * Utilitários para padronização de cargos/níveis de usuário
 */

// Valores padrão de cargo
export const ROLES = {
  VISITANTE: 'visitante',
  SUPERVISOR: 'supervisor',
  GERENTE: 'gerente',
  ADMIN: 'admin'
};

// Mapear cargo para label legível
export const getRoleLabel = (cargo) => {
  const labels = {
    'visitante': 'Visitante',
    'supervisor': 'Supervisor',
    'gerente': 'Gerente',
    'admin': 'Administrador'
  };
  return labels[cargo?.toLowerCase()] || (cargo || 'Desconhecido');
};

// Verificar permissões
export const isVisitor = (cargo) => cargo?.toLowerCase() === ROLES.VISITANTE;
export const isSupervisor = (cargo) => cargo?.toLowerCase() === ROLES.SUPERVISOR;
export const isGerente = (cargo) => cargo?.toLowerCase() === ROLES.GERENTE;
export const isAdmin = (cargo) => cargo?.toLowerCase() === ROLES.ADMIN;

// Backward compatibility
export const isComum = (cargo) => isVisitor(cargo);

// Verificar se pode acessar dashboard
export const canAccessDashboard = (cargo) => isGerente(cargo) || isAdmin(cargo);

// Verificar se pode criar apontamentos
export const canCreateApontamentos = (cargo) => isVisitor(cargo) || isSupervisor(cargo);

// Verificar se pode editar apontamentos
export const canEditApontamentos = (cargo) => isSupervisor(cargo) || isGerente(cargo);
