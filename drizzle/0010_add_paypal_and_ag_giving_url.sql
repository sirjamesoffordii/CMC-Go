-- Add paypal, agGivingUrl, and profilePictureUrl columns to people table
ALTER TABLE `people` ADD COLUMN `paypal` varchar(128);
ALTER TABLE `people` ADD COLUMN `agGivingUrl` varchar(512);
ALTER TABLE `people` ADD COLUMN `profilePictureUrl` varchar(1024);

-- Need gifts table — tracks who gave to a need and when
CREATE TABLE IF NOT EXISTS `need_gifts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `needId` int NOT NULL,
  `giverUserId` int NOT NULL,
  `amountCents` int DEFAULT NULL,
  `method` enum('cashapp','venmo','zelle','paypal','ag_giving','other') DEFAULT NULL,
  `note` varchar(512) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `need_gifts_needId_idx` (`needId`),
  KEY `need_gifts_giverUserId_idx` (`giverUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
