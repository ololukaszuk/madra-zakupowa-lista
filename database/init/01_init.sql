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
    name VARCHAR(200) NOT NULL UNIQUE,
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
-- Nabiał
('Mleko UHT 2% Mleczna Dolina 1l', 'Nabiał', 'szt'),
('Mleko UHT 3,2% Mleczna Dolina 1l', 'Nabiał', 'szt'),
('Mleko bez laktozy', 'Nabiał', 'l'),
('Jogurt naturalny Fruvita 180g', 'Nabiał', 'szt'),
('Jogurt truskawkowy Fruvita 180g', 'Nabiał', 'szt'),
('Masło ekstra Polskie 200g', 'Nabiał', 'szt'),
('Margaryna', 'Nabiał', 'szt'),
('Śmietana 18% 200g', 'Nabiał', 'szt'),
('Śmietana 30%', 'Nabiał', 'szt'),
('Ser gouda plastry 150g', 'Nabiał', 'szt'),
('Ser edamski blok 1kg', 'Nabiał', 'szt'),
('Ser pleśniowy', 'Nabiał', 'szt'),
('Twaróg półtłusty 250g', 'Nabiał', 'szt'),
('Jajka klasa A M 10 szt', 'Nabiał', 'opak'),

-- Pieczywo
('Chleb tostowy pszenny 500g', 'Pieczywo', 'szt'),
('Chleb żytni krojony 500g', 'Pieczywo', 'szt'),
('Bułki pszenne 6 szt', 'Pieczywo', 'opak'),
('Bułki maślane 4 szt', 'Pieczywo', 'opak'),
('Bagietka czosnkowa', 'Pieczywo', 'szt'),
('Tortilla pszenna', 'Pieczywo', 'szt'),

-- Warzywa
('Pomidory malinowe', 'Warzywa', 'kg'),
('Pomidory koktajlowe 500g', 'Warzywa', 'opak'),
('Ogórek gruntowy', 'Warzywa', 'kg'),
('Papryka mix 500g', 'Warzywa', 'opak'),
('Marchew myta 1kg', 'Warzywa', 'opak'),
('Ziemniaki jadalne 2,5kg', 'Warzywa', 'opak'),
('Cebula żółta 1kg', 'Warzywa', 'opak'),
('Czosnek', 'Warzywa', 'szt'),
('Brokuł', 'Warzywa', 'szt'),
('Kalafior', 'Warzywa', 'szt'),
('Sałata masłowa', 'Warzywa', 'szt'),

-- Owoce
('Jabłka ligol', 'Owoce', 'kg'),
('Banany', 'Owoce', 'kg'),
('Pomarańcze 2kg', 'Owoce', 'opak'),
('Mandarynki 1kg', 'Owoce', 'opak'),
('Cytryny', 'Owoce', 'kg'),
('Winogrona jasne 500g', 'Owoce', 'opak'),
('Truskawki', 'Owoce', 'kg'),
('Borówki amerykańskie 250g', 'Owoce', 'opak'),

-- Mięso
('Kurczak', 'Mięso', 'kg'),
('Pierś z kurczaka tacka', 'Mięso', 'kg'),
('Udka z kurczaka', 'Mięso', 'kg'),
('Filet z indyka', 'Mięso', 'kg'),
('Wołowina', 'Mięso', 'kg'),
('Wieprzowina', 'Mięso', 'kg'),
('Schab bez kości', 'Mięso', 'kg'),
('Karkówka wieprzowa', 'Mięso', 'kg'),
('Boczek', 'Mięso', 'kg'),
('Mięso mielone wieprzowe', 'Mięso', 'kg'),
('Mięso mielone wołowe', 'Mięso', 'kg'),

-- Wędliny
('Szynka konserwowa plastry 120g', 'Wędliny', 'szt'),
('Szynka drobiowa plastry 100g', 'Wędliny', 'szt'),
('Parówki drobiowe 250g', 'Wędliny', 'szt'),
('Kiełbasa śląska 550g', 'Wędliny', 'szt'),
('Salami pepperoni 150g', 'Wędliny', 'szt'),
('Baleron', 'Wędliny', 'kg'),

-- Ryby
('Łosoś atlantycki świeży', 'Ryby', 'kg'),
('Łosoś wędzony plastry 100g', 'Ryby', 'szt'),
('Mintaj filet mrożony', 'Ryby', 'kg'),
('Paluszki rybne 450g', 'Ryby', 'szt'),
('Tuńczyk kawałki w sosie własnym', 'Ryby', 'szt'),
('Śledzie', 'Ryby', 'kg'),

