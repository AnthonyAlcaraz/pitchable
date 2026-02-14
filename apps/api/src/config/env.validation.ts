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
