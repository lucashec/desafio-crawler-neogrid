import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { isAxiosError, type AxiosRequestConfig } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { IfoodApiUrlBuilder } from './ifood-api-url.builder';
import { ForbiddenAccessError, ProductNotFoundError } from './scraper.errors';
import { ProductPageClient, ProductPageResult } from './product-page-client';

interface IfoodMerchantItemsResponse {
  data: {
    menu: {
      itens: {
        description: string;
        unitPrice: number;
        logoUrl: string;
      }[];
    }[];
  };
}

@Injectable()
export class AxiosIfoodProductClient implements ProductPageClient {
  private readonly cookieJar = new CookieJar();

  constructor(
    private readonly http: HttpService,
    private readonly urlBuilder: IfoodApiUrlBuilder,
  ) {
    wrapper(this.http.axiosRef);
  }

  async fetchProduct(
    url: string,
    headers: Record<string, string>,
  ): Promise<ProductPageResult> {
    try {
      const response = await this.http.axiosRef.get<IfoodMerchantItemsResponse>(
        this.urlBuilder.build(url),
        {
          headers,
          withCredentials: true,
          jar: this.cookieJar,
        } as AxiosRequestConfig & { jar: CookieJar },
      );

      const item = response.data?.data.menu?.[0]?.itens?.[0];
      if (!item) {
        throw new ProductNotFoundError(url);
      }

      return { item };
    } catch (err) {
      if (err instanceof ProductNotFoundError) {
        throw err;
      }
      if (isAxiosError(err)) {
        if (err.response?.status === 404) {
          throw new ProductNotFoundError(url);
        }
        if (err.response?.status === 403) {
          throw new ForbiddenAccessError(url);
        }
      }
      throw err instanceof Error
        ? err
        : new Error('Erro desconhecido ao processar produto');
    }
  }
}
