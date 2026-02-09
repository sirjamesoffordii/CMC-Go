-- Add fundsReceived column to needs table (tracks actual funds received for a need)
ALTER TABLE `needs` ADD COLUMN `fundsReceived` int DEFAULT 0;
