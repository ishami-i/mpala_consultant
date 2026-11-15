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
    service VARCHAR(50) NOT NULL DEFAULT '',
    project_details TEXT NOT NULL,
    budget DECIMAL(15,2) NOT NULL,
    status ENUM('new','reviewing','contacted','closed') NOT NULL DEFAULT 'new',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gallery_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    caption VARCHAR(255) NOT NULL DEFAULT '',
    filename VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gallery_category (category)
);
