
-- Clear existing dev data
DELETE FROM people WHERE personId LIKE 'dev_%';
DELETE FROM campuses WHERE name LIKE '% Central' OR name LIKE '% North' OR name LIKE '% South' OR name LIKE '% Main' OR name LIKE '% Downtown' OR name LIKE '% University' OR name LIKE '% Community' OR name LIKE '% East' OR name LIKE '% West';

-- Insert districts
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Colorado', 'Colorado', 'Big Sky');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Montana', 'Montana', 'Big Sky');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('SouthIdaho', 'South Idaho', 'Big Sky');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Utah', 'Utah', 'Big Sky');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Wyoming', 'Wyoming', 'Big Sky');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Illinois', 'Illinois', 'Great Lakes');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Indiana', 'Indiana', 'Great Lakes');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Michigan', 'Michigan', 'Great Lakes');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Ohio', 'Ohio', 'Great Lakes');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Minnesota', 'Minnesota', 'Great Plains North');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('NorthDakota', 'North Dakota', 'Great Plains North');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('SouthDakota', 'South Dakota', 'Great Plains North');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Wisconsin', 'Wisconsin', 'Great Plains North');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Iowa', 'Iowa', 'Great Plains South');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Kansas', 'Kansas', 'Great Plains South');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Nebraska', 'Nebraska', 'Great Plains South');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('NorthernMissouri', 'Northern Missouri', 'Great Plains South');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('SouthernMissouri', 'Southern Missouri', 'Great Plains South');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('NorthCarolina', 'North Carolina', 'Mid-Atlantic');
INSERT OR IGNORE INTO districts (id, name, region) VALUES ('Virginia', 'Virginia', 'Mid-Atlantic');

-- Insert campuses
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Colorado Central', 'Colorado');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Colorado North', 'Colorado');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Montana Central', 'Montana');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Montana North', 'Montana');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('South Idaho Central', 'SouthIdaho');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('South Idaho North', 'SouthIdaho');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Utah Central', 'Utah');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Utah North', 'Utah');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Utah South', 'Utah');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Wyoming Central', 'Wyoming');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Wyoming North', 'Wyoming');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Illinois Central', 'Illinois');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Illinois North', 'Illinois');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Illinois South', 'Illinois');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Indiana Central', 'Indiana');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Indiana North', 'Indiana');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Indiana South', 'Indiana');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Michigan Central', 'Michigan');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Michigan North', 'Michigan');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Ohio Central', 'Ohio');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Ohio North', 'Ohio');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Minnesota Central', 'Minnesota');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Minnesota North', 'Minnesota');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Minnesota South', 'Minnesota');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('North Dakota Central', 'NorthDakota');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('North Dakota North', 'NorthDakota');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('North Dakota South', 'NorthDakota');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('South Dakota Central', 'SouthDakota');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('South Dakota North', 'SouthDakota');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('South Dakota South', 'SouthDakota');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Wisconsin Central', 'Wisconsin');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Wisconsin North', 'Wisconsin');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Wisconsin South', 'Wisconsin');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Iowa Central', 'Iowa');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Iowa North', 'Iowa');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Iowa South', 'Iowa');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Kansas Central', 'Kansas');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Kansas North', 'Kansas');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Nebraska Central', 'Nebraska');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Nebraska North', 'Nebraska');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Northern Missouri Central', 'NorthernMissouri');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Northern Missouri North', 'NorthernMissouri');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Southern Missouri Central', 'SouthernMissouri');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Southern Missouri North', 'SouthernMissouri');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Southern Missouri South', 'SouthernMissouri');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('North Carolina Central', 'NorthCarolina');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('North Carolina North', 'NorthCarolina');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Virginia Central', 'Virginia');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Virginia North', 'Virginia');
INSERT OR IGNORE INTO campuses (name, districtId) VALUES ('Virginia South', 'Virginia');

