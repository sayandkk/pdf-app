import { Controller, Get, Post, Body, Req, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ImageToPdfService } from '../service/image-to-pdf.service';
import { Request, Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AnalyticsService } from '../../analytics/service/analytics.service';
import { DocumentType } from '../../analytics/entities/document-activity.entity';

@Controller('image-to-pdf')
export class ImageToPdfController {
  constructor(
    private readonly service: ImageToPdfService,
    private readonly analyticsService: AnalyticsService
  ) { }

  @Get('history')
  getHistory() {
    return this.service.getHistory();
  }

  @Get('settings')
  async getSettings() {
    return await this.service.getSettings();
  }

  @Post('settings')
  async saveSettings(@Body() settings: any) {
    await this.service.saveSettings(settings);
    return { success: true };
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  async convert(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const startTime = Date.now();
    const userId = (req as any).user?.id || null;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const settings = req.body;

    try {
      const { pdfBuffer } = await this.service.convertToPdf(files, settings);
      const processingTime = (Date.now() - startTime) / 1000;

      // Track successful conversion
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.IMAGE_TO_PDF,
        fileName: `convert-${files.length}-images`,
        fileSize: totalSize / (1024 * 1024),
        userId,
        status: 'success',
        processingTime,
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="converted.pdf"`,
      });
      res.send(pdfBuffer);
    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;

      // Track failed conversion
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.IMAGE_TO_PDF,
        fileName: `convert-${files.length}-images`,
        fileSize: totalSize / (1024 * 1024),
        userId,
        status: 'failed',
        errorMessage: error.message,
        processingTime,
      });

      throw error;
    }
  }
}