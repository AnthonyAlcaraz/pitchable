-- Composite indexes for query performance at scale
CREATE INDEX IF NOT EXISTS "ChatMessage_presentationId_role_idx" ON "ChatMessage"("presentationId", "role");
CREATE INDEX IF NOT EXISTS "ChatMessage_presentationId_createdAt_idx" ON "ChatMessage"("presentationId", "createdAt");
CREATE INDEX IF NOT EXISTS "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityEvent_eventType_createdAt_idx" ON "ActivityEvent"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "GenerationMetric_operation_createdAt_idx" ON "GenerationMetric"("operation", "createdAt");
