import { AppError } from './AppError';

/**
 * Representa um erro de validação de um campo específico.
 */
export interface FieldError {
  field: string;
  message: string;
  value?: unknown;
  constraint?: string;
}

/**
 * Erro para dados de entrada inválidos (HTTP 400).
 * Usado quando os dados enviados pelo cliente não passam na validação.
 */
export class ValidationError extends AppError {
  public readonly fieldErrors: FieldError[];

  constructor(
    message: string = 'Dados de entrada inválidos.',
    fieldErrors: FieldError[] = []
  ) {
    super(
      message,
      400,
      'VALIDATION_ERROR',
      true,
      { fieldErrors }
    );

    this.fieldErrors = fieldErrors;
  }

  /**
   * Factory method para campo obrigatório
   */
  static required(field: string): ValidationError {
    return new ValidationError(
      `O campo '${field}' é obrigatório.`,
      [{ field, message: 'Campo obrigatório', constraint: 'required' }]
    );
  }

  /**
   * Factory method para múltiplos campos obrigatórios
   */
  static requiredFields(fields: string[]): ValidationError {
    const fieldErrors = fields.map(field => ({
      field,
      message: 'Campo obrigatório',
      constraint: 'required'
    }));

    return new ValidationError(
      `Os campos ${fields.join(', ')} são obrigatórios.`,
      fieldErrors
    );
  }

  /**
   * Factory method para formato inválido
   */
  static invalidFormat(field: string, expectedFormat: string): ValidationError {
    return new ValidationError(
      `O campo '${field}' deve estar no formato ${expectedFormat}.`,
      [{ field, message: `Formato esperado: ${expectedFormat}`, constraint: 'format' }]
    );
  }

  /**
   * Factory method para valor fora do intervalo
   */
  static outOfRange(field: string, min?: number, max?: number): ValidationError {
    let message = `O campo '${field}' está fora do intervalo permitido`;
    if (min !== undefined && max !== undefined) {
      message += ` (${min} - ${max})`;
    } else if (min !== undefined) {
      message += ` (mínimo: ${min})`;
    } else if (max !== undefined) {
      message += ` (máximo: ${max})`;
    }

    return new ValidationError(
      message + '.',
      [{ field, message, constraint: 'range' }]
    );
  }

  /**
   * Factory method para valor duplicado
   */
  static duplicate(field: string, value: unknown): ValidationError {
    return new ValidationError(
      `Já existe um registro com ${field} = '${value}'.`,
      [{ field, message: 'Valor já existe', value, constraint: 'unique' }]
    );
  }

  /**
   * Factory method para tipo inválido
   */
  static invalidType(field: string, expectedType: string): ValidationError {
    return new ValidationError(
      `O campo '${field}' deve ser do tipo ${expectedType}.`,
      [{ field, message: `Tipo esperado: ${expectedType}`, constraint: 'type' }]
    );
  }

  /**
   * Factory method para tamanho inválido
   */
  static invalidLength(field: string, minLength?: number, maxLength?: number): ValidationError {
    let message = `O campo '${field}' tem tamanho inválido`;
    if (minLength !== undefined && maxLength !== undefined) {
      message += ` (${minLength} - ${maxLength} caracteres)`;
    } else if (minLength !== undefined) {
      message += ` (mínimo: ${minLength} caracteres)`;
    } else if (maxLength !== undefined) {
      message += ` (máximo: ${maxLength} caracteres)`;
    }

    return new ValidationError(
      message + '.',
      [{ field, message, constraint: 'length' }]
    );
  }

  /**
   * Factory method para email inválido
   */
  static invalidEmail(field: string = 'email'): ValidationError {
    return new ValidationError(
      'Endereço de e-mail inválido.',
      [{ field, message: 'E-mail inválido', constraint: 'email' }]
    );
  }

  /**
   * Factory method para CPF/CNPJ inválido
   */
  static invalidDocument(field: string, type: 'CPF' | 'CNPJ'): ValidationError {
    return new ValidationError(
      `${type} inválido.`,
      [{ field, message: `${type} inválido`, constraint: 'document' }]
    );
  }

  /**
   * Factory method para data inválida
   */
  static invalidDate(field: string): ValidationError {
    return new ValidationError(
      `O campo '${field}' contém uma data inválida.`,
      [{ field, message: 'Data inválida', constraint: 'date' }]
    );
  }

  /**
   * Factory method para múltiplos erros de validação
   */
  static fromFieldErrors(fieldErrors: FieldError[]): ValidationError {
    const message = fieldErrors.length === 1
      ? fieldErrors[0].message
      : `${fieldErrors.length} erros de validação encontrados.`;

    return new ValidationError(message, fieldErrors);
  }

  /**
   * Adiciona um erro de campo à lista
   */
  addFieldError(error: FieldError): this {
    this.fieldErrors.push(error);
    return this;
  }

  /**
   * Verifica se há erros para um campo específico
   */
  hasErrorForField(field: string): boolean {
    return this.fieldErrors.some(e => e.field === field);
  }

  /**
   * Obtém erros de um campo específico
   */
  getErrorsForField(field: string): FieldError[] {
    return this.fieldErrors.filter(e => e.field === field);
  }
}

export default ValidationError;
