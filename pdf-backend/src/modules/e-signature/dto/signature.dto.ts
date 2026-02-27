import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum SignatureStyle {
  CURSIVE = 'cursive',
  PRINT = 'print',
  INITIALS = 'initials'
}

export class CreateSignatureDto {
  @IsString()
  name: string;

  @IsEnum(SignatureStyle)
  style: SignatureStyle;

  @IsOptional()
  @IsString()
  signatureData?: string; // Base64 encoded signature image
}

export class UpdateSignatureDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(SignatureStyle)
  style?: SignatureStyle;

  @IsOptional()
  @IsString()
  signatureData?: string;
}