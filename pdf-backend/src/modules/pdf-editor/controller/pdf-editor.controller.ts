import { Controller, Post, Get, Put, Delete, UploadedFile, Param, Body, Res, HttpStatus, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import { PdfEditorService } from '../service/pdf-editor.service';
import { Response } from 'express';
import { AnalyticsService } from '../../analytics/service/analytics.service';
import { DocumentType } from '../../analytics/entities/document-activity.entity';

interface Annotation {
  id: string;
  type: 'text' | 'highlight' | 'rectangle' | 'circle' | 'arrow' | 'comment';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  opacity?: number;
  author?: string;
  timestamp?: Date;
}

@Controller('pdf-editor')
export class PdfEditorController {
  constructor(
    private readonly pdfEditorService: PdfEditorService,
    private readonly analyticsService: AnalyticsService
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(@UploadedFile() file: Express.Multer.File, @Res() res: Response, @Req() req: any) {
    const startTime = Date.now();
    const userId = req.user?.id || null;
    const fileSize = file.size;

    try {
      if (!file || file.mimetype !== 'application/pdf') {
        // Track failed upload
        await this.analyticsService.trackDocumentActivity({
          documentType: DocumentType.PDF_EDITOR,
          fileName: file?.originalname || 'invalid-file',
          fileSize: fileSize / (1024 * 1024),
          userId,
          status: 'failed',
          errorMessage: 'Invalid PDF file',
        });

        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Please upload a valid PDF file'
        });
      }

      const documentId = await this.pdfEditorService.uploadPdf(file);
      const processingTime = (Date.now() - startTime) / 1000;

      // Track successful upload
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.PDF_EDITOR,
        fileName: file.originalname,
        fileSize: fileSize / (1024 * 1024),
        userId,
        status: 'success',
        processingTime,
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'PDF uploaded successfully',
        data: { documentId }
      });
    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;

      // Track failed upload
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.PDF_EDITOR,
        fileName: file?.originalname || 'upload-error',
        fileSize: fileSize / (1024 * 1024),
        userId,
        status: 'failed',
        errorMessage: error.message,
        processingTime,
      });

      console.error('PDF upload error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to upload PDF',
        error: error.message
      });
    }
  }

  @Get(':documentId/info')
  async getDocumentInfo(@Param('documentId') documentId: string, @Res() res: Response) {
    try {
      const info = await this.pdfEditorService.getDocumentInfo(documentId);

      return res.status(HttpStatus.OK).json({
        success: true,
        data: info
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Document not found',
        error: error.message
      });
    }
  }

  @Post(':documentId/annotations')
  async addAnnotation(
    @Param('documentId') documentId: string,
    @Body() annotation: Omit<Annotation, 'id' | 'timestamp'>,
    @Res() res: Response
  ) {
    try {
      const newAnnotation = await this.pdfEditorService.addAnnotation(documentId, annotation);

      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Annotation added successfully',
        data: newAnnotation
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to add annotation',
        error: error.message
      });
    }
  }

  @Get(':documentId/annotations')
  async getAnnotations(@Param('documentId') documentId: string, @Res() res: Response) {
    try {
      const annotations = await this.pdfEditorService.getAnnotations(documentId);

      return res.status(HttpStatus.OK).json({
        success: true,
        data: annotations
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Document not found',
        error: error.message
      });
    }
  }

  @Put(':documentId/annotations/:annotationId')
  async updateAnnotation(
    @Param('documentId') documentId: string,
    @Param('annotationId') annotationId: string,
    @Body() updates: Partial<Annotation>,
    @Res() res: Response
  ) {
    try {
      const updatedAnnotation = await this.pdfEditorService.updateAnnotation(documentId, annotationId, updates);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Annotation updated successfully',
        data: updatedAnnotation
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Annotation not found',
        error: error.message
      });
    }
  }

  @Delete(':documentId/annotations/:annotationId')
  async deleteAnnotation(
    @Param('documentId') documentId: string,
    @Param('annotationId') annotationId: string,
    @Res() res: Response
  ) {
    try {
      await this.pdfEditorService.deleteAnnotation(documentId, annotationId);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Annotation deleted successfully'
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Annotation not found',
        error: error.message
      });
    }
  }

  @Post(':documentId/redact')
  async redactContent(
    @Param('documentId') documentId: string,
    @Body() redaction: { page: number; x: number; y: number; width: number; height: number },
    @Res() res: Response
  ) {
    try {
      await this.pdfEditorService.redactContent(documentId, redaction);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Content redacted successfully'
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to redact content',
        error: error.message
      });
    }
  }

  @Post(':documentId/watermark')
  async addWatermark(
    @Param('documentId') documentId: string,
    @Body() watermark: {
      type: 'text' | 'image';
      text?: string;
      imageUrl?: string;
      x: number;
      y: number;
      opacity?: number;
      fontSize?: number;
    },
    @Res() res: Response
  ) {
    try {
      await this.pdfEditorService.addWatermark(documentId, watermark);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Watermark added successfully'
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Failed to add watermark',
        error: error.message
      });
    }
  }

  @Post(':documentId/save')
  async saveDocument(@Param('documentId') documentId: string, @Res() res: Response) {
    try {
      const result = await this.pdfEditorService.saveDocument(documentId);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Document saved successfully',
        data: result
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to save document',
        error: error.message
      });
    }
  }

  @Get(':documentId/export')
  async exportDocument(@Param('documentId') documentId: string, @Res() res: Response, @Req() req: any) {
    const startTime = Date.now();
    const userId = req.user?.id || null;

    try {
      const buffer = await this.pdfEditorService.exportDocument(documentId);
      const processingTime = (Date.now() - startTime) / 1000;
      const fileSize = buffer.length;

      // Track successful export
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.PDF_EDITOR,
        fileName: `export-${documentId}`,
        fileSize: fileSize / (1024 * 1024),
        userId,
        status: 'success',
        processingTime,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="edited-document.pdf"`);
      res.send(buffer);
    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;

      // Track failed export
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.PDF_EDITOR,
        fileName: `export-${documentId}`,
        userId,
        status: 'failed',
        errorMessage: error.message,
        processingTime,
      });

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to export document',
        error: error.message
      });
    }
  }
}