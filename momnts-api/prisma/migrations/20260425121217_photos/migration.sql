/*
  Warnings:

  - You are about to drop the column `storage_url` on the `Photo` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Photo_storage_url_key";

-- AlterTable
ALTER TABLE "Photo" DROP COLUMN "storage_url";
