import { IfoodApiUrlBuilder } from '../ifood-api-url.builder';
import { InvalidProductUrlError } from '../scraper.errors';

describe('IfoodApiUrlBuilder', () => {
  let builder: IfoodApiUrlBuilder;

  beforeEach(() => {
    builder = new IfoodApiUrlBuilder();
  });

  it('deve montar a URL da API a partir de uma URL de produto válida', () => {
    const url =
      'https://www.ifood.com.br/delivery/restaurante/a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789?item=11223344-5566-7788-99aa-bbccddeeff00';

    const result = builder.build(url);

    expect(result).toBe(
      'https://www.ifood.com.br/site-api/v1/merchants/restaurant/a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789/items/11223344-5566-7788-99aa-bbccddeeff00',
    );
  });

  it('deve lançar InvalidProductUrlError quando a URL não contém merchantId/itemId', () => {
    const url = 'https://www.ifood.com.br/delivery/restaurante/sem-ids';

    expect(() => builder.build(url)).toThrow(InvalidProductUrlError);
  });
});
