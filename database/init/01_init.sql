-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Group membership
CREATE TABLE user_groups (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, group_id)
);

-- Shopping profiles (lists containers)
CREATE TABLE shopping_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id),
    group_id UUID REFERENCES groups(id),
    is_shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shopping lists
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES shopping_profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Shopping items
CREATE TABLE shopping_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit VARCHAR(50),
    is_checked BOOLEAN DEFAULT FALSE,
    checked_at TIMESTAMP,
    checked_by UUID REFERENCES users(id),
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products catalog (for suggestions)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    default_unit VARCHAR(50),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Item history for analytics
CREATE TABLE item_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES shopping_profiles(id) ON DELETE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- List templates
CREATE TABLE list_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES shopping_profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    items JSONB NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_shopping_lists_profile ON shopping_lists(profile_id);
CREATE INDEX idx_shopping_lists_status ON shopping_lists(status);
CREATE INDEX idx_shopping_items_list ON shopping_items(list_id);
CREATE INDEX idx_shopping_items_checked ON shopping_items(is_checked);
CREATE INDEX idx_item_history_profile ON item_history(profile_id);
CREATE INDEX idx_item_history_purchased ON item_history(purchased_at);

-- Trigram index for fuzzy search
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_shopping_items_name_trgm ON shopping_items USING gin(name gin_trgm_ops);

-- Insert some sample products
INSERT INTO products (name, category, default_unit) VALUES
('Mleko', 'Nabiał', 'l'),
('Chleb', 'Pieczywo', 'szt'),
('Masło', 'Nabiał', 'szt'),
('Jajka', 'Nabiał', 'szt'),
('Ser żółty', 'Nabiał', 'kg'),
('Pomidory', 'Warzywa', 'kg'),
('Ogórki', 'Warzywa', 'kg'),
('Jabłka', 'Owoce', 'kg'),
('Banany', 'Owoce', 'kg'),
('Kurczak', 'Mięso', 'kg'),
('Wołowina', 'Mięso', 'kg'),
('Ryż', 'Produkty sypkie', 'kg'),
('Makaron', 'Produkty sypkie', 'kg'),
('Olej', 'Tłuszcze', 'l'),
('Cukier', 'Produkty sypkie', 'kg'),
('Mąka', 'Produkty sypkie', 'kg'),
('Kawa', 'Napoje', 'szt'),
('Herbata', 'Napoje', 'szt'),
('Woda mineralna', 'Napoje', 'l'),
('Sok pomarańczowy', 'Napoje', 'l');
