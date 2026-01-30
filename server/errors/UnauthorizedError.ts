import { AppError } from './AppError';

/**
 * Erro para requisições não autenticadas (HTTP 401).
 * Usado quando o usuário não está logado ou o token é inválido.
 */
export class UnauthorizedError extends AppError {
  public readonly reason: string;

  constructor(
    message: string = 'Não autorizado. Faça login para continuar.',
    reason: string = 'INVALID_CREDENTIALS'
  ) {
    super(
      message,
      401,
      'UNAUTHORIZED',
      true,
      { reason }
    );

    this.reason = reason;
  }

  /**
   * Factory method para token expirado
   */
  static tokenExpired(): UnauthorizedError {
    return new UnauthorizedError(
      'Sessão expirada. Faça login novamente.',
      'TOKEN_EXPIRED'
    );
  }

  /**
   * Factory method para token inválido
   */
  static invalidToken(): UnauthorizedError {
    return new UnauthorizedError(
      'Token de autenticação inválido.',
      'INVALID_TOKEN'
    );
  }

  /**
   * Factory method para token ausente
   */
  static missingToken(): UnauthorizedError {
    return new UnauthorizedError(
      'Token de autenticação não fornecido.',
      'MISSING_TOKEN'
    );
  }

  /**
   * Factory method para credenciais inválidas
   */
  static invalidCredentials(): UnauthorizedError {
    return new UnauthorizedError(
      'Credenciais inválidas. Verifique seu usuário e senha.',
      'INVALID_CREDENTIALS'
    );
  }

  /**
   * Factory method para sessão inválida
   */
  static invalidSession(): UnauthorizedError {
    return new UnauthorizedError(
      'Sessão inválida ou expirada.',
      'INVALID_SESSION'
    );
  }
}

export default UnauthorizedError;
