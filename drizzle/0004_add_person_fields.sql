ALTER TABLE `people` ADD COLUMN `spouse` varchar(255);
ALTER TABLE `people` ADD COLUMN `kids` varchar(10);
ALTER TABLE `people` ADD COLUMN `guests` varchar(10);
ALTER TABLE `people` ADD COLUMN `childrenAges` text;
ALTER TABLE `people` ADD COLUMN `lastEdited` timestamp;
ALTER TABLE `people` ADD COLUMN `lastEditedBy` varchar(255);


