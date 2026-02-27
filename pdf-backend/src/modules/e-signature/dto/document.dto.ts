import { IsString, IsOptional, IsArray, IsEmail, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SignerDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class SendForSignatureDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @Transform(({ value }: { value: any }) => {
    // If value is already an array, return it
    if (Array.isArray(value)) return value;
    // If value is a string, parse it
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return [];
  })
  @IsArray()
  @Type(() => SignerDto)
  signers: SignerDto[];
}

export class SignDocumentDto {
  @IsString()
  signatureId: string;

  @IsOptional()
  @IsString()
  position?: string; // JSON string with x,y coordinates
}