import {
  Controller,
  Post,
  UploadedFiles,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { FilesInputService } from './files-input.service';
import { ApiConsumes, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard, AUTH_HEADER_NAME } from '../auth/guards/api-key.guard';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly filesInputService: FilesInputService) {}

  @Post('upload')
  @UseGuards(ApiKeyGuard)
  @ApiConsumes('multipart/form-data')
  @ApiSecurity(AUTH_HEADER_NAME)
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
    @UploadedFiles()
    files: {
      xlsx?: Express.Multer.File[];
      headers?: Express.Multer.File[];
    },
  ) {
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

  @Post('resume')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity(AUTH_HEADER_NAME)
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
  async resume(@UploadedFile() headersFile?: Express.Multer.File) {
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
