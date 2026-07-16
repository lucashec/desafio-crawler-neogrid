import {
  Controller,
  Post,
  UploadedFiles,
  Headers,
  UseInterceptors,
  UnauthorizedException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FilesInputService } from './files-input.service';
import { PlaywrightAuthService } from 'src/auth/playwright-auth.service';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';

@Controller('scraper')
export class ScraperController {
  constructor(
    private readonly filesInputService: FilesInputService,
    private readonly playwrightAuthService: PlaywrightAuthService,
  ) {}

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
      },
      required: ['xlsx'],
    },
  })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'xlsx', maxCount: 1 }]))
  async upload(
    @Headers('X_API_Key') apiKey: string,
    @UploadedFiles()
    files: {
      xlsx?: Express.Multer.File[];
    },
  ) {
    if (apiKey !== process.env.X_API_KEY) {
      throw new UnauthorizedException('API Key inválida');
    }
    const xlsxFile = files.xlsx?.[0];

    if (!xlsxFile) {
      throw new Error('Os dois arquivos são obrigatórios');
    }

    //await this.playwrightAuthService.ensureAuthenticated();

    await this.filesInputService.processFiles(xlsxFile);

    return {
      message: 'Arquivos processados com sucesso',
    };
  }

  @Post()
  async reset() {
    await this.filesInputService.reset();
  }
}
