-- Prevent negative credit balance via race conditions
ALTER TABLE "User" ADD CONSTRAINT "credit_balance_non_negative" CHECK ("creditBalance" >= 0);
