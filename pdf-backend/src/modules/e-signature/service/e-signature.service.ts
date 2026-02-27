import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { Signature, SignatureStyle } from '../entities/signature.entity';
import { Document, DocumentStatus } from '../entities/document.entity';
import { Signer, SignerStatus } from '../entities/signer.entity';
import { CreateSignatureDto, UpdateSignatureDto } from '../dto/signature.dto';
import { SendForSignatureDto, SignDocumentDto } from '../dto/document.dto';
import { AuthService } from '../../auth/auth.service';
import { User } from '../../auth/entities/user.entity';

@Injectable()
export class ESignatureService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'e-signature');

  constructor(
    @InjectRepository(Signature)
    private signatureRepository: Repository<Signature>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Signer)
    private signerRepository: Repository<Signer>,
    private authService: AuthService,
  ) {
    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  // Signature management
  async createSignature(userId: string, dto: CreateSignatureDto): Promise<Signature> {
    const signature = this.signatureRepository.create({
      userId,
      name: dto.name,
      style: dto.style,
      signatureData: dto.signatureData,
    });
    return this.signatureRepository.save(signature);
  }

  async getUserSignatures(userId: string): Promise<Signature[]> {
    return this.signatureRepository.find({ where: { userId } });
  }

  async updateSignature(userId: string, signatureId: string, dto: UpdateSignatureDto): Promise<Signature> {
    const signature = await this.signatureRepository.findOne({
      where: { id: signatureId, userId }
    });
    if (!signature) {
      throw new NotFoundException('Signature not found');
    }

    Object.assign(signature, dto);
    return this.signatureRepository.save(signature);
  }

  async deleteSignature(userId: string, signatureId: string): Promise<void> {
    const result = await this.signatureRepository.delete({
      id: signatureId,
      userId,
    });
    if (result.affected === 0) {
      throw new NotFoundException('Signature not found');
    }
  }

  // Document management
  async sendForSignature(userId: string, file: Express.Multer.File, dto: SendForSignatureDto): Promise<Document> {
    const fileName = `${uuidv4()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save the uploaded file
    await fs.writeFile(filePath, file.buffer);

    // Create document
    const document = this.documentRepository.create({
      userId,
      title: dto.title,
      originalFileName: file.originalname,
      filePath,
      status: DocumentStatus.PENDING,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      message: dto.message,
      completedSigners: 0,
    });

    const savedDocument = await this.documentRepository.save(document);

    // Create signers
    const signers = dto.signers.map(signerDto =>
      this.signerRepository.create({
        name: signerDto.name,
        email: signerDto.email,
        role: signerDto.role,
        status: SignerStatus.PENDING, // Changed from SENT to PENDING
        documentId: savedDocument.id,
      })
    );

    await this.signerRepository.save(signers);

    // Return document with signers loaded
    const result = await this.documentRepository.findOne({
      where: { id: savedDocument.id },
      relations: ['signers'],
    });
    if (!result) {
      throw new Error('Failed to create document');
    }
    return result;
  }

  async signDocument(userId: string, documentId: string, dto: SignDocumentDto): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['signers'],
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Get user email for signer check
    const user = await this.authService.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is authorized (owner or signer)
    const isOwner = document.userId === userId;
    const signer = document.signers.find(s => s.email === user.email);

    if (!isOwner && !signer) {
      throw new BadRequestException('You are not authorized to sign this document');
    }

    // If user is owner but not a signer, create a signer record for them
    let actualSigner = signer;
    if (isOwner && !signer) {
      // Create a signer record for the owner
      const newSigner = this.signerRepository.create({
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: 'Owner',
        status: SignerStatus.PENDING,
        documentId: document.id,
      });
      actualSigner = await this.signerRepository.save(newSigner);

      // Reload document with new signer
      document.signers.push(actualSigner);
    }

    if (!actualSigner) {
      throw new BadRequestException('Failed to create signer record');
    }

    if (actualSigner.status === SignerStatus.SIGNED) {
      throw new BadRequestException('Document already signed by this user');
    }

    // Load the PDF
    const pdfBytes = await fs.readFile(document.filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Find the signature
    const signature = await this.signatureRepository.findOne({
      where: { id: dto.signatureId, userId }
    });
    if (!signature) {
      throw new NotFoundException('Signature not found or does not belong to you');
    }

    // Add signature to PDF (simplified - in real implementation, position would be calculated)
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Add signature text (simplified - real implementation would add signature image)
    const signatureText = `Signed by ${actualSigner.name} on ${new Date().toISOString()}`;
    firstPage.drawText(signatureText, {
      x: 50,
      y: firstPage.getHeight() - 100,
      size: 12,
      color: rgb(0, 0, 0),
    });

    // Save the signed PDF
    const signedPdfBytes = await pdfDoc.save();
    const signedFileName = `${document.id}-signed-${actualSigner.id}.pdf`;
    const signedFilePath = path.join(this.uploadDir, signedFileName);
    await fs.writeFile(signedFilePath, signedPdfBytes);

    // Update document with signed file path
    document.signedFilePath = signedFilePath;

    // Update signer status
    actualSigner.status = SignerStatus.SIGNED;
    actualSigner.signedAt = new Date();
    await this.signerRepository.save(actualSigner);

    // Update document status
    document.completedSigners++;
    if (document.completedSigners === document.signers.length) {
      document.status = DocumentStatus.COMPLETED;
    }
    await this.documentRepository.save(document);

    // Return updated document
    const result = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['signers'],
    });
    if (!result) {
      throw new Error('Failed to retrieve updated document');
    }
    return result;
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    // Get user email for signer filtering
    const user = await this.authService.findUserById(userId);
    if (!user) {
      return [];
    }

    // Return documents created by the user or where user is a signer
    const documents = await this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.signers', 'signer')
      .where('document.userId = :userId', { userId })
      .orWhere('signer.email = :userEmail', { userEmail: user.email })
      .getMany();

    return documents;
  }

  async getDocument(userId: string, documentId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['signers'],
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Get user email for signer check
    const user = await this.authService.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has access (owner or signer)
    const isOwner = document.userId === userId;
    const isSigner = document.signers.some(signer => signer.email === user.email);
    if (!isOwner && !isSigner) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async downloadDocument(userId: string, documentId: string): Promise<Buffer> {
    const document = await this.getDocument(userId, documentId);

    // Return signed file if available, otherwise original file
    const filePath = document.signedFilePath || document.filePath;
    return fs.readFile(filePath);
  }
}