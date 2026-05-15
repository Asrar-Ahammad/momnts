-- DropForeignKey
ALTER TABLE "PhotoFace" DROP CONSTRAINT "PhotoFace_face_profile_id_fkey";

-- AlterTable
ALTER TABLE "PhotoFace" ALTER COLUMN "face_profile_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PhotoFace" ADD CONSTRAINT "PhotoFace_face_profile_id_fkey" FOREIGN KEY ("face_profile_id") REFERENCES "FaceProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
