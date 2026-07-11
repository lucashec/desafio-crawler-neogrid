import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InputService } from './input.service';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

@Controller('crawler')
export class InputController {
  private readonly logger = new Logger(InputController.name);

  constructor(private readonly inputService: InputService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads',
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(xlsx)$/)) {
          return callback(
            new BadRequestException('Formato de arquivo inválido. Use .xlsx'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo enviado. Utilize o campo "file".',
      );
    }

    this.logger.log(`Arquivo recebido via API: ${file.originalname}`);

    try {
      await this.inputService.loadUrlsFromFile(file.path);

      return {
        statusCode: 202,
        message:
          'Arquivo processado com sucesso. As URLs foram enfileiradas para extração.',
        fileName: file.originalname,
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao processar o arquivo: ${error.message}`,
      );
    }
  }
}