-- Produkty sypkie
('Ryż biały długoziarnisty 1kg', 'Produkty sypkie', 'szt'),
('Ryż basmati 1kg', 'Produkty sypkie', 'szt'),
('Makaron spaghetti 500g', 'Produkty sypkie', 'szt'),
('Makaron penne 500g', 'Produkty sypkie', 'szt'),
('Kasza gryczana prażona 1kg', 'Produkty sypkie', 'szt'),
('Kasza jaglana', 'Produkty sypkie', 'kg'),
('Cukier biały 1kg', 'Produkty sypkie', 'szt'),
('Cukier brązowy', 'Produkty sypkie', 'kg'),
('Mąka pszenna typ 450 1kg', 'Produkty sypkie', 'szt'),
('Mąka żytnia', 'Produkty sypkie', 'kg'),
('Płatki owsiane', 'Produkty sypkie', 'kg'),

-- Tłuszcze
('Olej rzepakowy 1l', 'Tłuszcze', 'szt'),
('Olej słonecznikowy 1l', 'Tłuszcze', 'szt'),
('Oliwa z oliwek extra virgin 500ml', 'Tłuszcze', 'szt'),
('Masło klarowane', 'Tłuszcze', 'szt'),

-- Przyprawy
('Sól kamienna jodowana 1kg', 'Przyprawy', 'szt'),
('Pieprz czarny mielony 20g', 'Przyprawy', 'szt'),
('Papryka słodka mielona 50g', 'Przyprawy', 'szt'),
('Papryka ostra', 'Przyprawy', 'szt'),
('Czosnek granulowany 40g', 'Przyprawy', 'szt'),
('Bazylia', 'Przyprawy', 'szt'),
('Oregano', 'Przyprawy', 'szt'),
('Cynamon', 'Przyprawy', 'szt'),
('Przyprawa do kurczaka 30g', 'Przyprawy', 'szt'),

-- Napoje
('Woda niegazowana 1,5l', 'Napoje', 'szt'),
('Woda gazowana 1,5l', 'Napoje', 'szt'),
('Sok pomarańczowy 100% 1l', 'Napoje', 'szt'),
('Sok jabłkowy 100% 1l', 'Napoje', 'szt'),
('Cola 2l', 'Napoje', 'szt'),
('Kawa mielona 500g', 'Napoje', 'szt'),
('Kawa ziarnista', 'Napoje', 'szt'),
('Herbata czarna ekspresowa 100 torebek', 'Napoje', 'opak'),
('Herbata zielona', 'Napoje', 'szt'),

-- Słodycze
('Czekolada mleczna 100g', 'Słodycze', 'szt'),
('Czekolada gorzka 70% 100g', 'Słodycze', 'szt'),
('Wafel kakaowy', 'Słodycze', 'szt'),
('Ciastka maślane 400g', 'Słodycze', 'szt'),
('Baton czekoladowy', 'Słodycze', 'szt'),
('Cukierki', 'Słodycze', 'kg'),
('Lody', 'Słodycze', 'szt'),

-- Mrożonki
('Pizza margherita mrożona 300g', 'Mrożonki', 'szt'),
('Pizza salami mrożona 350g', 'Mrożonki', 'szt'),
('Frytki mrożone 1kg', 'Mrożonki', 'szt'),
('Warzywa na patelnię 750g', 'Mrożonki', 'szt'),
('Lody waniliowe 1l', 'Mrożonki', 'szt'),

-- Chemia domowa
('Płyn do naczyń cytrynowy 900ml', 'Chemia domowa', 'szt'),
('Proszek do prania kolor 4kg', 'Chemia domowa', 'szt'),
('Płyn do płukania tkanin 2l', 'Chemia domowa', 'szt'),
('Papier toaletowy 8 rolek', 'Chemia domowa', 'opak'),
('Ręczniki papierowe 2 rolki', 'Chemia domowa', 'opak'),
('Środek do mycia podłóg', 'Chemia domowa', 'l'),

-- Higiena
('Mydło w płynie 500ml', 'Higiena', 'szt'),
('Szampon do włosów 400ml', 'Higiena', 'szt'),
('Żel pod prysznic 400ml', 'Higiena', 'szt'),
('Pasta do zębów 75ml', 'Higiena', 'szt'),
('Szczoteczka do zębów', 'Higiena', 'szt'),
('Dezodorant', 'Higiena', 'szt'),

-- Gotowe dania
('Lasagne', 'Dania gotowe', 'szt'),
('Spaghetti bolognese', 'Dania gotowe', 'szt'),
('Pierogi ruskie', 'Dania gotowe', 'kg'),
('Pierogi z mięsem', 'Dania gotowe', 'kg'),
('Gołąbki', 'Dania gotowe', 'kg'),
('Naleśniki', 'Dania gotowe', 'szt'),
('Placki ziemniaczane', 'Dania gotowe', 'kg'),

-- Fast food / przekąski
('Hot dog', 'Przekąski', 'szt'),
('Hamburger', 'Przekąski', 'szt'),
('Zapiekanka', 'Przekąski', 'szt'),
('Chipsy ziemniaczane', 'Przekąski', 'szt'),
('Nachosy', 'Przekąski', 'szt'),
('Paluszki', 'Przekąski', 'szt'),
('Popcorn', 'Przekąski', 'szt'),
('Krakersy', 'Przekąski', 'szt'),

