-- Add PRIVATE to EventStatus enum
ALTER TYPE "EventStatus" ADD VALUE 'PRIVATE';

-- Add password field to Event table
ALTER TABLE "Event" ADD COLUMN "password" TEXT;
