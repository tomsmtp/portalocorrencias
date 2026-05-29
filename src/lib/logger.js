/**
 * Logger - Sistema centralizado de logging
 * Facilita debugging e auditoria
 */

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

const LOG_COLORS = {
  DEBUG: 'color: #gray',
  INFO: 'color: #0066cc',
  WARN: 'color: #ff9900',
  ERROR: 'color: #cc0000'
};

/**
 * Log interno
 */
function logToConsole(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `%c${prefix}`,
      LOG_COLORS[level],
      message,
      data || ''
    );
  }

  // Em produção, enviar erros para servidor de logging (opcional)
  if (level === LOG_LEVELS.ERROR && process.env.NODE_ENV === 'production') {
    // logToServer(level, message, data);
  }
}

/**
 * Log de DEBUG
 */
export function logDebug(message, data = null) {
  logToConsole(LOG_LEVELS.DEBUG, message, data);
}

/**
 * Log de INFO
 */
export function logInfo(message, data = null) {
  logToConsole(LOG_LEVELS.INFO, message, data);
}

/**
 * Log de WARNING
 */
export function logWarn(message, data = null) {
  logToConsole(LOG_LEVELS.WARN, message, data);
}

/**
 * Log de ERROR
 */
export function logError(message, error = null) {
  const errorData = {
    message: error?.message || error?.toString(),
    stack: error?.stack,
    timestamp: new Date().toISOString()
  };
  logToConsole(LOG_LEVELS.ERROR, message, errorData);
}

/**
 * Log de ação de usuário (auditoria)
 */
export function logAction(user, action, details = null) {
  const auditLog = {
    user: user?.nome || 'unknown',
    cargo: user?.cargo || 'unknown',
    action,
    details,
    timestamp: new Date().toISOString()
  };

  console.log('[AUDIT]', auditLog);

  // Em produção, enviar para servidor de auditoria
  if (process.env.NODE_ENV === 'production') {
    // sendAuditToServer(auditLog);
  }
}

/**
 * Log de erro de API
 */
export function logApiError(endpoint, method, error, statusCode = null) {
  const apiError = {
    endpoint,
    method,
    statusCode,
    message: error?.message,
    stack: error?.stack,
    timestamp: new Date().toISOString()
  };

  logError(`API Error: ${method} ${endpoint}`, error);

  // Em produção, enviar para servidor
  if (process.env.NODE_ENV === 'production') {
    // sendErrorToServer(apiError);
  }
}

/**
 * Log de performance
 */
export function logPerformance(label, duration) {
  console.log(`%c[PERF] ${label}: ${duration}ms`, 'color: #009900', '');
}
