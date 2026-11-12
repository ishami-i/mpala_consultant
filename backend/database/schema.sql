CREATE DATABASE IF NOT EXISTS mpala;
USE mpala;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    upi VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    project_details TEXT NOT NULL,
    budget DECIMAL(15,2) NOT NULL,
    status ENUM('new','reviewing','contacted','closed') NOT NULL DEFAULT 'new',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
