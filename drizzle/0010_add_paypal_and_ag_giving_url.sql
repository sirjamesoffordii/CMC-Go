-- Add paypal and agGivingUrl columns to people table (ways to give)
ALTER TABLE `people` ADD COLUMN `paypal` varchar(128);
ALTER TABLE `people` ADD COLUMN `agGivingUrl` varchar(512);
