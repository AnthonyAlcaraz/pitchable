-- CreateEnum
CREATE TYPE "ImageSource" AS ENUM ('AI_GENERATED', 'FIGMA', 'UPLOADED');

-- AlterEnum (add FIGMA to ExportFormat)
ALTER TYPE "ExportFormat" ADD VALUE 'FIGMA';

-- AlterTable: Slide — add Figma fields and imageSource
ALTER TABLE "Slide" ADD COLUMN "imageSource" "ImageSource" NOT NULL DEFAULT 'AI_GENERATED';
ALTER TABLE "Slide" ADD COLUMN "figmaFileKey" TEXT;
ALTER TABLE "Slide" ADD COLUMN "figmaNodeId" TEXT;
ALTER TABLE "Slide" ADD COLUMN "figmaNodeName" TEXT;

-- AlterTable: PitchLens — add Figma fields
ALTER TABLE "PitchLens" ADD COLUMN "figmaFileKey" TEXT;
ALTER TABLE "PitchLens" ADD COLUMN "figmaAccessToken" TEXT;

-- CreateTable: FigmaIntegration
CREATE TABLE "FigmaIntegration" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "accessToken" TEXT NOT NULL,
    "figmaUserId" TEXT,
    "figmaUserName" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FigmaIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FigmaIntegration_userId_key" ON "FigmaIntegration"("userId");

-- AddForeignKey
ALTER TABLE "FigmaIntegration" ADD CONSTRAINT "FigmaIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
