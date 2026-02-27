import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Query,
  Res,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ESignatureService } from '../service/e-signature.service';
import { CreateSignatureDto, UpdateSignatureDto } from '../dto/signature.dto';
import { SendForSignatureDto, SignDocumentDto } from '../dto/document.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnalyticsService } from '../../analytics/service/analytics.service';
import { DocumentType } from '../../analytics/entities/document-activity.entity';

@Controller('e-signature')
@UseGuards(JwtAuthGuard)
export class ESignatureController {
  constructor(
    private readonly eSignatureService: ESignatureService,
    private readonly analyticsService: AnalyticsService
  ) {}

  // Signature management endpoints
  @Post('signatures')
  async createSignature(@Request() req: any, @Body() dto: CreateSignatureDto) {
    const userId = req.user.id;
    return this.eSignatureService.createSignature(userId, dto);
  }

  @Get('signatures')
  async getUserSignatures(@Request() req: any) {
    const userId = req.user.id;
    return this.eSignatureService.getUserSignatures(userId);
  }

  @Put('signatures/:id')
  async updateSignature(@Request() req: any, @Param('id') signatureId: string, @Body() dto: UpdateSignatureDto) {
    const userId = req.user.id;
    return this.eSignatureService.updateSignature(userId, signatureId, dto);
  }

  @Delete('signatures/:id')
  async deleteSignature(@Request() req: any, @Param('id') signatureId: string) {
    const userId = req.user.id;
    await this.eSignatureService.deleteSignature(userId, signatureId);
    return { message: 'Signature deleted successfully' };
  }

  // Document management endpoints
  @Post('send')
  @UseInterceptors(FileInterceptor('file'))
  async sendForSignature(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SendForSignatureDto,
  ) {
    const startTime = Date.now();
    const userId = req.user.id;
    const fileSize = file.size;

    try {
      const result = await this.eSignatureService.sendForSignature(userId, file, dto);
      const processingTime = (Date.now() - startTime) / 1000;

      // Track successful send for signature
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.E_SIGNATURE,
        fileName: file.originalname,
        fileSize: fileSize / (1024 * 1024),
        userId,
        status: 'success',
        processingTime,
      });

      return result;
    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;

      // Track failed send for signature
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.E_SIGNATURE,
        fileName: file.originalname,
        fileSize: fileSize / (1024 * 1024),
        userId,
        status: 'failed',
        errorMessage: error.message,
        processingTime,
      });

      throw error;
    }
  }

  @Post('sign/:documentId')
  async signDocument(
    @Request() req: any,
    @Param('documentId') documentId: string,
    @Body() dto: SignDocumentDto,
  ) {
    const startTime = Date.now();
    const userId = req.user.id;

    try {
      const result = await this.eSignatureService.signDocument(userId, documentId, dto);
      const processingTime = (Date.now() - startTime) / 1000;

      // Track successful document signing
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.E_SIGNATURE,
        fileName: `sign-${documentId}`,
        fileSize: 0, // No file uploaded for signing
        userId,
        status: 'success',
        processingTime,
      });

      return result;
    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;

      // Track failed document signing
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.E_SIGNATURE,
        fileName: `sign-${documentId}`,
        userId,
        status: 'failed',
        errorMessage: error.message,
        processingTime,
      });

      throw error;
    }
  }

  @Get('documents')
  async getUserDocuments(@Request() req: any) {
    const userId = req.user.id;
    return this.eSignatureService.getUserDocuments(userId);
  }

  @Get('documents/:id')
  async getDocument(@Request() req: any, @Param('id') documentId: string) {
    const userId = req.user.id;
    return this.eSignatureService.getDocument(userId, documentId);
  }

  @Get('documents/:id/download')
  async downloadDocument(@Request() req: any, @Param('id') documentId: string, @Res() res: Response) {
    const startTime = Date.now();
    const userId = req.user.id;

    try {
      const buffer = await this.eSignatureService.downloadDocument(userId, documentId);
      const processingTime = (Date.now() - startTime) / 1000;
      const fileSize = buffer.length;

      // Track successful download
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.E_SIGNATURE,
        fileName: `download-${documentId}`,
        fileSize: fileSize / (1024 * 1024),
        userId,
        status: 'success',
        processingTime,
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="document-${documentId}.pdf"`,
      });
      res.send(buffer);
    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;

      // Track failed download
      await this.analyticsService.trackDocumentActivity({
        documentType: DocumentType.E_SIGNATURE,
        fileName: `download-${documentId}`,
        userId,
        status: 'failed',
        errorMessage: error.message,
        processingTime,
      });

      res.status(HttpStatus.NOT_FOUND).json({ message: 'Document not found' });
    }
  }
}