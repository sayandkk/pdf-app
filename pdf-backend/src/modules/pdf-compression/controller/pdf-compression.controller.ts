import { Controller, Post, UploadedFile, UseInterceptors, Res, Query, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdfCompressionService } from '../service/pdf-compression.service';
import { Response, Request } from 'express';
import { AnalyticsService } from '../../analytics/service/analytics.service';
import { DocumentType, ActivityStatus } from '../../analytics/entities/document-activity.entity';

@Controller('pdf-compression')
export class PdfCompressionController {
  constructor(
    private readonly pdfCompressionService: PdfCompressionService,
    private readonly analyticsService: AnalyticsService
  ) { }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async compress(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
    @Req() req: any,
    @Query('compressionLevel') compressionLevel?: string
  ) {
    const startTime = Date.now();
    const userId = req.user?.id || null;
    const originalSize = file.size;

    try {
      const result = await this.pdfCompressionService.compressPdf(file, compressionLevel);
      const processingTime = Date.now() - startTime;
      const compressedSize = result.buffer.length;
      const compressionRatio = originalSize > 0 ? ((originalSize - compressedSize) / originalSize * 100) : 0;

      // Track successful compression
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.PDF_COMPRESSION,
        fileName: file.originalname,
        fileSize: originalSize / (1024 * 1024), // Convert to MB
        userId,
        status: 'success',
        processingTime: processingTime / 1000, // Convert to seconds
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=compressed.pdf',
      });
      res.send(result.buffer);
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Track failed compression
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.PDF_COMPRESSION,
        fileName: file.originalname,
        fileSize: originalSize / (1024 * 1024),
        userId,
        status: 'failed',
        errorMessage: error.message,
        processingTime: processingTime / 1000,
      });

      throw error;
    }
  }
}