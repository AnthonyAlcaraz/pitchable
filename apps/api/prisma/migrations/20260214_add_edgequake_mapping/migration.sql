-- CreateTable
CREATE TABLE "EdgeQuakeMapping" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EdgeQuakeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EdgeQuakeMapping_userId_key" ON "EdgeQuakeMapping"("userId");

-- AddForeignKey
ALTER TABLE "EdgeQuakeMapping" ADD CONSTRAINT "EdgeQuakeMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
