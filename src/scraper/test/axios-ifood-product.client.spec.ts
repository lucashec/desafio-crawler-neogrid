import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';

jest.mock('axios-cookiejar-support', () => ({
  wrapper: (axiosInstance: unknown) => axiosInstance,
}));

import { AxiosIfoodProductClient } from '../axios-ifood-product.client';
import { IfoodApiUrlBuilder } from '../ifood-api-url.builder';
import { ForbiddenAccessError, ProductNotFoundError } from '../scraper.errors';

describe('AxiosIfoodProductClient', () => {
  let client: AxiosIfoodProductClient;
  let httpService: HttpService;
  const url =
    'https://www.ifood.com.br/delivery/restaurante/a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789?item=11223344-5566-7788-99aa-bbccddeeff00';

  beforeEach(() => {
    httpService = new HttpService();
    client = new AxiosIfoodProductClient(httpService, new IfoodApiUrlBuilder());
  });

  it('deve retornar o item quando a resposta contém o menu', async () => {
    jest.spyOn(httpService.axiosRef, 'get').mockResolvedValue({
      data: {
        data: {
          menu: [
            {
              itens: [
                {
                  description: 'Produto teste',
                  unitPrice: 19.9,
                  logoUrl: 'imagem.jpg',
                },
              ],
            },
          ],
        },
      },
    });

    const result = await client.fetchProduct(url, {});

    expect(result.item).toEqual({
      description: 'Produto teste',
      unitPrice: 19.9,
      logoUrl: 'imagem.jpg',
    });
  });

  it('deve lançar ProductNotFoundError quando a resposta não tem menu', async () => {
    jest.spyOn(httpService.axiosRef, 'get').mockResolvedValue({
      data: { data: { menu: [] } },
    });

    await expect(client.fetchProduct(url, {})).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });

  it('deve lançar ProductNotFoundError quando o axios retorna 404', async () => {
    const error = buildAxiosError(404);
    jest.spyOn(httpService.axiosRef, 'get').mockRejectedValue(error);

    await expect(client.fetchProduct(url, {})).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });

  it('deve lançar ForbiddenAccessError quando o axios retorna 403', async () => {
    const error = buildAxiosError(403);
    jest.spyOn(httpService.axiosRef, 'get').mockRejectedValue(error);

    await expect(client.fetchProduct(url, {})).rejects.toBeInstanceOf(
      ForbiddenAccessError,
    );
  });

  it('deve relançar outros erros inalterados', async () => {
    const error = new Error('falha de rede');
    jest.spyOn(httpService.axiosRef, 'get').mockRejectedValue(error);

    await expect(client.fetchProduct(url, {})).rejects.toBe(error);
  });
});

function buildAxiosError(status: number): AxiosError {
  const error = new AxiosError(
    `Request failed with status code ${status}`,
    String(status),
    undefined,
    undefined,
    {
      status,
      statusText: '',
      headers: {},
      config: {} as never,
      data: {},
    } as never,
  );
  return error;
}
