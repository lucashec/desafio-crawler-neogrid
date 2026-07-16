export interface ScrapeResult {
  title: string | null;
  normal_price: number | null;
  discount_price: number | null;
  product_url: string;
  image_url: string | null;
  status: 'success' | 'error';
  error_message: string | null;
}

export interface ScrapeApiResult {
  data: {
    menu: {
      itens: ItemApiResult[];
    }[];
  };
}

export interface ItemApiResult {
  description: string;
  unitPrice: number;
  logoUrl: string;
}
