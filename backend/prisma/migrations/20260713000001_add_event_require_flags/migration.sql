ALTER TABLE "Event"
  ADD COLUMN "requireDisclaimer" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "requireBibSpin"    BOOLEAN NOT NULL DEFAULT true;