-- Insert people
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_1', 'Quinn Moore', 'Colorado', c.id, 'Big Sky', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Colorado North' AND c.districtId = 'Colorado' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_2', 'Taylor Robinson', 'Colorado', c.id, 'Big Sky', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Colorado North' AND c.districtId = 'Colorado' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_3', 'Blake Smith', 'Colorado', c.id, 'Big Sky', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Colorado North' AND c.districtId = 'Colorado' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_4', 'Quinn Taylor', 'Colorado', c.id, 'Big Sky', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Colorado North' AND c.districtId = 'Colorado' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_5', 'Taylor Anderson', 'Colorado', c.id, 'Big Sky', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Colorado Central' AND c.districtId = 'Colorado' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_6', 'Blake Brown', 'Colorado', c.id, 'Big Sky', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Colorado Central' AND c.districtId = 'Colorado' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_7', 'Quinn Davis', 'Colorado', c.id, 'Big Sky', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Colorado Central' AND c.districtId = 'Colorado' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_8', 'Taylor Garcia', 'Colorado', NULL, 'Big Sky', 'Not Invited', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_9', 'Morgan Martinez', 'Montana', c.id, 'Big Sky', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Montana North' AND c.districtId = 'Montana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_10', 'Cameron Miller', 'Montana', c.id, 'Big Sky', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Montana North' AND c.districtId = 'Montana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_11', 'Sage Moore', 'Montana', NULL, 'Big Sky', 'Maybe', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_12', 'Morgan Robinson', 'Montana', c.id, 'Big Sky', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Montana Central' AND c.districtId = 'Montana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_13', 'Cameron Smith', 'Montana', c.id, 'Big Sky', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Montana Central' AND c.districtId = 'Montana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_14', 'Sage Taylor', 'Montana', c.id, 'Big Sky', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Montana Central' AND c.districtId = 'Montana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_15', 'Morgan Anderson', 'Montana', NULL, 'Big Sky', 'Maybe', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_16', 'Cameron Brown', 'Montana', c.id, 'Big Sky', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Montana Central' AND c.districtId = 'Montana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_17', 'Sage Davis', 'Montana', c.id, 'Big Sky', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Montana Central' AND c.districtId = 'Montana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_18', 'Morgan Garcia', 'Montana', c.id, 'Big Sky', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Montana North' AND c.districtId = 'Montana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_19', 'Cameron Taylor', 'SouthIdaho', c.id, 'Big Sky', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Idaho Central' AND c.districtId = 'SouthIdaho' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_20', 'Sage Anderson', 'SouthIdaho', c.id, 'Big Sky', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Idaho Central' AND c.districtId = 'SouthIdaho' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_21', 'Morgan Brown', 'SouthIdaho', c.id, 'Big Sky', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Idaho Central' AND c.districtId = 'SouthIdaho' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_22', 'Cameron Davis', 'SouthIdaho', NULL, 'Big Sky', 'Maybe', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_23', 'Sage Garcia', 'SouthIdaho', c.id, 'Big Sky', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Idaho North' AND c.districtId = 'SouthIdaho' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_24', 'Morgan Harris', 'SouthIdaho', c.id, 'Big Sky', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Idaho North' AND c.districtId = 'SouthIdaho' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_25', 'Cameron Jackson', 'SouthIdaho', c.id, 'Big Sky', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Idaho North' AND c.districtId = 'SouthIdaho' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_26', 'Taylor Brown', 'Utah', c.id, 'Big Sky', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Utah Central' AND c.districtId = 'Utah' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_27', 'Blake Davis', 'Utah', c.id, 'Big Sky', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Utah Central' AND c.districtId = 'Utah' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_28', 'Quinn Garcia', 'Utah', c.id, 'Big Sky', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Utah North' AND c.districtId = 'Utah' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_29', 'Taylor Harris', 'Utah', NULL, 'Big Sky', 'Yes', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_30', 'Blake Jackson', 'Utah', c.id, 'Big Sky', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Utah South' AND c.districtId = 'Utah' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_31', 'Quinn Johnson', 'Utah', NULL, 'Big Sky', 'Yes', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_32', 'Taylor Jones', 'Utah', c.id, 'Big Sky', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Utah North' AND c.districtId = 'Utah' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_33', 'Blake Lee', 'Utah', c.id, 'Big Sky', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Utah Central' AND c.districtId = 'Utah' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_34', 'Quinn Martinez', 'Utah', c.id, 'Big Sky', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Utah Central' AND c.districtId = 'Utah' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_35', 'Taylor Miller', 'Utah', c.id, 'Big Sky', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Utah North' AND c.districtId = 'Utah' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_36', 'Blake Johnson', 'Wyoming', c.id, 'Big Sky', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Wyoming Central' AND c.districtId = 'Wyoming' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_37', 'Quinn Jones', 'Wyoming', c.id, 'Big Sky', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Wyoming North' AND c.districtId = 'Wyoming' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_38', 'Taylor Lee', 'Wyoming', c.id, 'Big Sky', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Wyoming North' AND c.districtId = 'Wyoming' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_39', 'Blake Martinez', 'Wyoming', NULL, 'Big Sky', 'No', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_40', 'Quinn Miller', 'Wyoming', NULL, 'Big Sky', 'Yes', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_41', 'Taylor Moore', 'Wyoming', NULL, 'Big Sky', 'No', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_42', 'Blake Robinson', 'Wyoming', c.id, 'Big Sky', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Wyoming Central' AND c.districtId = 'Wyoming' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_43', 'Quinn Smith', 'Wyoming', c.id, 'Big Sky', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Wyoming Central' AND c.districtId = 'Wyoming' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_44', 'Taylor Taylor', 'Wyoming', c.id, 'Big Sky', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Wyoming North' AND c.districtId = 'Wyoming' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_45', 'Alex Anderson', 'Illinois', c.id, 'Great Lakes', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Illinois Central' AND c.districtId = 'Illinois' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_46', 'Dakota Brown', 'Illinois', c.id, 'Great Lakes', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Illinois South' AND c.districtId = 'Illinois' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_47', 'Riley Davis', 'Illinois', c.id, 'Great Lakes', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Illinois Central' AND c.districtId = 'Illinois' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_48', 'Alex Garcia', 'Illinois', c.id, 'Great Lakes', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Illinois North' AND c.districtId = 'Illinois' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_49', 'Dakota Harris', 'Illinois', c.id, 'Great Lakes', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Illinois North' AND c.districtId = 'Illinois' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_50', 'Riley Jackson', 'Illinois', c.id, 'Great Lakes', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Illinois Central' AND c.districtId = 'Illinois' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_51', 'Alex Johnson', 'Illinois', c.id, 'Great Lakes', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Illinois North' AND c.districtId = 'Illinois' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_52', 'Dakota Jones', 'Illinois', c.id, 'Great Lakes', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Illinois South' AND c.districtId = 'Illinois' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_53', 'Riley Lee', 'Illinois', c.id, 'Great Lakes', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Illinois South' AND c.districtId = 'Illinois' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_54', 'Alex Martinez', 'Illinois', c.id, 'Great Lakes', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Illinois North' AND c.districtId = 'Illinois' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_55', 'Dakota Jackson', 'Indiana', NULL, 'Great Lakes', 'Not Invited', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_56', 'Riley Johnson', 'Indiana', c.id, 'Great Lakes', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Indiana Central' AND c.districtId = 'Indiana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_57', 'Alex Jones', 'Indiana', c.id, 'Great Lakes', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Indiana Central' AND c.districtId = 'Indiana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_58', 'Dakota Lee', 'Indiana', c.id, 'Great Lakes', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Indiana South' AND c.districtId = 'Indiana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_59', 'Riley Martinez', 'Indiana', c.id, 'Great Lakes', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Indiana Central' AND c.districtId = 'Indiana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_60', 'Alex Miller', 'Indiana', c.id, 'Great Lakes', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Indiana North' AND c.districtId = 'Indiana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_61', 'Dakota Moore', 'Indiana', c.id, 'Great Lakes', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Indiana South' AND c.districtId = 'Indiana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_62', 'Riley Robinson', 'Indiana', c.id, 'Great Lakes', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Indiana South' AND c.districtId = 'Indiana' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_63', 'Alex Smith', 'Indiana', NULL, 'Great Lakes', 'Not Invited', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_64', 'Cameron Taylor', 'Michigan', c.id, 'Great Lakes', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Michigan Central' AND c.districtId = 'Michigan' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_65', 'Sage Anderson', 'Michigan', NULL, 'Great Lakes', 'No', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_66', 'Morgan Brown', 'Michigan', c.id, 'Great Lakes', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Michigan North' AND c.districtId = 'Michigan' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_67', 'Cameron Davis', 'Michigan', NULL, 'Great Lakes', 'No', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_68', 'Sage Garcia', 'Michigan', c.id, 'Great Lakes', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Michigan North' AND c.districtId = 'Michigan' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_69', 'Morgan Harris', 'Michigan', NULL, 'Great Lakes', 'No', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_70', 'Cameron Jackson', 'Michigan', c.id, 'Great Lakes', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Michigan North' AND c.districtId = 'Michigan' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_71', 'Sage Johnson', 'Michigan', NULL, 'Great Lakes', 'No', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_72', 'Morgan Jones', 'Michigan', c.id, 'Great Lakes', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Michigan North' AND c.districtId = 'Michigan' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_73', 'Jordan Lee', 'Ohio', c.id, 'Great Lakes', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Ohio North' AND c.districtId = 'Ohio' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_74', 'Phoenix Martinez', 'Ohio', c.id, 'Great Lakes', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Ohio North' AND c.districtId = 'Ohio' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_75', 'Avery Miller', 'Ohio', c.id, 'Great Lakes', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Ohio Central' AND c.districtId = 'Ohio' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_76', 'Jordan Moore', 'Ohio', c.id, 'Great Lakes', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Ohio Central' AND c.districtId = 'Ohio' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_77', 'Phoenix Robinson', 'Ohio', c.id, 'Great Lakes', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Ohio North' AND c.districtId = 'Ohio' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_78', 'Avery Garcia', 'Minnesota', c.id, 'Great Plains North', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Minnesota North' AND c.districtId = 'Minnesota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_79', 'Jordan Harris', 'Minnesota', c.id, 'Great Plains North', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Minnesota Central' AND c.districtId = 'Minnesota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_80', 'Phoenix Jackson', 'Minnesota', c.id, 'Great Plains North', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Minnesota Central' AND c.districtId = 'Minnesota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_81', 'Avery Johnson', 'Minnesota', c.id, 'Great Plains North', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Minnesota Central' AND c.districtId = 'Minnesota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_82', 'Jordan Jones', 'Minnesota', NULL, 'Great Plains North', 'No', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_83', 'Phoenix Lee', 'Minnesota', NULL, 'Great Plains North', 'Yes', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_84', 'Avery Martinez', 'Minnesota', c.id, 'Great Plains North', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Minnesota North' AND c.districtId = 'Minnesota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_85', 'Jordan Miller', 'Minnesota', c.id, 'Great Plains North', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Minnesota North' AND c.districtId = 'Minnesota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_86', 'Phoenix Moore', 'Minnesota', c.id, 'Great Plains North', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Minnesota Central' AND c.districtId = 'Minnesota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_87', 'Avery Robinson', 'Minnesota', NULL, 'Great Plains North', 'Yes', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_88', 'Jordan Lee', 'NorthDakota', c.id, 'Great Plains North', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'North Dakota Central' AND c.districtId = 'NorthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_89', 'Phoenix Martinez', 'NorthDakota', NULL, 'Great Plains North', 'No', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_90', 'Avery Miller', 'NorthDakota', NULL, 'Great Plains North', 'Yes', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_91', 'Jordan Moore', 'NorthDakota', c.id, 'Great Plains North', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'North Dakota Central' AND c.districtId = 'NorthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_92', 'Phoenix Robinson', 'NorthDakota', c.id, 'Great Plains North', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'North Dakota North' AND c.districtId = 'NorthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_93', 'Avery Smith', 'NorthDakota', NULL, 'Great Plains North', 'No', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_94', 'Jordan Taylor', 'NorthDakota', c.id, 'Great Plains North', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'North Dakota South' AND c.districtId = 'NorthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_95', 'Phoenix Anderson', 'NorthDakota', NULL, 'Great Plains North', 'No', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_96', 'Avery Brown', 'NorthDakota', c.id, 'Great Plains North', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'North Dakota South' AND c.districtId = 'NorthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_97', 'Casey Davis', 'SouthDakota', c.id, 'Great Plains North', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Dakota South' AND c.districtId = 'SouthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_98', 'Drew Garcia', 'SouthDakota', c.id, 'Great Plains North', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Dakota North' AND c.districtId = 'SouthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_99', 'River Harris', 'SouthDakota', c.id, 'Great Plains North', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Dakota Central' AND c.districtId = 'SouthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_100', 'Casey Jackson', 'SouthDakota', c.id, 'Great Plains North', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Dakota South' AND c.districtId = 'SouthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_101', 'Drew Johnson', 'SouthDakota', c.id, 'Great Plains North', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Dakota Central' AND c.districtId = 'SouthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_102', 'River Jones', 'SouthDakota', c.id, 'Great Plains North', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Dakota South' AND c.districtId = 'SouthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_103', 'Casey Lee', 'SouthDakota', c.id, 'Great Plains North', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Dakota North' AND c.districtId = 'SouthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_104', 'Drew Martinez', 'SouthDakota', c.id, 'Great Plains North', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'South Dakota South' AND c.districtId = 'SouthDakota' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_105', 'Alex Anderson', 'Wisconsin', c.id, 'Great Plains North', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Wisconsin North' AND c.districtId = 'Wisconsin' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_106', 'Dakota Brown', 'Wisconsin', c.id, 'Great Plains North', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Wisconsin North' AND c.districtId = 'Wisconsin' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_107', 'Riley Davis', 'Wisconsin', c.id, 'Great Plains North', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Wisconsin Central' AND c.districtId = 'Wisconsin' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_108', 'Alex Garcia', 'Wisconsin', NULL, 'Great Plains North', 'Not Invited', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_109', 'Dakota Harris', 'Wisconsin', c.id, 'Great Plains North', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Wisconsin South' AND c.districtId = 'Wisconsin' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_110', 'Riley Jackson', 'Wisconsin', NULL, 'Great Plains North', 'Not Invited', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_111', 'Blake Johnson', 'Iowa', c.id, 'Great Plains South', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Iowa North' AND c.districtId = 'Iowa' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_112', 'Quinn Jones', 'Iowa', c.id, 'Great Plains South', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Iowa South' AND c.districtId = 'Iowa' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_113', 'Taylor Lee', 'Iowa', c.id, 'Great Plains South', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Iowa South' AND c.districtId = 'Iowa' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_114', 'Blake Martinez', 'Iowa', c.id, 'Great Plains South', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Iowa North' AND c.districtId = 'Iowa' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_115', 'Quinn Miller', 'Iowa', c.id, 'Great Plains South', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Iowa South' AND c.districtId = 'Iowa' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_116', 'Taylor Moore', 'Iowa', NULL, 'Great Plains South', 'Maybe', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_117', 'Blake Robinson', 'Iowa', c.id, 'Great Plains South', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Iowa North' AND c.districtId = 'Iowa' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_118', 'Quinn Smith', 'Iowa', c.id, 'Great Plains South', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Iowa South' AND c.districtId = 'Iowa' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_119', 'Taylor Taylor', 'Iowa', c.id, 'Great Plains South', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Iowa North' AND c.districtId = 'Iowa' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_120', 'Blake Anderson', 'Iowa', NULL, 'Great Plains South', 'Maybe', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_121', 'Quinn Moore', 'Kansas', NULL, 'Great Plains South', 'Maybe', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_122', 'Taylor Robinson', 'Kansas', c.id, 'Great Plains South', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Kansas North' AND c.districtId = 'Kansas' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_123', 'Blake Smith', 'Kansas', c.id, 'Great Plains South', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Kansas Central' AND c.districtId = 'Kansas' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_124', 'Quinn Taylor', 'Kansas', NULL, 'Great Plains South', 'Not Invited', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_125', 'Taylor Anderson', 'Kansas', c.id, 'Great Plains South', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Kansas North' AND c.districtId = 'Kansas' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_126', 'Blake Johnson', 'Nebraska', c.id, 'Great Plains South', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Nebraska Central' AND c.districtId = 'Nebraska' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_127', 'Quinn Jones', 'Nebraska', c.id, 'Great Plains South', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Nebraska Central' AND c.districtId = 'Nebraska' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_128', 'Taylor Lee', 'Nebraska', c.id, 'Great Plains South', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Nebraska North' AND c.districtId = 'Nebraska' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_129', 'Blake Martinez', 'Nebraska', NULL, 'Great Plains South', 'Yes', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_130', 'Quinn Miller', 'Nebraska', c.id, 'Great Plains South', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Nebraska North' AND c.districtId = 'Nebraska' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_131', 'Taylor Moore', 'Nebraska', c.id, 'Great Plains South', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Nebraska Central' AND c.districtId = 'Nebraska' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_132', 'Blake Robinson', 'Nebraska', NULL, 'Great Plains South', 'No', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_133', 'Quinn Smith', 'Nebraska', c.id, 'Great Plains South', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Nebraska Central' AND c.districtId = 'Nebraska' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_134', 'Sage Harris', 'NorthernMissouri', c.id, 'Great Plains South', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Northern Missouri Central' AND c.districtId = 'NorthernMissouri' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_135', 'Morgan Jackson', 'NorthernMissouri', c.id, 'Great Plains South', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Northern Missouri Central' AND c.districtId = 'NorthernMissouri' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_136', 'Cameron Johnson', 'NorthernMissouri', c.id, 'Great Plains South', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Northern Missouri Central' AND c.districtId = 'NorthernMissouri' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_137', 'Sage Jones', 'NorthernMissouri', c.id, 'Great Plains South', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Northern Missouri Central' AND c.districtId = 'NorthernMissouri' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_138', 'Morgan Lee', 'NorthernMissouri', NULL, 'Great Plains South', 'No', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_139', 'Cameron Taylor', 'SouthernMissouri', c.id, 'Great Plains South', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Southern Missouri South' AND c.districtId = 'SouthernMissouri' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_140', 'Sage Anderson', 'SouthernMissouri', c.id, 'Great Plains South', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Southern Missouri Central' AND c.districtId = 'SouthernMissouri' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_141', 'Morgan Brown', 'SouthernMissouri', NULL, 'Great Plains South', 'Not Invited', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_142', 'Cameron Davis', 'SouthernMissouri', c.id, 'Great Plains South', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Southern Missouri South' AND c.districtId = 'SouthernMissouri' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_143', 'Sage Garcia', 'SouthernMissouri', c.id, 'Great Plains South', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Southern Missouri South' AND c.districtId = 'SouthernMissouri' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_144', 'Morgan Harris', 'SouthernMissouri', c.id, 'Great Plains South', 'Maybe', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Southern Missouri North' AND c.districtId = 'SouthernMissouri' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_145', 'Cameron Jackson', 'SouthernMissouri', c.id, 'Great Plains South', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Southern Missouri Central' AND c.districtId = 'SouthernMissouri' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_146', 'Taylor Brown', 'NorthCarolina', c.id, 'Mid-Atlantic', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'North Carolina North' AND c.districtId = 'NorthCarolina' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_147', 'Blake Davis', 'NorthCarolina', c.id, 'Mid-Atlantic', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'North Carolina North' AND c.districtId = 'NorthCarolina' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_148', 'Quinn Garcia', 'NorthCarolina', c.id, 'Mid-Atlantic', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'North Carolina Central' AND c.districtId = 'NorthCarolina' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_149', 'Taylor Harris', 'NorthCarolina', c.id, 'Mid-Atlantic', 'Yes', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'North Carolina North' AND c.districtId = 'NorthCarolina' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_150', 'Blake Jackson', 'NorthCarolina', c.id, 'Mid-Atlantic', 'No', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'North Carolina North' AND c.districtId = 'NorthCarolina' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_151', 'Quinn Moore', 'Virginia', c.id, 'Mid-Atlantic', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Virginia North' AND c.districtId = 'Virginia' LIMIT 1;
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_152', 'Taylor Robinson', 'Virginia', NULL, 'Mid-Atlantic', 'Maybe', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_153', 'Blake Smith', 'Virginia', NULL, 'Mid-Atlantic', 'Not Invited', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
VALUES ('dev_person_154', 'Quinn Taylor', 'Virginia', NULL, 'Mid-Atlantic', 'Maybe', 1766252175, 1766252175);
INSERT OR IGNORE INTO people (personId, name, primaryDistrictId, primaryCampusId, primaryRegion, status, createdAt, statusLastUpdated) 
SELECT 'dev_person_155', 'Taylor Anderson', 'Virginia', c.id, 'Mid-Atlantic', 'Not Invited', 1766252175, 1766252175
FROM campuses c WHERE c.name = 'Virginia South' AND c.districtId = 'Virginia' LIMIT 1;
