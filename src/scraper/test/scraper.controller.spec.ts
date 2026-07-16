import { ScraperController } from '../scraper.controller';
import { FilesInputService } from '../files-input.service';

describe('ScraperController', () => {
  let controller: ScraperController;
  let filesInputService: {
    processFiles: jest.Mock;
    updateHeadersAndResume: jest.Mock;
  };

  const buildFile = (name: string): Express.Multer.File =>
    ({ originalname: name, buffer: Buffer.from('') }) as Express.Multer.File;

  beforeEach(() => {
    filesInputService = {
      processFiles: jest.fn().mockResolvedValue(undefined),
      updateHeadersAndResume: jest.fn().mockResolvedValue(2),
    };
    controller = new ScraperController(
      filesInputService as unknown as FilesInputService,
    );
  });

  describe('upload', () => {
    it('deve processar os arquivos quando ambos são enviados', async () => {
      const xlsxFile = buildFile('planilha.xlsx');
      const headersFile = buildFile('headers.txt');

      const result = await controller.upload({
        xlsx: [xlsxFile],
        headers: [headersFile],
      });

      expect(filesInputService.processFiles).toHaveBeenCalledWith(
        xlsxFile,
        headersFile,
      );
      expect(result).toEqual({ message: 'Arquivos processados com sucesso' });
    });

    it('deve lançar erro quando o arquivo xlsx não é enviado', async () => {
      await expect(
        controller.upload({ headers: [buildFile('headers.txt')] }),
      ).rejects.toThrow('Os dois arquivos são obrigatórios');
    });

    it('deve lançar erro quando o arquivo de headers não é enviado', async () => {
      await expect(
        controller.upload({ xlsx: [buildFile('planilha.xlsx')] }),
      ).rejects.toThrow('Os dois arquivos são obrigatórios');
    });
  });

  describe('resume', () => {
    it('deve atualizar os headers e retomar a fila', async () => {
      const headersFile = buildFile('headers.txt');

      const result = await controller.resume(headersFile);

      expect(filesInputService.updateHeadersAndResume).toHaveBeenCalledWith(
        headersFile,
      );
      expect(result).toEqual({
        message: 'Headers atualizados e fila retomada com sucesso',
        updatedJobs: 2,
      });
    });

    it('deve lançar erro quando o arquivo de headers não é enviado', async () => {
      await expect(controller.resume(undefined)).rejects.toThrow(
        'O arquivo de headers é obrigatório',
      );
    });
  });
});
