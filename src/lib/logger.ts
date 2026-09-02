type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = __DEV__;

const shouldLog = (level: LogLevel): boolean => {
  if (!isDev && level === 'debug') return false;
  return true;
};

export const logger = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) console.log('[DEBUG]', ...args);
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) console.log('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};
