import { Controller, Post, UploadedFiles, UseInterceptors, Res, HttpStatus, Req } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { OcrService } from '../service/ocr.service';
import { Response } from 'express';
import { AnalyticsService } from '../../analytics/service/analytics.service';
import { DocumentType } from '../../analytics/entities/document-activity.entity';

@Controller('ocr')
export class OcrController {
  constructor(
    private readonly ocrService: OcrService,
    private readonly analyticsService: AnalyticsService
  ) {}

  @Post('scan')
  @UseInterceptors(FilesInterceptor('files'))
  async scan(@UploadedFiles() files: Express.Multer.File[], @Res() res: Response, @Req() req: any) {
    const startTime = Date.now();
    const userId = req.user?.id || null;

    try {
      if (!files || files.length === 0) {
        // Track failed attempt
        await this.analyticsService.trackDocumentActivity({
          documentType: DocumentType.OCR,
          fileName: 'no-file',
          userId,
          status: 'failed',
          errorMessage: 'No files provided',
        });

        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'No files provided'
        });
      }

      const results = [];

      for (const file of files) {
        const fileStartTime = Date.now();
        try {
          const ocrResult = await this.ocrService.performOcr(file);
          const processingTime = (Date.now() - fileStartTime) / 1000; // in seconds
          const fileSize = file.size / (1024 * 1024); // in MB

          // Track successful OCR
          await this.analyticsService.trackDocumentActivity({
            documentType: DocumentType.OCR,
            fileName: file.originalname,
            fileSize,
            userId,
            status: 'success',
            processingTime,
          });

          results.push({
            file: file.originalname,
            confidence: ocrResult.confidence,
            text: ocrResult.text,
            language: ocrResult.language,
            pages: ocrResult.pages
          });
        } catch (fileError) {
          const processingTime = (Date.now() - fileStartTime) / 1000;

          // Track failed OCR
          await this.analyticsService.trackDocumentActivity({
            documentType: DocumentType.OCR,
            fileName: file.originalname,
            fileSize: file.size / (1024 * 1024),
            userId,
            status: 'failed',
            errorMessage: fileError.message,
            processingTime,
          });

          // Continue with other files
          console.error(`Failed to process ${file.originalname}:`, fileError);
        }
      }

      const totalProcessingTime = (Date.now() - startTime) / 1000;

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'OCR processing completed',
        data: results,
        processingTime: totalProcessingTime,
      });
    } catch (error) {
      const totalProcessingTime = (Date.now() - startTime) / 1000;

      // Track overall failure
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.OCR,
        fileName: 'batch-ocr',
        userId,
        status: 'failed',
        errorMessage: error.message,
        processingTime: totalProcessingTime,
      });

      console.error('OCR processing error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to process files',
        error: error.message
      });
    }
  }
}