-- Script to populate  database with districts, campuses, and people
-- This script clears existing data and repopulates from seed files

BEGIN TRANSACTION;

-- Clear existing data (in correct order due to foreign keys)
DELETE FROM notes;
DELETE FROM needs;
DELETE FROM assignments;
DELETE FROM people;
DELETE FROM campuses;
DELETE FROM districts;

-- Insert Districts
INSERT INTO districts (id, name, region) VALUES
('Colorado', 'Colorado', 'Big Sky'),
('Montana', 'Montana', 'Big Sky'),
('SouthIdaho', 'South Idaho', 'Big Sky'),
('Utah', 'Utah', 'Big Sky'),
('Wyoming', 'Wyoming', 'Big Sky'),
('Illinois', 'Illinois', 'Great Lakes'),
('Indiana', 'Indiana', 'Great Lakes'),
('Michigan', 'Michigan', 'Great Lakes'),
('Ohio', 'Ohio', 'Great Lakes'),
('Minnesota', 'Minnesota', 'Great Plains North'),
('NorthDakota', 'North Dakota', 'Great Plains North'),
('SouthDakota', 'South Dakota', 'Great Plains North'),
('Wisconsin', 'Wisconsin', 'Great Plains North'),
('Iowa', 'Iowa', 'Great Plains South'),
('Kansas', 'Kansas', 'Great Plains South'),
('Nebraska', 'Nebraska', 'Great Plains South'),
('NorthernMissouri', 'Northern Missouri', 'Great Plains South'),
('SouthernMissouri', 'Southern Missouri', 'Great Plains South'),
('NorthCarolina', 'North Carolina', 'Mid-Atlantic'),
('Virginia', 'Virginia', 'Mid-Atlantic'),
('Kentucky', 'Kentucky', 'Mid-Atlantic'),
('Tennessee', 'Tennessee', 'Mid-Atlantic'),
('WestVirginia', 'West Virginia', 'Mid-Atlantic'),
('Connecticut', 'Connecticut', 'Northeast'),
('Maine', 'Maine', 'Northeast'),
('Massachusetts', 'Massachusetts', 'Northeast'),
('NewJersey', 'New Jersey', 'Northeast'),
('NewYork', 'New York', 'Northeast'),
('Pennsylvania', 'Pennsylvania', 'Northeast'),
('Vermont', 'Vermont', 'Northeast'),
('Alaska', 'Alaska', 'Northwest'),
('NorthIdaho', 'North Idaho', 'Northwest'),
('Oregon', 'Oregon', 'Northwest'),
('Washington', 'Washington', 'Northwest'),
('Arkansas', 'Arkansas', 'South Central'),
('Louisiana', 'Louisiana', 'South Central'),
('Oklahoma', 'Oklahoma', 'South Central'),
('Alabama', 'Alabama', 'Southeast'),
('Florida', 'Florida', 'Southeast'),
('Georgia', 'Georgia', 'Southeast'),
('Mississippi', 'Mississippi', 'Southeast'),
('SouthCarolina', 'South Carolina', 'Southeast'),
('WestFlorida', 'West Florida', 'Southeast'),
('NewMexico', 'New Mexico', 'Texico'),
('NorthTexas', 'North Texas', 'Texico'),
('SouthTexas', 'South Texas', 'Texico'),
('WestTexas', 'West Texas', 'Texico'),
('Arizona', 'Arizona', 'West Coast'),
('Hawaii', 'Hawaii', 'West Coast'),
('Nevada', 'Nevada', 'West Coast'),
('NorthCalifornia', 'North California', 'West Coast'),
('SouthCalifornia', 'South California', 'West Coast');

COMMIT;

