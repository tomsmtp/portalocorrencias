/**
 * Validators - Validações reutilizáveis para o formulário
 */

/**
 * Valida CPF
 */
export function isValidCPF(cpf) {
  if (!cpf) return false;
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // Todos os dígitos iguais

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

/**
 * Valida email
 */
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida telefone (formato: (XX) 9XXXX-XXXX ou similar)
 */
export function isValidPhone(phone) {
  if (!phone) return false;
  const regex = /^(\+\d{1,3})?[\s.-]?(\d{1,4})[\s.-]?(\d{1,4})[\s.-]?(\d{1,9})$/;
  return regex.test(phone.replace(/\D/g, '')) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * Valida data (YYYY-MM-DD ou DD/MM/YYYY)
 */
export function isValidDate(date) {
  if (!date) return false;

  // Se for formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm)
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate);
  }

  // Se for formato brasileiro (DD/MM/YYYY)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [day, month, year] = date.split('/');
    const parsedDate = new Date(`${year}-${month}-${day}`);
    return parsedDate instanceof Date && !isNaN(parsedDate);
  }

  return false;
}

/**
 * Valida data futura (não permite datas no futuro)
 */
export function isNotFutureDate(date) {
  if (!date) return true;
  
  let parsedDate;
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
    parsedDate = new Date(date);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [day, month, year] = date.split('/');
    parsedDate = new Date(`${year}-${month}-${day}`);
  } else {
    return false;
  }

  return parsedDate <= new Date();
}

/**
 * Valida matrícula (número inteiro)
 */
export function isValidMatricula(matricula) {
  if (!matricula) return false;
  return /^\d+$/.test(matricula.toString());
}

/**
 * Valida CNH (número inteiro com 11 dígitos)
 */
export function isValidCNH(cnh) {
  if (!cnh) return false;
  const digits = cnh.replace(/\D/g, '');
  return digits.length === 11;
}

/**
 * Valida RG (formato flexível)
 */
export function isValidRG(rg) {
  if (!rg) return false;
  return rg.length >= 5; // RG mínimo com 5 caracteres
}

/**
 * Valida se campo obrigatório está preenchido
 */
export function isRequired(value) {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return !!value;
}

/**
 * Valida comprimento mínimo
 */
export function minLength(value, min) {
  if (!value) return false;
  return value.toString().length >= min;
}

/**
 * Valida comprimento máximo
 */
export function maxLength(value, max) {
  if (!value) return true;
  return value.toString().length <= max;
}

/**
 * Formata CPF para exibição (XXX.XXX.XXX-XX)
 */
export function formatCPF(cpf) {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata telefone para exibição ((XX) 9XXXX-XXXX)
 */
export function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

/**
 * Formata data de YYYY-MM-DD para DD/MM/YYYY
 */
export function formatDateToBR(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Formata data de DD/MM/YYYY para YYYY-MM-DD
 */
export function formatDateToISO(dateStr) {
  if (!dateStr) return '';
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
}
