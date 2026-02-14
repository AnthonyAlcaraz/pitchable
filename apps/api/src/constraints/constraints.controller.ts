import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConstraintsService } from './constraints.service.js';
import { ValidateSlideDto, SlideContentDto, ThemeDto, PaletteDto, LayoutDto } from './dto/validate-slide.dto.js';

@ApiTags('constraints')
@Controller('constraints')
export class ConstraintsController {
  constructor(private readonly constraintsService: ConstraintsService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a slide against all design constraints' })
  @ApiResponse({ status: 200, description: 'Unified validation result with per-domain details' })
  validate(@Body() dto: ValidateSlideDto) {
    const result = this.constraintsService.validateSlide(
      { title: dto.slide.title, body: dto.slide.body, hasTable: dto.slide.hasTable, tableRows: dto.slide.tableRows },
      {
        headingFont: dto.theme.headingFont,
        bodyFont: dto.theme.bodyFont,
        palette: dto.theme.palette,
        sizes: undefined,
        layout: dto.layout ? {
          columns: dto.layout.columns,
          fontSizes: dto.layout.fontSizes,
          distinctColors: dto.layout.distinctColors,
          hasFullBleedImage: dto.layout.hasFullBleedImage,
          overlayOpacity: dto.layout.overlayOpacity,
        } : undefined,
      },
    );

    return {
      valid: result.valid,
      violations: result.allViolations,
      details: {
        color: result.color,
        textContrast: result.textContrast,
        typography: result.typography,
        density: result.density,
        layout: result.layout,
      },
    };
  }

  @Post('validate/palette')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a color palette (contrast + forbidden pairs)' })
  @ApiResponse({ status: 200, description: 'Color validation result' })
  validatePalette(@Body() dto: PaletteDto) {
    return this.constraintsService.validatePalette(dto);
  }

  @Post('validate/density')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate slide content density (bullets, words, tables)' })
  @ApiResponse({ status: 200, description: 'Density validation result' })
  validateDensity(@Body() dto: SlideContentDto) {
    return this.constraintsService.validateDensity(dto);
  }

  @Post('validate/typography')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate font choices, pairing, and sizes' })
  @ApiResponse({ status: 200, description: 'Typography validation result' })
  validateTypography(@Body() dto: ThemeDto) {
    return this.constraintsService.validateTypography({
      headingFont: dto.headingFont,
      bodyFont: dto.bodyFont,
    });
  }

  @Post('validate/layout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate layout constraints (columns, colors, overlay)' })
  @ApiResponse({ status: 200, description: 'Layout validation result' })
  validateLayout(@Body() dto: LayoutDto) {
    return this.constraintsService.validateLayout(dto);
  }

  @Post('auto-fix')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-fix constraint violations (split slides, fix contrast)' })
  @ApiResponse({ status: 200, description: 'Fixed slides and list of changes applied' })
  autoFix(@Body() dto: ValidateSlideDto) {
    const slide = { title: dto.slide.title, body: dto.slide.body, hasTable: dto.slide.hasTable, tableRows: dto.slide.tableRows };
    const theme = {
      headingFont: dto.theme.headingFont,
      bodyFont: dto.theme.bodyFont,
      palette: dto.theme.palette,
      sizes: undefined,
      layout: dto.layout ? {
        columns: dto.layout.columns,
        fontSizes: dto.layout.fontSizes,
        distinctColors: dto.layout.distinctColors,
        hasFullBleedImage: dto.layout.hasFullBleedImage,
        overlayOpacity: dto.layout.overlayOpacity,
      } : undefined,
    };

    return this.constraintsService.autoFixSlide(slide, theme);
  }
}
