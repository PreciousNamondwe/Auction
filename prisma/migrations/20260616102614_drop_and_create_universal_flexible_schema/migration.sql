/*
  Warnings:

  - You are about to drop the column `assetCategory` on the `assets` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `auction_items` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(4))` to `VarChar(191)`.
  - You are about to alter the column `status` on the `auction_registrations` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(0))` to `VarChar(191)`.
  - You are about to alter the column `purpose` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(3))` to `VarChar(191)`.
  - Made the column `attributes` on table `assets` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX `auction_items_status_idx` ON `auction_items`;

-- AlterTable
ALTER TABLE `assets` DROP COLUMN `assetCategory`,
    ADD COLUMN `category` VARCHAR(100) NOT NULL DEFAULT 'OTHER',
    MODIFY `attributes` JSON NOT NULL;

-- AlterTable
ALTER TABLE `auction_items` MODIFY `startTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'UPCOMING';

-- AlterTable
ALTER TABLE `auction_registrations` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `payments` MODIFY `purpose` VARCHAR(191) NOT NULL;
