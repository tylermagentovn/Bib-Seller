ALTER TABLE "Event" ALTER COLUMN "requireDisclaimer" SET DEFAULT false;
ALTER TABLE "Event" ALTER COLUMN "requireBibSpin" SET DEFAULT false;
UPDATE "Event" SET "requireDisclaimer" = false, "requireBibSpin" = false WHERE "requireDisclaimer" = true OR "requireBibSpin" = true;
