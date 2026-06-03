-- Note: gender on User is included in CREATE TABLE inside 20260604_add_user_model
-- because the User table does not exist yet when this migration runs.
ALTER TABLE "Registration" ADD COLUMN "gender" TEXT;
ALTER TABLE "TeamMember" ADD COLUMN "gender" TEXT;
