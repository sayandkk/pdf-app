import { Controller, Post, UploadedFiles, UseInterceptors, Res, HttpStatus, Req } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PdfToWordService } from '../service';
import { Response } from 'express';
import { AnalyticsService } from '../../analytics/service/analytics.service';
import { DocumentType, ActivityStatus } from '../../analytics/entities/document-activity.entity';

@Controller('pdf-to-word')
export class PdfToWordController {
  constructor(
    private readonly pdfToWordService: PdfToWordService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Post('convert')
  @UseInterceptors(FilesInterceptor('files'))
  async convert(@UploadedFiles() files: Express.Multer.File[], @Res() res: Response, @Req() req: any) {
    const startTime = Date.now();
    const userId = req.user?.id || null;

    try {
      if (!files || files.length === 0) {
        // Track failed attempt
        await this.analyticsService.trackDocumentActivity({
          documentType: DocumentType.PDF_TO_WORD,
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
          const docxBuffer = await this.pdfToWordService.convertToWord(file);
          const processingTime = (Date.now() - fileStartTime) / 1000; // in seconds
          const filename = file.originalname.replace(/\.pdf$/i, '.docx');
          const fileSize = file.size / (1024 * 1024); // in MB

          // Track successful conversion
          await this.analyticsService.trackDocumentActivity({
            documentType: DocumentType.PDF_TO_WORD,
            fileName: file.originalname,
            fileSize,
            userId,
            status: 'success',
            processingTime,
          });

          results.push({
            filename,
            data: docxBuffer.toString('base64'),
            originalName: file.originalname
          });
        } catch (fileError) {
          const processingTime = (Date.now() - fileStartTime) / 1000;

          // Track failed conversion
          await this.analyticsService.trackDocumentActivity({
            documentType: DocumentType.PDF_TO_WORD,
            fileName: file.originalname,
            fileSize: file.size / (1024 * 1024),
            userId,
            status: 'failed',
            errorMessage: fileError.message,
            processingTime,
          });

          // Continue with other files
          console.error(`Failed to convert ${file.originalname}:`, fileError);
        }
      }

      const totalProcessingTime = (Date.now() - startTime) / 1000;

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Files converted successfully',
        data: results,
        processingTime: totalProcessingTime,
      });
    } catch (error) {
      const totalProcessingTime = (Date.now() - startTime) / 1000;

      // Track overall failure
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.PDF_TO_WORD,
        fileName: 'batch-conversion',
        userId,
        status: 'failed',
        errorMessage: error.message,
        processingTime: totalProcessingTime,
      });

      console.error('PDF to Word conversion error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to convert files',
        error: error.message
      });
    }
  }
}
