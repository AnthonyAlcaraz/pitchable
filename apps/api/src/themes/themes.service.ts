import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface ThemeDefinition {
  name: string;
  displayName: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    surface: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
}

const BUILT_IN_THEMES: ThemeDefinition[] = [
  {
    name: 'dark-professional',
    displayName: 'Dark Professional',
    description: 'Deep navy background with blue accents. Clean, modern look.',
    primaryColor: '#60a5fa',
    secondaryColor: '#94a3b8',
    accentColor: '#fbbf24',
    backgroundColor: '#0f172a',
    textColor: '#e2e8f0',
    headingFont: 'Inter',
    bodyFont: 'Open Sans',
    colorPalette: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      accent: '#fbbf24',
      background: '#0f172a',
      text: '#e2e8f0',
      surface: '#1e293b',
      border: '#334155',
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#f87171',
    },
  },
  {
    name: 'light-minimal',
    displayName: 'Light Minimal',
    description:
      'Clean white background with subtle gray tones. Professional and readable.',
    primaryColor: '#1e293b',
    secondaryColor: '#64748b',
    accentColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    colorPalette: {
      primary: '#1e293b',
      secondary: '#64748b',
      accent: '#3b82f6',
      background: '#ffffff',
      text: '#1e293b',
      surface: '#f8fafc',
      border: '#e2e8f0',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
    },
  },
  {
    name: 'corporate-blue',
    displayName: 'Corporate Blue',
    description:
      'Traditional corporate palette. Blue tones with gold accents.',
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    accentColor: '#f59e0b',
    backgroundColor: '#f8fafc',
    textColor: '#1e293b',
    headingFont: 'Roboto',
    bodyFont: 'Open Sans',
    colorPalette: {
      primary: '#1e40af',
      secondary: '#3b82f6',
      accent: '#f59e0b',
      background: '#f8fafc',
      text: '#1e293b',
      surface: '#eff6ff',
      border: '#bfdbfe',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
    },
  },
  {
    name: 'creative-warm',
    displayName: 'Creative Warm',
    description:
      'Bold warm tones on dark background. Eye-catching and energetic.',
    primaryColor: '#f97316',
    secondaryColor: '#fb923c',
    accentColor: '#fbbf24',
    backgroundColor: '#1c1917',
    textColor: '#fafaf9',
    headingFont: 'Poppins',
    bodyFont: 'DM Sans',
    colorPalette: {
      primary: '#f97316',
      secondary: '#fb923c',
      accent: '#fbbf24',
      background: '#1c1917',
      text: '#fafaf9',
      surface: '#292524',
      border: '#44403c',
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#f87171',
    },
  },
  {
    name: 'technical-teal',
    displayName: 'Technical Teal',
    description:
      'Teal and purple on dark. Technical documentation aesthetic.',
    primaryColor: '#0d9488',
    secondaryColor: '#06b6d4',
    accentColor: '#8b5cf6',
    backgroundColor: '#0f172a',
    textColor: '#e2e8f0',
    headingFont: 'Source Sans Pro',
    bodyFont: 'Inter',
    colorPalette: {
      primary: '#0d9488',
      secondary: '#06b6d4',
      accent: '#8b5cf6',
      background: '#0f172a',
      text: '#e2e8f0',
      surface: '#1e293b',
      border: '#334155',
      success: '#4ade80',
      warning: '#fbbf24',
      error: '#f87171',
    },
  },
];

@Injectable()
export class ThemesService {
  constructor(private readonly prisma: PrismaService) {}

  async seedBuiltInThemes(): Promise<void> {
    for (const theme of BUILT_IN_THEMES) {
      await this.prisma.theme.upsert({
        where: { name: theme.name },
        update: {
          displayName: theme.displayName,
          description: theme.description,
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          accentColor: theme.accentColor,
          backgroundColor: theme.backgroundColor,
          textColor: theme.textColor,
          headingFont: theme.headingFont,
          bodyFont: theme.bodyFont,
          colorPalette: theme.colorPalette,
          isBuiltIn: true,
        },
        create: {
          name: theme.name,
          displayName: theme.displayName,
          description: theme.description,
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          accentColor: theme.accentColor,
          backgroundColor: theme.backgroundColor,
          textColor: theme.textColor,
          headingFont: theme.headingFont,
          bodyFont: theme.bodyFont,
          colorPalette: theme.colorPalette,
          isBuiltIn: true,
        },
      });
    }
  }

  async findAll() {
    return this.prisma.theme.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const theme = await this.prisma.theme.findUnique({
      where: { id },
    });

    if (!theme) {
      throw new NotFoundException(`Theme with id "${id}" not found`);
    }

    return theme;
  }

  async findByName(name: string) {
    const theme = await this.prisma.theme.findUnique({
      where: { name },
    });

    if (!theme) {
      throw new NotFoundException(`Theme with name "${name}" not found`);
    }

    return theme;
  }

  async getDefaultTheme() {
    return this.findByName('dark-professional');
  }
}
