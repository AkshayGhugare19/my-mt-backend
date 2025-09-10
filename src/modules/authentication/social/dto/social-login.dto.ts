import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SocialLoginDto {
  @ApiProperty({ description: 'Google ID token OR Facebook access token' })
  @IsString()
  token!: string;

  @ApiProperty({ enum: ['google', 'facebook'], description: 'Login provider type' })
  @IsIn(['google', 'facebook'])
  type!: 'google' | 'facebook';

  @ApiPropertyOptional({ description: 'Optional Partner Matrix Btag' })
  @IsOptional()
  @IsString()
  partnerMatrixBtag?: string;

  @ApiPropertyOptional({ description: 'Optional Country Code' })
  @IsOptional()
  @IsString()
  countryCode?: string;


  @ApiPropertyOptional({ description: 'Enter email id' })
  @IsOptional()
  @IsString()
  email?: string;
}
