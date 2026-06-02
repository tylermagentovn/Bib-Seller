-- Add shirt size image, race kit image, and race kit description to Event
ALTER TABLE "Event" ADD COLUMN "shirtSizeImageUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "raceKitImageUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "raceKitDescription" TEXT;
