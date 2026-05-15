/*
  Warnings:

  - Made the column `display_url` on table `Photo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `original_url` on table `Photo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `thumb_url` on table `Photo` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Photo" ALTER COLUMN "display_url" SET NOT NULL,
ALTER COLUMN "original_url" SET NOT NULL,
ALTER COLUMN "thumb_url" SET NOT NULL;
