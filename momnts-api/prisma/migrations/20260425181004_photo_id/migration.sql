-- DropForeignKey
ALTER TABLE "PhotoFace" DROP CONSTRAINT "PhotoFace_photo_id_fkey";

-- AddForeignKey
ALTER TABLE "PhotoFace" ADD CONSTRAINT "PhotoFace_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
