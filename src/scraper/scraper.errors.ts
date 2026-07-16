export class InvalidProductUrlError extends Error {
  constructor(url: string) {
    super(`URL inválida para extração de merchant/item: ${url}`);
  }
}

export class ProductNotFoundError extends Error {
  constructor(url: string) {
    super(`Produto não encontrado - URL: ${url}`);
  }
}

export class ForbiddenAccessError extends Error {
  constructor(url: string) {
    super(`Acesso bloqueado (403) pelo iFood - URL: ${url}`);
  }
}
