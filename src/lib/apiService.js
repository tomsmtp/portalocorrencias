/**
 * API Service Layer
 * Centraliza todas as chamadas HTTP com tratamento de erro consistente
 */

import { logError, logApiError, logInfo } from './logger';

const API_TIMEOUT = 10000; // 10 segundos

/**
 * Obtém token JWT do localStorage
 */
function getToken() {
  return localStorage.getItem('agromanager_token');
}

/**
 * Salva token JWT no localStorage
 */
function setToken(token) {
  if (token) {
    localStorage.setItem('agromanager_token', token);
  } else {
    localStorage.removeItem('agromanager_token');
  }
}

/**
 * Headers padrão com autenticação
 */
function getHeaders(includeAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Faz request com timeout e autenticação automática
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: getHeaders(options.includeAuth !== false),
    });

    clearTimeout(timeoutId);

    // Se receber 401, token expirou
    if (response.status === 401) {
      setToken(null);
      localStorage.removeItem('agromanager_user');
      window.location.href = '/';
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Requisição expirou. Verifique sua conexão.');
    }
    throw error;
  }
}

/**
 * Login - Autenticar usuário com email e senha (novo com JWT)
 */
export async function apiLogin(email, senha) {
  const endpoint = `${import.meta.env.VITE_ENDPOINT_USERS}login/`;
  if (!endpoint) throw new Error('Endpoint não configurado: VITE_ENDPOINT_USERS');

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    includeAuth: false,
    body: JSON.stringify({ email, senha }),
  });

  if (response.status !== 'sucesso') {
    throw new Error(response.mensagem || 'Erro ao fazer login');
  }

  // Salva o token JWT
  if (response.token) {
    setToken(response.token);
  }

  // Retorna os dados do usuário em formato esperado
  return {
    nome: response.user?.nome || '',
    cargo: response.user?.nivel || '',
    email: response.user?.email || email,
    matricula: response.user?.matricula || '',
    id: response.user?.id || 0
  };
}

/**
 * Criar novo apontamento
 */
export async function apiCriarApontamento(formData) {
  const endpoint = import.meta.env.VITE_CRIAR_APONTAMENTO_POST;
  if (!endpoint) throw new Error('Endpoint não configurado: VITE_CRIAR_APONTAMENTO_POST');

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  return response;
}

/**
 * Buscar todos os apontamentos
 */
export async function apiListarApontamentos() {
  const endpoint = import.meta.env.VITE_CRIAR_APONTAMENTO_GET;
  if (!endpoint) throw new Error('Endpoint não configurado: VITE_CRIAR_APONTAMENTO_GET');

  const response = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return Array.isArray(response) ? response : [];
}

/**
 * Atualizar apontamento
 * Backend: usa POST para criar OU atualizar (se NBOLETIM já existe)
 */
export async function apiAtualizarApontamento(nboletim, formData) {
  if (!nboletim) throw new Error('NBOLETIM é obrigatório');
  
  const endpoint = import.meta.env.VITE_CRIAR_APONTAMENTO_POST;
  if (!endpoint) throw new Error('Endpoint não configurado: VITE_CRIAR_APONTAMENTO_POST');

  console.log('[DEBUG] Atualizando apontamento via POST:', { nboletim });

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  return response;
}

/**
 * Listar usuários (admin)
 */
export async function apiListarUsuarios() {
  const endpoint = import.meta.env.VITE_ENDPOINT_USERS;
  if (!endpoint) throw new Error('Endpoint não configurado: VITE_ENDPOINT_USERS');

  const response = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return Array.isArray(response) ? response : [];
}

/**
 * Criar usuário (admin)
 */
export async function apiCriarUsuario(userData) {
  const endpoint = import.meta.env.VITE_ENDPOINT_USERS;
  if (!endpoint) throw new Error('Endpoint não configurado: VITE_ENDPOINT_USERS');

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  return response;
}

/**
 * Atualizar usuário (admin)
 */
export async function apiAtualizarUsuario(userId, userData) {
  if (!userId) throw new Error('ID do usuário é obrigatório');
  
  const endpoint = import.meta.env.VITE_ENDPOINT_USERS;
  if (!endpoint) throw new Error('Endpoint não configurado: VITE_ENDPOINT_USERS');

  const url = `${endpoint}${userId}/`;

  const response = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  return response;
}

/**
 * Deletar usuário (admin)
 */
export async function apiDeletarUsuario(userId) {
  if (!userId) throw new Error('ID do usuário é obrigatório');
  
  const endpoint = import.meta.env.VITE_ENDPOINT_USERS;
  if (!endpoint) throw new Error('Endpoint não configurado: VITE_ENDPOINT_USERS');

  const url = `${endpoint}${userId}/`;

  await fetchWithTimeout(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  return { success: true };
}

/**
 * Tratador de erro genérico
 */
export function handleApiError(error) {
  console.error('API Error:', error);

  if (error.message.includes('HTTP 401')) {
    return 'Não autorizado. Faça login novamente.';
  }
  if (error.message.includes('HTTP 403')) {
    return 'Acesso negado.';
  }
  if (error.message.includes('HTTP 404')) {
    return 'Recurso não encontrado.';
  }
  if (error.message.includes('HTTP 500')) {
    return 'Erro no servidor. Tente novamente mais tarde.';
  }
  if (error.message.includes('expirou')) {
    return 'Conexão lenta. Verifique sua internet.';
  }
  
  return error.message || 'Erro na requisição. Tente novamente.';
}
