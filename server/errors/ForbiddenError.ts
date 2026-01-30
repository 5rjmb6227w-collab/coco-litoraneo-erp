import { AppError } from './AppError';

/**
 * Erro para requisições não autorizadas (HTTP 403).
 * Usado quando o usuário está autenticado mas não tem permissão para a ação.
 */
export class ForbiddenError extends AppError {
  public readonly requiredPermission?: string;
  public readonly userRole?: string;

  constructor(
    message: string = 'Você não tem permissão para realizar esta ação.',
    requiredPermission?: string,
    userRole?: string
  ) {
    super(
      message,
      403,
      'FORBIDDEN',
      true,
      { requiredPermission, userRole }
    );

    this.requiredPermission = requiredPermission;
    this.userRole = userRole;
  }

  /**
   * Factory method para acesso negado a recurso
   */
  static resourceAccess(resource: string): ForbiddenError {
    return new ForbiddenError(
      `Você não tem permissão para acessar ${resource}.`
    );
  }

  /**
   * Factory method para ação não permitida
   */
  static actionNotAllowed(action: string): ForbiddenError {
    return new ForbiddenError(
      `Você não tem permissão para ${action}.`
    );
  }

  /**
   * Factory method para permissão específica requerida
   */
  static requiresPermission(permission: string, userRole?: string): ForbiddenError {
    return new ForbiddenError(
      `Esta ação requer a permissão '${permission}'.`,
      permission,
      userRole
    );
  }

  /**
   * Factory method para acesso apenas de administrador
   */
  static adminOnly(): ForbiddenError {
    return new ForbiddenError(
      'Esta ação é restrita a administradores.',
      'admin',
      undefined
    );
  }

  /**
   * Factory method para acesso apenas do proprietário
   */
  static ownerOnly(): ForbiddenError {
    return new ForbiddenError(
      'Você só pode modificar seus próprios recursos.'
    );
  }

  /**
   * Factory method para recurso bloqueado
   */
  static resourceLocked(resource: string): ForbiddenError {
    return new ForbiddenError(
      `${resource} está bloqueado e não pode ser modificado.`
    );
  }
}

export default ForbiddenError;
