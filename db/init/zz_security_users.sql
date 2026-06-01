-- Security users for the local MariaDB 5.5 container.
-- This file is imported after the schema seed on a fresh docker volume.

GRANT USAGE ON *.* TO 'archery_readonly'@'%' IDENTIFIED BY 'StrongPass_RO!9';
GRANT SELECT ON `cos20031`.`Age_Class` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Archer` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Arrow_Score` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Category` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Club_Championship` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Competition` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Competition_Entry` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Distance` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Equipment_Type` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Gender` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Round` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Round_Range` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Score` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Score_End` TO 'archery_readonly'@'%';
GRANT SELECT ON `cos20031`.`Target_Face` TO 'archery_readonly'@'%';

GRANT USAGE ON *.* TO 'archery_scorer'@'%' IDENTIFIED BY 'StrongPass_SC!7';
GRANT SELECT ON `cos20031`.`Archer` TO 'archery_scorer'@'%';
GRANT SELECT ON `cos20031`.`Round` TO 'archery_scorer'@'%';
GRANT SELECT ON `cos20031`.`Round_Range` TO 'archery_scorer'@'%';
GRANT SELECT ON `cos20031`.`Equipment_Type` TO 'archery_scorer'@'%';
GRANT SELECT ON `cos20031`.`Category` TO 'archery_scorer'@'%';
GRANT SELECT ON `cos20031`.`Distance` TO 'archery_scorer'@'%';
GRANT SELECT ON `cos20031`.`Target_Face` TO 'archery_scorer'@'%';
GRANT INSERT ON `cos20031`.`Staged_Score` TO 'archery_scorer'@'%';
GRANT INSERT ON `cos20031`.`Staged_Score_End` TO 'archery_scorer'@'%';
GRANT INSERT ON `cos20031`.`Staged_Arrow_Score` TO 'archery_scorer'@'%';

GRANT USAGE ON *.* TO 'archery_recorder'@'%' IDENTIFIED BY 'StrongPass_RE!3';
GRANT SELECT ON `cos20031`.`Archer` TO 'archery_recorder'@'%';
GRANT SELECT ON `cos20031`.`Competition` TO 'archery_recorder'@'%';
GRANT SELECT ON `cos20031`.`Competition_Entry` TO 'archery_recorder'@'%';
GRANT SELECT ON `cos20031`.`Recorder` TO 'archery_recorder'@'%';
GRANT SELECT, INSERT, UPDATE ON `cos20031`.`Score` TO 'archery_recorder'@'%';
GRANT SELECT, INSERT, UPDATE ON `cos20031`.`Score_End` TO 'archery_recorder'@'%';
GRANT SELECT, INSERT, UPDATE ON `cos20031`.`Arrow_Score` TO 'archery_recorder'@'%';
GRANT SELECT, UPDATE ON `cos20031`.`Staged_Score` TO 'archery_recorder'@'%';
GRANT SELECT ON `cos20031`.`Staged_Score_End` TO 'archery_recorder'@'%';
GRANT SELECT ON `cos20031`.`Staged_Arrow_Score` TO 'archery_recorder'@'%';

FLUSH PRIVILEGES;
