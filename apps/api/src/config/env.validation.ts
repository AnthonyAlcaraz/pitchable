import { plainToInstance } from 'class-transformer';
import { IsString, IsOptional, IsNumberString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsString()
  REDIS_HOST?: string = 'localhost';

  @IsOptional()
  @IsNumberString()
  REDIS_PORT?: string = '6379';

  @IsOptional()
  @IsNumberString()
  PORT?: string = '3000';

  @IsOptional()
  @IsString()
  S3_ENDPOINT?: string = 'http://localhost:9000';

  @IsOptional()
  @IsString()
  S3_REGION?: string = 'us-east-1';

  @IsOptional()
  @IsString()
  S3_ACCESS_KEY?: string = 'minioadmin';

  @IsOptional()
  @IsString()
  S3_SECRET_KEY?: string = 'minioadmin';

  @IsOptional()
  @IsString()
  S3_BUCKET?: string = 'pitchable-documents';

  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  @IsOptional()
  @IsString()
  OPENAI_CHAT_MODEL?: string = 'gpt-4o';

  @IsOptional()
  @IsString()
  EDGEQUAKE_ENABLED?: string = 'false';

  @IsOptional()
  @IsString()
  EDGEQUAKE_URL?: string = 'http://edgequake:8080';

  @IsOptional()
  @IsString()
  EDGEQUAKE_API_KEY?: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
