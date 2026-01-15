-- Migration: Add user_sessions table and make user scope fields nullable

-- Make users table fields nullable
ALTER TABLE `users` MODIFY COLUMN `campusId` int;
ALTER TABLE `users` MODIFY COLUMN `districtId` varchar(64);
ALTER TABLE `users` MODIFY COLUMN `regionId` varchar(255);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `sessionId` varchar(64) NOT NULL UNIQUE,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastSeenAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revokedAt` timestamp,
  `userAgent` varchar(500),
  `ipAddress` varchar(45),
  KEY `user_sessions_userId_idx` (`userId`),
  KEY `user_sessions_sessionId_idx` (`sessionId`),
  KEY `user_sessions_lastSeenAt_idx` (`lastSeenAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
