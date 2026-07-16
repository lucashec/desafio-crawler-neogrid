import { CurlHeadersParser } from '../curl-headers.parser';

describe('CurlHeadersParser', () => {
  let parser: CurlHeadersParser;

  beforeEach(() => {
    parser = new CurlHeadersParser();
  });

  it('deve extrair headers -H de um comando curl', () => {
    const curl = `curl 'https://www.ifood.com.br' -H 'Accept: application/json' -H 'User-Agent: Mozilla/5.0'`;

    const headers = parser.parse(curl);

    expect(headers).toEqual({
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0',
    });
  });

  it('deve mapear a flag -b para o header Cookie', () => {
    const curl = `curl 'https://www.ifood.com.br' -b 'session=abc123; other=xyz'`;

    const headers = parser.parse(curl);

    expect(headers).toEqual({ Cookie: 'session=abc123; other=xyz' });
  });

  it('deve ignorar valores de header sem separador ":"', () => {
    const curl = `curl 'https://www.ifood.com.br' -H 'invalido-sem-dois-pontos'`;

    const headers = parser.parse(curl);

    expect(headers).toEqual({});
  });

  it('deve retornar objeto vazio quando não há headers no curl', () => {
    const headers = parser.parse(`curl 'https://www.ifood.com.br'`);

    expect(headers).toEqual({});
  });
});
