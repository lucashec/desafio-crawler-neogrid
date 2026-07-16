import {
  Controller,
  Post,
  UploadedFiles,
  UploadedFile,
  Headers,
  UseInterceptors,
  UnauthorizedException,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { FilesInputService } from './files-input.service';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly filesInputService: FilesInputService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        xlsx: {
          type: 'string',
          format: 'binary',
        },
        headers: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['headers', 'xlsx'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'xlsx', maxCount: 1 },
      { name: 'headers', maxCount: 1 },
    ]),
  )
  async upload(
    @Headers('X_API_Key') apiKey: string,
    @UploadedFiles()
    files: {
      xlsx?: Express.Multer.File[];
      headers?: Express.Multer.File[];
    },
  ) {
    if (apiKey !== process.env.X_API_KEY) {
      throw new UnauthorizedException('API Key inválida');
    }
    const xlsxFile = files.xlsx?.[0];
    const headersFile = files.headers?.[0];

    if (!xlsxFile || !headersFile) {
      throw new Error('Os dois arquivos são obrigatórios');
    }

    await this.filesInputService.processFiles(xlsxFile, headersFile);

    return {
      message: 'Arquivos processados com sucesso',
    };
  }

  @Post()
  async reset() {
    await this.filesInputService.reset();
  }

  @Post('resume')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        headers: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['headers'],
    },
  })
  @UseInterceptors(FileInterceptor('headers'))
  async resume(
    @Headers('X_API_Key') apiKey: string,
    @UploadedFile() headersFile?: Express.Multer.File,
  ) {
    if (apiKey !== process.env.X_API_KEY) {
      throw new UnauthorizedException('API Key inválida');
    }

    if (!headersFile) {
      throw new Error('O arquivo de headers é obrigatório');
    }

    const updatedJobs =
      await this.filesInputService.updateHeadersAndResume(headersFile);

    return {
      message: 'Headers atualizados e fila retomada com sucesso',
      updatedJobs,
    };
  }
}
