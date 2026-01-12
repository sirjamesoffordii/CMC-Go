CREATE USER 'cmc_go'@'%' IDENTIFIED BY 'Wow#24123';
GRANT ALL PRIVILEGES ON railway.* TO 'cmc_go'@'%';
FLUSH PRIVILEGES;
SELECT user, host FROM mysql.user WHERE user = 'cmc_go';
