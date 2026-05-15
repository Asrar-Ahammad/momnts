/*
  Warnings:

  - You are about to drop the column `is_calimed` on the `FaceProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "is_active" SET DEFAULT true;

-- AlterTable
ALTER TABLE "FaceProfile" DROP COLUMN "is_calimed",
ADD COLUMN     "is_claimed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Photo" ALTER COLUMN "processed" SET DEFAULT false,
ALTER COLUMN "is_visible" SET DEFAULT true;
