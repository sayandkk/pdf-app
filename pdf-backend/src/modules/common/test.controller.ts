import { Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Controller('test')
export class TestController {
  @Get('libreoffice')
  async testLibreOffice() {
    try {
      const result = await execAsync('"C:\\Program Files\\LibreOffice\\program\\soffice.exe" --version');
      return {
        success: true,
        version: result.stdout.trim(),
        message: 'LibreOffice is working correctly'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'LibreOffice test failed'
      };
    }
  }

  @Post('file-info')
  @UseInterceptors(FileInterceptor('file'))
  async getFileInfo(@UploadedFile() file: Express.Multer.File) {
    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer ? 'Present' : 'Missing'
    };
  }
}
