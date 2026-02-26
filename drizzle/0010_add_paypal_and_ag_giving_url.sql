-- Add paypal, agGivingUrl, and profilePictureUrl columns to people table
ALTER TABLE `people` ADD COLUMN `paypal` varchar(128);
ALTER TABLE `people` ADD COLUMN `agGivingUrl` varchar(512);
ALTER TABLE `people` ADD COLUMN `profilePictureUrl` varchar(1024);
