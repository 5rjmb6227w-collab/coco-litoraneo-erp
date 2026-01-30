import { AppError } from './AppError';

/**
 * Erro para recursos não encontrados (HTTP 404).
 * Usado quando uma entidade solicitada não existe no banco de dados.
 */
export class NotFoundError extends AppError {
  public readonly entityType: string;
  public readonly entityId?: string | number;

  constructor(
    entityType: string,
    entityId?: string | number,
    message?: string
  ) {
    const defaultMessage = entityId
      ? `${entityType} com ID '${entityId}' não encontrado`
      : `${entityType} não encontrado`;

    super(
      message || defaultMessage,
      404,
      'NOT_FOUND',
      true,
      { entityType, entityId }
    );

    this.entityType = entityType;
    this.entityId = entityId;
  }

  /**
   * Factory method para criar erro de produtor não encontrado
   */
  static producer(id: string | number): NotFoundError {
    return new NotFoundError('Produtor', id);
  }

  /**
   * Factory method para criar erro de carga não encontrada
   */
  static load(id: string | number): NotFoundError {
    return new NotFoundError('Carga', id);
  }

  /**
   * Factory method para criar erro de lote não encontrado
   */
  static batch(id: string | number): NotFoundError {
    return new NotFoundError('Lote', id);
  }

  /**
   * Factory method para criar erro de ordem de produção não encontrada
   */
  static productionOrder(id: string | number): NotFoundError {
    return new NotFoundError('Ordem de Produção', id);
  }

  /**
   * Factory method para criar erro de SKU não encontrado
   */
  static sku(id: string | number): NotFoundError {
    return new NotFoundError('SKU', id);
  }

  /**
   * Factory method para criar erro de usuário não encontrado
   */
  static user(id: string | number): NotFoundError {
    return new NotFoundError('Usuário', id);
  }

  /**
   * Factory method para criar erro de item de almoxarifado não encontrado
   */
  static warehouseItem(id: string | number): NotFoundError {
    return new NotFoundError('Item de Almoxarifado', id);
  }

  /**
   * Factory method para criar erro de pagamento não encontrado
   */
  static payment(id: string | number): NotFoundError {
    return new NotFoundError('Pagamento', id);
  }
}

export default NotFoundError;
