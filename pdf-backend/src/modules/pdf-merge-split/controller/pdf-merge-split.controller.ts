import { Controller, Post, UploadedFiles, UseInterceptors, Body, Req } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PdfMergeSplitService } from '../service/pdf-merge-split.service';
import { AnalyticsService } from '../../analytics/service/analytics.service';
import { DocumentType } from '../../analytics/entities/document-activity.entity';

@Controller('pdf-merge-split')
export class PdfMergeSplitController {
  constructor(
    private readonly pdfMergeSplitService: PdfMergeSplitService,
    private readonly analyticsService: AnalyticsService
  ) {}

  @Post('merge')
  @UseInterceptors(FilesInterceptor('files'))
  async merge(@UploadedFiles() files: Express.Multer.File[], @Req() req: any) {
    const startTime = Date.now();
    const userId = req.user?.id || null;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    try {
      const mergedPdf = await this.pdfMergeSplitService.merge(files);
      const processingTime = (Date.now() - startTime) / 1000;

      // Track successful merge
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.MERGE_SPLIT,
        fileName: `merge-${files.length}-files`,
        fileSize: totalSize / (1024 * 1024),
        userId,
        status: 'success',
        processingTime,
      });

      return {
        data: mergedPdf.toString('base64'),
        filename: 'merged.pdf'
      };
    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;

      // Track failed merge
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.MERGE_SPLIT,
        fileName: `merge-${files.length}-files`,
        fileSize: totalSize / (1024 * 1024),
        userId,
        status: 'failed',
        errorMessage: error.message,
        processingTime,
      });

      throw error;
    }
  }

  @Post('split')
  @UseInterceptors(FilesInterceptor('file'))
  async split(@UploadedFiles() files: Express.Multer.File[], @Body('ranges') ranges: string, @Req() req: any) {
    const startTime = Date.now();
    const userId = req.user?.id || null;
    const fileSize = files[0].size;

    try {
      const splitResults = await this.pdfMergeSplitService.split(files[0], ranges);
      const processingTime = (Date.now() - startTime) / 1000;

      // Track successful split
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.MERGE_SPLIT,
        fileName: files[0].originalname,
        fileSize: fileSize / (1024 * 1024),
        userId,
        status: 'success',
        processingTime,
      });
      
      return {
        success: true,
        message: `PDF split into ${splitResults.length} parts`,
        originalFile: files[0].originalname,
        totalParts: splitResults.length,
        files: splitResults.map((result, i) => ({
          data: result.buffer.toString('base64'),
          filename: `${files[0].originalname.replace('.pdf', '')}_part${i + 1}_${result.pages.replace('-', 'to')}.pdf`,
          pages: result.pages,
          description: result.description,
          partNumber: i + 1
        }))
      };
    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;

      // Track failed split
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.MERGE_SPLIT,
        fileName: files[0].originalname,
        fileSize: fileSize / (1024 * 1024),
        userId,
        status: 'failed',
        errorMessage: error.message,
        processingTime,
      });

      throw error;
    }
  }
}
