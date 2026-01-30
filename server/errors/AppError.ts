/**
 * Classe base para todos os erros da aplicação.
 * Segue o princípio SOLID de Single Responsibility - apenas representa erros.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();

    // Mantém o stack trace correto
    Error.captureStackTrace(this, this.constructor);
    
    // Define o nome da classe para melhor debugging
    Object.defineProperty(this, 'name', { value: this.constructor.name });
  }

  /**
   * Serializa o erro para resposta HTTP
   */
  toJSON(): Record<string, unknown> {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
      },
    };
  }

  /**
   * Verifica se um erro é uma instância de AppError
   */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }
}

export default AppError;
