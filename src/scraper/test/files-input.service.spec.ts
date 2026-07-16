import * as XLSX from 'xlsx';
import { FilesInputService } from '../files-input.service';
import { CurlHeadersParser } from '../curl-headers.parser';

describe('FilesInputService', () => {
  let service: FilesInputService;
  let queue: {
    obliterate: jest.Mock;
    getJobs: jest.Mock;
    resume: jest.Mock;
    addBulk: jest.Mock;
  };
  let storageService: { startTracking: jest.Mock };
  let curlHeadersParser: CurlHeadersParser;

  const buildFile = (buffer: Buffer): Express.Multer.File =>
    ({ buffer }) as Express.Multer.File;

  beforeEach(() => {
    queue = {
      obliterate: jest.fn().mockResolvedValue(undefined),
      getJobs: jest.fn().mockResolvedValue([]),
      resume: jest.fn().mockResolvedValue(undefined),
      addBulk: jest.fn().mockResolvedValue(undefined),
    };
    storageService = {
      startTracking: jest.fn().mockResolvedValue(undefined),
    };
    curlHeadersParser = new CurlHeadersParser();

    service = new FilesInputService(
      queue as never,
      storageService as never,
      curlHeadersParser,
    );
  });

  it('reset deve chamar obliterate na fila com force true', async () => {
    await service.reset();

    expect(queue.obliterate).toHaveBeenCalledWith({ force: true });
  });

  it('updateHeadersAndResume deve atualizar os headers dos jobs pendentes e retomar a fila', async () => {
    const updateData = jest.fn().mockResolvedValue(undefined);
    const job = {
      data: { url: 'https://www.ifood.com.br/produto', headers: {} },
      updateData,
    };
    queue.getJobs.mockResolvedValue([job]);

    const headersFile = buildFile(
      Buffer.from(`curl 'https://www.ifood.com.br' -H 'Cookie: abc=123'`),
    );

    const total = await service.updateHeadersAndResume(headersFile);

    expect(updateData).toHaveBeenCalledWith({
      url: 'https://www.ifood.com.br/produto',
      headers: { Cookie: 'abc=123' },
    });
    expect(queue.resume).toHaveBeenCalled();
    expect(total).toBe(1);
  });

  it('processFiles deve extrair as urls da planilha e adicionar os jobs na fila', async () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { url: 'https://www.ifood.com.br/produto-1' },
      { URL: 'https://www.ifood.com.br/produto-2' },
      { url: '' },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const xlsxBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;

    const xlsxFile = buildFile(xlsxBuffer);
    const headersFile = buildFile(
      Buffer.from(`curl 'https://www.ifood.com.br' -H 'Cookie: abc=123'`),
    );

    await service.processFiles(xlsxFile, headersFile);

    expect(storageService.startTracking).toHaveBeenCalledWith(2);
    expect(queue.addBulk).toHaveBeenCalledWith([
      {
        name: 'scrape-product',
        data: {
          url: 'https://www.ifood.com.br/produto-1',
          headers: { Cookie: 'abc=123' },
        },
      },
      {
        name: 'scrape-product',
        data: {
          url: 'https://www.ifood.com.br/produto-2',
          headers: { Cookie: 'abc=123' },
        },
      },
    ]);
  });
});
