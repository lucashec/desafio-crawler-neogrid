export interface ProductPageItem {
  description: string;
  unitPrice: number;
  logoUrl: string;
}

export interface ProductPageResult {
  item: ProductPageItem | null;
}

export const PRODUCT_PAGE_CLIENT = Symbol('PRODUCT_PAGE_CLIENT');

export interface ProductPageClient {
  fetchProduct(
    url: string,
    headers: Record<string, string>,
  ): Promise<ProductPageResult>;
}