-- Sosy i dodatki
('Ketchup', 'Sosy', 'szt'),
('Musztarda', 'Sosy', 'szt'),
('Majonez', 'Sosy', 'szt'),
('Sos czosnkowy', 'Sosy', 'szt'),
('Sos barbecue', 'Sosy', 'szt'),
('Sos sojowy', 'Sosy', 'szt'),
('Ocet spirytusowy', 'Sosy', 'l'),
('Ocet balsamiczny', 'Sosy', 'l'),

-- Konserwy
('Fasola czerwona w puszce', 'Konserwy', 'szt'),
('Kukurydza konserwowa', 'Konserwy', 'szt'),
('Groszek konserwowy', 'Konserwy', 'szt'),
('Ogórki konserwowe', 'Konserwy', 'szt'),
('Pomidory w puszce', 'Konserwy', 'szt'),
('Koncentrat pomidorowy', 'Konserwy', 'szt'),
('Pasztet', 'Konserwy', 'szt'),

-- Śniadaniowe
('Płatki kukurydziane', 'Śniadaniowe', 'szt'),
('Musli', 'Śniadaniowe', 'kg'),
('Granola', 'Śniadaniowe', 'kg'),
('Dżem truskawkowy', 'Śniadaniowe', 'szt'),
('Dżem morelowy', 'Śniadaniowe', 'szt'),
('Miód', 'Śniadaniowe', 'szt'),
('Masło orzechowe', 'Śniadaniowe', 'szt'),
('Nutella', 'Śniadaniowe', 'szt'),

-- Produkty bio / fit
('Mleko roślinne migdałowe', 'Bio & Fit', 'l'),
('Mleko owsiane', 'Bio & Fit', 'l'),
('Jogurt sojowy', 'Bio & Fit', 'szt'),
('Tofu naturalne', 'Bio & Fit', 'kg'),
('Tofu wędzone', 'Bio & Fit', 'kg'),
('Quinoa', 'Bio & Fit', 'kg'),
('Chia', 'Bio & Fit', 'kg'),
('Siemię lniane', 'Bio & Fit', 'kg'),

-- Orzechy i bakalie
('Orzechy włoskie', 'Bakalie', 'kg'),
('Orzechy nerkowca', 'Bakalie', 'kg'),
('Migdały', 'Bakalie', 'kg'),
('Rodzynki', 'Bakalie', 'kg'),
('Żurawina suszona', 'Bakalie', 'kg'),
('Daktyle suszone', 'Bakalie', 'kg'),

-- Alkohole
('Piwo jasne', 'Alkohol', 'szt'),
('Piwo ciemne', 'Alkohol', 'szt'),
('Wino czerwone', 'Alkohol', 'szt'),
('Wino białe', 'Alkohol', 'szt'),
('Wódka', 'Alkohol', 'szt'),
('Whisky', 'Alkohol', 'szt'),
('Rum', 'Alkohol', 'szt'),

-- Dla dzieci
('Kaszka mleczna', 'Dla dzieci', 'szt'),
('Obiadek w słoiczku', 'Dla dzieci', 'szt'),
('Deserek owocowy', 'Dla dzieci', 'szt'),
('Sok dla dzieci', 'Dla dzieci', 'l'),
('Chrupki kukurydziane', 'Dla dzieci', 'szt'),

-- Zwierzęta
('Karma dla psa sucha', 'Zwierzęta', 'kg'),
('Karma dla psa mokra', 'Zwierzęta', 'szt'),
('Karma dla kota sucha', 'Zwierzęta', 'kg'),
('Karma dla kota mokra', 'Zwierzęta', 'szt'),
('Żwirek dla kota', 'Zwierzęta', 'kg'),
('Przysmaki dla psa', 'Zwierzęta', 'szt'),

-- Artykuły papiernicze
('Zeszyt', 'Papiernicze', 'szt'),
('Długopis', 'Papiernicze', 'szt'),
('Ołówek', 'Papiernicze', 'szt'),
('Marker', 'Papiernicze', 'szt'),
('Blok rysunkowy', 'Papiernicze', 'szt'),
('Papier ksero', 'Papiernicze', 'szt'),

-- Dom & kuchnia
('Folia aluminiowa', 'Dom i kuchnia', 'szt'),
('Folia spożywcza', 'Dom i kuchnia', 'szt'),
('Papier do pieczenia', 'Dom i kuchnia', 'szt'),
('Worki na śmieci', 'Dom i kuchnia', 'szt'),
('Gąbki do naczyń', 'Dom i kuchnia', 'szt'),
('Ścierki kuchenne', 'Dom i kuchnia', 'szt'),

-- Elektronika drobna
('Baterie AA', 'Elektronika', 'szt'),
('Baterie AAA', 'Elektronika', 'szt'),
('Żarówka LED', 'Elektronika', 'szt'),
('Przedłużacz', 'Elektronika', 'szt'),
('Ładowarka USB', 'Elektronika', 'szt');