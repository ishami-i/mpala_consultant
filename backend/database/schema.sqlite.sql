CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    project_id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    upi TEXT NOT NULL,
    location TEXT NOT NULL,
    project_details TEXT NOT NULL,
    budget REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','contacted','closed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gallery_images (
    image_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    filename TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery_images (category);
