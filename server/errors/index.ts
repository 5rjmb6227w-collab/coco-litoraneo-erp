/**
 * Módulo de erros customizados da aplicação.
 * 
 * Segue os princípios SOLID:
 * - S: Cada classe de erro tem uma responsabilidade única
 * - O: Classes podem ser estendidas sem modificar o código existente
 * - L: Todas as classes de erro podem ser usadas onde AppError é esperado
 * - I: Interfaces específicas para cada tipo de erro
 * - D: Dependência de abstrações (AppError) ao invés de implementações concretas
 */

import { AppError } from './AppError';
import { NotFoundError } from './NotFoundError';
import { UnauthorizedError } from './UnauthorizedError';
import { ForbiddenError } from './ForbiddenError';
import { ValidationError, type FieldError } from './ValidationError';
import { BusinessError } from './BusinessError';

// Re-exportar todas as classes
export { AppError } from './AppError';
export { NotFoundError } from './NotFoundError';
export { UnauthorizedError } from './UnauthorizedError';
export { ForbiddenError } from './ForbiddenError';
export { ValidationError, type FieldError } from './ValidationError';
export { BusinessError } from './BusinessError';

/**
 * Type guard para verificar se um erro é operacional (esperado)
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Converte um erro desconhecido em AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      500,
      'INTERNAL_ERROR',
      false,
      { originalError: error.name, stack: error.stack }
    );
  }

  return new AppError(
    'Erro interno do servidor',
    500,
    'INTERNAL_ERROR',
    false,
    { originalError: String(error) }
  );
}

/**
 * Handler de erro para uso em middlewares ou catch blocks
 */
export function handleError(error: unknown): {
  statusCode: number;
  body: Record<string, unknown>;
} {
  const appError = toAppError(error);
  
  return {
    statusCode: appError.statusCode,
    body: appError.toJSON(),
  };
}
