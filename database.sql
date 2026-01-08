-- =============================================
-- ALRA CARE - SUPABASE COMPLETE SETUP (FINAL FIXED VERSION)
-- =============================================

-- Enable Supabase extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone for Indonesia
SET timezone = 'Asia/Jakarta';

-- ===== TABEL UTAMA =====

-- 1. Service Categories
CREATE TABLE service_categories (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'checkbox',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Services
CREATE TABLE services (
    id VARCHAR(100) PRIMARY KEY,
    category_id VARCHAR(50) REFERENCES service_categories(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    price VARCHAR(100) NOT NULL,
    price_numeric DECIMAL(12,2),
    image_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    date_of_birth DATE,
    gender VARCHAR(10),
    medical_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bookings
CREATE TABLE bookings (
    id VARCHAR(50) PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(20) NOT NULL,
    patient_address TEXT NOT NULL,
    patient_notes TEXT,
    
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    appointment_datetime TIMESTAMPTZ NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending',
    total_price DECIMAL(12,2) DEFAULT 0,
    
    booking_date TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Booking Services
CREATE TABLE booking_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id VARCHAR(50) REFERENCES bookings(id) ON DELETE CASCADE,
    service_id VARCHAR(100) REFERENCES services(id) ON DELETE RESTRICT,
    service_name VARCHAR(500) NOT NULL,
    service_price VARCHAR(100) NOT NULL,
    price_numeric DECIMAL(12,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Gallery
CREATE TABLE gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Users (Admin)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Social Media
CREATE TABLE social_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Settings
CREATE TABLE settings (
    id VARCHAR(100) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    value TEXT,
    data_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== TABEL KEAMANAN TAMBAHAN =====

-- 10. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Booking Attempts (Rate Limiting)
CREATE TABLE booking_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    attempt_count INTEGER DEFAULT 1,
    last_attempt TIMESTAMPTZ DEFAULT NOW(),
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. User Sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CONSTRAINTS UNTUK DATA VALIDATION =====

-- Constraints untuk bookings
ALTER TABLE bookings 
ADD CONSTRAINT valid_booking_status 
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'));

ALTER TABLE bookings 
ADD CONSTRAINT future_appointment 
CHECK (appointment_datetime > created_at);

-- Constraints untuk patients
ALTER TABLE patients
ADD CONSTRAINT valid_phone_format 
CHECK (phone ~ '^[0-9]{10,13}$');

ALTER TABLE patients
ADD CONSTRAINT valid_email_format 
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE patients
ADD CONSTRAINT valid_gender 
CHECK (gender IS NULL OR gender IN ('Laki-laki', 'Perempuan'));

-- Constraints untuk services
ALTER TABLE services
ADD CONSTRAINT positive_price 
CHECK (price_numeric > 0);

ALTER TABLE services
ADD CONSTRAINT valid_category 
CHECK (category_id IS NOT NULL);

-- Constraints untuk users
ALTER TABLE users
ADD CONSTRAINT valid_role 
CHECK (role IN ('admin', 'superadmin', 'staff'));

ALTER TABLE users
ADD CONSTRAINT valid_email_user 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- ===== INSERT DATA =====

-- A. Service Categories (5 categories)
INSERT INTO service_categories (id, title, description, display_order) VALUES
('perawatan1', 'Perawatan Luka Modern', 'Pilih jenis perawatan luka yang Anda butuhkan', 1),
('perawatan2', 'Perawatan Kecantikan', 'Pilih jenis perawatan kecantikan yang Anda butuhkan', 2),
('perawatan3', 'Sunat Modern', 'Pilih metode sunat yang sesuai dengan kebutuhan', 3),
('perawatan4', 'Hipnoterapi', 'Pilih jenis terapi hipnoterapi yang sesuai dengan kebutuhan Anda', 4),
('perawatan5', 'Skincare', 'Pilih produk skincare yang sesuai dengan kebutuhan kulit Anda', 5);

-- B. All Services (76 services)
-- Perawatan Luka Modern (3 services)
INSERT INTO services (id, category_id, name, price, price_numeric, image_url, display_order) VALUES
('Perawatan Luka di Klinik', 'perawatan1', '1. Perawatan Luka di Klinik', 'Rp 150.000', 150000, './images/L_PERAWATANLIKADIKLINIK.webp', 1),
('Perawatan Luka Ke Rumah', 'perawatan1', '2. Perawatan Luka Ke Rumah di Area Pontianak', 'Rp 200.000', 200000, './images/L_PERAWATANLUKAKERUMAHPASIENDIAREAPONTIANAK_1.webp', 2),
('L_SENDALDIABETES', 'perawatan1', '3. Sendal Diabetes', 'Rp 500.000', 500000, './images/L_SENDALDIABETES.webp', 3);

-- Perawatan Kecantikan (53 services)
INSERT INTO services (id, category_id, name, price, price_numeric, image_url, display_order) VALUES
('A_TAHILALAT(NEAVY)_1', 'perawatan2', '1. Tahi Lalat (Neavy)_1', 'Rp 500.000', 500000, './images/A_TAHILALAT(NEAVY).webp', 1),
('A_TAHILALAT(NEAVY)_2_7', 'perawatan2', '2. Tahi Lalat (Neavy)_2-7', 'Rp 1.000.000', 1000000, './images/A_TAHILALAT(NEAVY).webp', 2),
('A_TAHILALAT(NEAVY)_8_SEWAJAH', 'perawatan2', '3. Tahi Lalat (Neavy)_8-SEWAJAH', 'Rp 1.500.000', 1500000, './images/A_TAHILALAT(NEAVY).webp', 3),
('A_KUTIL(SKINTAG)_1_10', 'perawatan2', '4. Kutil (SKintag)_1-10', 'Rp 500.000', 500000, './images/A_KUTIL(SKINTAG).webp', 4),
('A_KUTIL(SKINTAG)_11_30', 'perawatan2', '5. Kutil (SKintag)_11-30', 'Rp 1.000.000', 1000000, './images/A_KUTIL(SKINTAG).webp', 5),
('A_KUTIL(SKINTAG)_31_SEWAJAH', 'perawatan2', '6. Kutil (SKintag)_31-SEWAJAH', 'Rp 1.500.000', 1500000, './images/A_KUTIL(SKINTAG).webp', 6),
('A_FLEKHITAM(MELASMA)', 'perawatan2', '7. Flek Hitam (Melasma)', 'Rp 350.000', 350000, './images/A_FLEKHITAM(MELASMA).webp', 7),
('A_FLEKBULE(FREACKLES)_1_20', 'perawatan2', '8. Flek Bule (Freackles)_1-20', 'Rp 500.000', 500000, './images/A_FLEKBULE(FREACKLES).webp', 8),
('A_FLEKBULE(FREACKLES)_21_50', 'perawatan2', '9. Flek Bule (FreackLES)_21-50', 'Rp 1.000.000', 1000000, './images/A_FLEKBULE(FREACKLES).webp', 9),
('A_FLEKBULE(FREACKLES)_50_SEWAJAH', 'perawatan2', '10. Flek Bule (Freackles)_50-Sewajah', 'Rp 1.500.000', 1500000, './images/A_FLEKBULE(FREACKLES).webp', 10),
('A_SEBOROIKKERATOSIS_1_10', 'perawatan2', '11. Seboroik Keratosis_1-10', 'Rp 500.000', 500000, './images/A_SEBOROIKKERATOSIS.webp', 11),
('A_SEBOROIKKERATOSIS_11_30', 'perawatan2', '12. Seboroik Keratosis_11-30', 'Rp 1.000.000', 1000000, './images/A_SEBOROIKKERATOSIS.webp', 12),
('A_SEBOROIKKERATOSIS_31_SEWAJAH', 'perawatan2', '13. Seboroik Keratosis_31-SEWAJAH', 'Rp 1.500.000', 1500000, './images/A_SEBOROIKKERATOSIS.webp', 13),
('A_BABAK(NEVUSOFOTA)', 'perawatan2', '14. Babak (Nevusofota)', 'Rp 350.000', 350000, './images/A_BABAK(NEVUSOFOTA).webp', 14),
('A_NEVUSOFHORY', 'perawatan2', '15. Nevusofhory', 'Rp 350.000', 350000, './images/A_NEVUSOFHORY.webp', 15),
('A_LENTIGO_1', 'perawatan2', '16. Lentigo_1', 'Rp 500.000', 500000, './images/A_LENTIGO.webp', 16),
('A_LENTIGO_2_7', 'perawatan2', '17. Lentigo_2-7', 'Rp 1.000.000', 1000000, './images/A_LENTIGO.webp', 17),
('A_LENTIGO_8_SEWAJAH', 'perawatan2', '18. Lentigo_8-SEWAJAH', 'Rp 1.500.000', 1500000, './images/A_LENTIGO.webp', 18),
('A_NODAKOPISUSU(CAVEAULAITMACULE)', 'perawatan2', '19. Noda Kopi Susu (Caveau Lait Macule)', 'Rp 500.000', 500000, './images/A_NODAKOPISUSU(CAVEAULAITMACULE).webp', 19),
('A_GOSONGKARENAJENUHPAKAIKRIMRACIKAN(ONCHRONOSIS)', 'perawatan2', '20. Gosong Karena Jenuh Pakai Krim Racikan (Onchronosis)', 'Rp 500.000', 500000, './images/A_GOSONGKARENAJENUHPAKAIKRIMRACIKAN(ONCHRONOSIS).webp', 20),
('A_NODABEKASLUKA(HIPERPIGMENTASI)', 'perawatan2', '21. Noda Bekas Luka (Hiperpigmentasi)', 'Rp 550.000', 550000, './images/A_NODABEKASLUKA(HIPERPIGMENTASI).webp', 21),
('A_LASERTATO4X4CM', 'perawatan2', '22. Laser Tato 4x4cm', 'Rp 350.000', 350000, './images/A_LASERTATO4X4CM.webp', 22),
('A_XENTALASMA', 'perawatan2', '23. Xentalasma', 'Rp 500.000', 500000, './images/A_XENTALASMA.webp', 23),
('A_BLOODSPOT', 'perawatan2', '24. Blood Spot_1-10', 'Rp 500.000', 500000, './images/A_BLOODSPOT.webp', 24),
('A_BLOODSPOT_11_30', 'perawatan2', '25. Blood Spot_11-30', 'Rp 1.000.000', 1000000, './images/A_BLOODSPOT.webp', 25),
('A_BLOODSPOT_31_SEWAJAH', 'perawatan2', '26. Blood Spot_31-Sewajah', 'Rp 500.000', 500000, './images/A_BLOODSPOT.webp', 26),
('A_TOMPEL3X3CM', 'perawatan2', '27. Tompel 3x3cm', 'Rp 500.000', 500000, './images/A_TOMPEL.webp', 27),
('A_MILLIA_1_10', 'perawatan2', '28. Millia_1-10', 'Rp 500.000', 500000, './images/A_MILLIA.webp', 28),
('A_MILLIA_11_30', 'perawatan2', '29. Millia_11-30', 'Rp 1.000.000', 1000000, './images/A_MILLIA.webp', 29),
('A_MILLIA_31_SEWAJAH', 'perawatan2', '30. Millia_31-SEWAJAH', 'Rp 1.500.000', 1500000, './images/A_MILLIA.webp', 30),
('A_SYRINGOMA_1_10', 'perawatan2', '31. Syringoma_1-10', 'Rp 500.000', 500000, './images/A_SYRINGOMA.webp', 31),
('A_SYRINGOMA_11_30', 'perawatan2', '32. Syringoma_11-30', 'Rp 1.000.000', 1000000, './images/A_SYRINGOMA.webp', 32),
('A_SYRINGOMA_31_SEWAJAH', 'perawatan2', '33. Syringoma_31-SEWAJAH', 'Rp 1.500.000', 1500000, './images/A_SYRINGOMA.webp', 33),
('A_MATAIKAN(CLAVUS)', 'perawatan2', '34. Mata Ikan (Clavus)', 'Rp 500.000', 500000, './images/A_MATAIKAN(CLAVUS).webp', 34),
('A_KANTUNGMATA(EYEBAG)', 'perawatan2', '35. Kantung Mata (Eyebag)', 'Rp 550.000', 550000, './images/A_KANTUNGMATA(EYEBAG).webp', 35),
('A_KERIPUT(WRINCLE)', 'perawatan2', '36. Keriput (Wrincle)', 'Rp 550.000', 550000, './images/A_KERIPUT(WRINCLE).webp', 36),
('A_STRETCHMARK', 'perawatan2', '37. Stretchmark', 'Rp 550.000', 550000, './images/A_STRETCHMARK.webp', 37),
('A_KOMEDOHITAM(BLACKHEAD)', 'perawatan2', '38. Komedo Hitam (Blackhead)', 'Rp 150.000', 150000, './images/A_KOMEDOHITAM(BLACKHEAD).webp', 38),
('A_KOMEDOPUTIH(WHITEHEAD)', 'perawatan2', '39. Komedo Putih (Whitehead)', 'Rp 150.000', 150000, './images/A_KOMEDOPUTIH(WHITEHEAD).webp', 39),
('A_JERAWAT(ACNE)', 'perawatan2', '40. Jerawat (Acne)', 'Rp 250.000', 250000, './images/A_JERAWAT(ACNE).webp', 40),
('A_NODABEKASJERAWAT(ACNESPOT)', 'perawatan2', '41. Noda Bekas Jerawat (Acne Spot)', 'Rp 500.000', 500000, './images/A_NODABEKASJERAWAT(ACNESPOT).webp', 41),
('A_BOPENG(ACNESCAR)', 'perawatan2', '42. Bopeng (Acne Scar)', 'Rp 550.000', 550000, './images/A_BOPENG(ACNESCAR).webp', 42),
('A_BEKASCACAR(SMALLPOXSCAR)', 'perawatan2', '43. Bekas Cacar (Smallpox scar)', 'Rp 550.000', 550000, './images/A_BEKASCACAR(SMALLPOXSCAR).webp', 43),
('A_BEKASLUKACEKUNG(SCAR)', 'perawatan2', '44. Bekas Luka Cekung (Scar)', 'Rp 550.000', 550000, './images/A_BEKASLUKACEKUNG(SCAR).webp', 44),
('A_KELLOID', 'perawatan2', '45. Kelloid', 'Rp 550.000', 550000, './images/A_KELLOID.webp', 45),
('A_SPIDERVEIN', 'perawatan2', '46. Spidervein', 'Rp 350.000', 350000, './images/A_SPIDERVEIN.webp', 46),
('A_KAPALAN(CALLOUS)', 'perawatan2', '47. Kapalan (Callous)', 'Rp 300.000', 300000, './images/A_KAPALAN(CALLOUS).webp', 47),
('A_KAKIPECAH-PECAH(FISURA)', 'perawatan2', '48. Kaki Pecah-Pecah (Fisura)', 'Rp 300.000', 300000, './images/A_KAKIPECAH-PECAH(FISURA).webp', 48),
('A_MENCERAHKAN(BRIGHTENING)', 'perawatan2', '49. Mencerahkan (Brightening)', 'Rp 350.000', 350000, './images/A_MENCERAHKAN(BRIGHTENING).webp', 49),
('A_CHEMICALPEELING', 'perawatan2', '50. Chemical Peeling', 'Rp 500.000', 500000, './images/A_CHEMICALPEELING.webp', 50),
('A_BB_GLOW', 'perawatan2', '51. BB Glow', 'Rp 380.000', 380000, './images/A_BB_GLOW.webp', 51),
('A_DETOX', 'perawatan2', '52. Detox', 'Rp 300.000', 300000, './images/A_DETOX.webp', 52),
('A_RFSLIMING', 'perawatan2', '53. Rfslimng', 'Rp 350.000', 350000, './images/A_RFSLIMING.webp', 53);

-- Sunat Modern (6 services)
INSERT INTO services (id, category_id, name, price, price_numeric, image_url, display_order) VALUES
('S_RING', 'perawatan3', '1. Sunat Ring', 'Rp 1.200.000', 1200000, './images/S_RING.webp', 1),
('S_RING(EXTRAMAINAN)', 'perawatan3', '2. Sunat Ring Extra Mainan', 'Rp 1.500.000', 1500000, './images/S_RING(EXTRAMAINAN).webp', 2),
('S_TEKNOSEALER', 'perawatan3', '3. Sunat Tekno Sealer', 'Rp 2.500.000', 2500000, './images/S_TEKNOSEALER.webp', 3),
('S_TEKNOSEALER(EXTRAMAINAN)', 'perawatan3', '4. Sunat Tekno Sealer Extra Mainan', 'Rp 2.800.000', 2800000, './images/S_TECHNOSEALER(EXTRAMAINAN).webp', 4),
('S_CIRCLECLAMP', 'perawatan3', '5. Sunat Circle Clamp', 'Rp 1.200.000', 1200000, './images/S_CIRCLECLAMP.webp', 5),
('S_CIRCLECLAMP(EXTRAMAINAN)', 'perawatan3', '6. Sunat Circle Clamp Extra Mainan', 'Rp 1.500.000', 1500000, './images/S_CIRCLECLAMP(EXTRAMAINAN).webp', 6);

-- Hipnoterapi (5 services)
INSERT INTO services (id, category_id, name, price, price_numeric, image_url, display_order) VALUES
('H_BERHENTIJUDOL', 'perawatan4', '1. Berhenti Judol', 'Rp 500.000', 500000, './images/H_BERHENTIJUDOL.webp', 1),
('H_BERHENTIMEROKOK', 'perawatan4', '2. Berhenti Merokok', 'Rp 500.000', 500000, './images/H_BERHENTIMEROKOK.webp', 2),
('H_BERHENTISELINGKUH', 'perawatan4', '3. Berhenti Selingkuh', 'Rp 500.000', 500000, './images/H_BERHENTISELINGKUH.webp', 3),
('H_MELUPAKANMANTAN', 'perawatan4', '4. Melupakan Mantan', 'Rp 500.000', 500000, './images/H_MELUPAKANMANTAN.webp', 4),
('H_MENGHILANGKANFOBIA', 'perawatan4', '5. Menghilangkan Fobia', 'Rp 500.000', 500000, './images/H_MENGHILANGKANFOBIA.webp', 5);

-- Skincare (9 services)
INSERT INTO services (id, category_id, name, price, price_numeric, image_url, display_order) VALUES
('SK_BBCREAMACNE', 'perawatan5', '1. BB Cream Acne', 'Rp 160.000', 160000, './images/SK_BBCREAMACNE.webp', 1),
('SK_FACIALSOAPSALICID', 'perawatan5', '2. Facial Soap Salicid', 'Rp 170.000', 170000, './images/SK_FACIALSOAPSALICID.webp', 2),
('SK_HYDROGENPUDDINGMOISTURIZING', 'perawatan5', '3. Hydrogen Pudding Moisturizing', 'Rp 210.000', 210000, './images/SK_HYDROGENPUDDINGMOISTURIZING.webp', 3),
('SK_KRIMACNEMALAM', 'perawatan5', '4. Krim Acne Malam', 'Rp 160.000', 160000, './images/SK_FACIALSOAPSALICID.webp', 4),
('SK_PAKETPEMBERSIHLIGHTENING', 'perawatan5', '5. Paket Pembersih Lightening', 'Rp 440.000', 440000, './images/SK_PAKETPEMBERSIHLIGHTENING.webp', 5),
('SK_SERUMGLOWING', 'perawatan5', '6. Serum Glowing', 'Rp 170.000', 170000, './images/SK_SERUMGLOWING.webp', 6),
('SK_SUNSCREENACNE', 'perawatan5', '7. Sunscreen Acne', 'Rp 150.000', 150000, './images/SK_SUNSCREENACNE.webp', 7),
('SK_SUNSCREENPUDDING', 'perawatan5', '8. Sunscreen Pundding', 'Rp 200.000', 200000, './images/SK_SUNSCREENPUDDING.webp', 8),
('SK_WHITENING', 'perawatan5', '9. Whitening', 'Rp 215.000', 215000, './images/SK_WHITENING.webp', 9);

-- C. Gallery Data (6 items)
INSERT INTO gallery (title, description, image_url, category, display_order) VALUES
('Tampak Depan Klinik', 'Tampak depan klinik Alra Care', './images/tampakdepan.webp', 'clinic', 1),
('Ruang Tunggu 1', 'Area ruang tunggu pasien', './images/ruang_tunggu_1.webp', 'waiting_room', 2),
('Ruang Tunggu 2', 'Area ruang tunggu pasien', './images/ruang_tunggu_2.webp', 'waiting_room', 3),
('Ruang Kecantikan', 'Ruang perawatan kecantikan', './images/ruang_kecantikan.webp', 'treatment_room', 4),
('Ruang Luka', 'Ruang perawatan luka', './images/ruang_luka.webp', 'treatment_room', 5),
('Tim Medis', 'Tim perawat dan dokter', './images/TimMedis.webp', 'team', 6);

-- D. Social Media Data (9 accounts)
INSERT INTO social_media (platform, account_name, account_url, display_order) VALUES
('instagram', 'Alra_spesialis_luka', 'https://www.instagram.com/alra_spesialis_luka?igsh=dG80aG5iaXh5eWc1', 1),
('instagram', 'Alra Aesthetic', 'https://www.instagram.com/alra_aesthetic?igsh=MXVudzFtNm01NDkyeg==', 2),
('facebook', 'AlraCare', 'https://www.facebook.com/share/168WGYimFr/', 1),
('facebook', 'Alra Aesthetic', 'https://www.facebook.com/share/1JHPwThUub/', 2),
('youtube', 'Alra care', 'https://youtube.com/@alracare9299?si=KnjAq1fZwcTiOwUN', 1),
('youtube', 'Alra Aesthetic', 'https://youtube.com/@alraaesthetic1107?si=MhI8RYMTf6GOVnHp', 2),
('youtube', 'Alra Khitan', 'https://youtube.com/@alrakhitan3488?si=9GyMUIaEpS-XAIaX', 3),
('tiktok', 'Alra_care', 'https://www.tiktok.com/@alra_care?_t=ZS-90csiaX0Agj&_r=1', 1),
('tiktok', 'Alra Aesthetic', 'https://www.tiktok.com/@alra_aesthetic?_t=ZS-90csmKAVs01&_r=1', 2);

-- E. Admin User
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'rahmadramadhanaswin@gmail.com', crypt('admin123', gen_salt('bf')), 'Administrator', 'superadmin');

-- F. Settings Data
INSERT INTO settings (id, category, name, value, description) VALUES
('clinic_name', 'general', 'Nama Klinik', 'Alra Care', 'Nama lengkap klinik'),
('clinic_address', 'general', 'Alamat Klinik', 'Jl. Akcaya, Akcaya, Kec. Pontianak Sel., Kota Pontianak, Kalimantan Barat', 'Alamat lengkap klinik'),
('clinic_phone', 'general', 'Telepon', '6281381223811', 'Nomor telepon klinik'),
('clinic_email', 'general', 'Email', 'rahmadramadhanaswin@gmail.com', 'Alamat email klinik'),
('business_hours', 'general', 'Jam Operasional', 'Senin - Minggu: 08:00 - 17:00', 'Jam buka klinik'),
('booking_notification', 'notifications', 'Notifikasi Booking', 'Kami akan menghubungi Anda dalam 1x24 jam untuk konfirmasi jadwal', 'Pesan notifikasi booking'),
('duplicate_booking_message', 'notifications', 'Pesan Booking Duplikat', 'Anda sudah memiliki booking untuk tanggal yang sama. Silakan pilih tanggal lain.', 'Pesan untuk booking duplikat'),
('max_booking_attempts', 'security', 'Max Booking Attempts', '5', 'Maksimum percobaan booking per jam'),
('session_timeout', 'security', 'Session Timeout Minutes', '30', 'Timeout session admin dalam menit');

-- ===== FUNCTIONS & TRIGGERS =====

-- Function untuk check duplicate booking (SIMPLE VERSION)
CREATE OR REPLACE FUNCTION check_duplicate_booking(
    p_phone VARCHAR,
    p_appointment_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_existing_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_existing_count
    FROM bookings 
    WHERE patient_phone = p_phone 
    AND appointment_date = p_appointment_date
    AND status IN ('pending', 'confirmed');
    
    RETURN v_existing_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function untuk generate booking ID
CREATE OR REPLACE FUNCTION generate_booking_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id IS NULL THEN
        NEW.id := 'BK' || to_char(NOW(), 'YYYYMMDDHH24MISS') || substr(md5(random()::text), 1, 6);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function untuk update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function untuk calculate booking total
CREATE OR REPLACE FUNCTION calculate_booking_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE bookings 
    SET total_price = (
        SELECT COALESCE(SUM(price_numeric * quantity), 0)
        FROM booking_services 
        WHERE booking_id = NEW.booking_id
    )
    WHERE id = NEW.booking_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function untuk validasi appointment time
CREATE OR REPLACE FUNCTION validate_appointment_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if appointment is during business hours (8 AM to 5 PM)
    IF EXTRACT(HOUR FROM NEW.appointment_time) < 8 OR 
       EXTRACT(HOUR FROM NEW.appointment_time) >= 17 THEN
        RAISE EXCEPTION 'Appointment must be between 08:00 and 17:00';
    END IF;
    
    -- Check if appointment is in the future
    IF NEW.appointment_datetime < NOW() THEN
        RAISE EXCEPTION 'Appointment must be in the future';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function untuk user authentication (COMPLETELY FIXED VERSION)
CREATE OR REPLACE FUNCTION authenticate_user(
    input_username VARCHAR,
    input_password VARCHAR
)
RETURNS TABLE(
    user_id UUID,
    username VARCHAR,
    full_name VARCHAR,
    role VARCHAR,
    success BOOLEAN,
    message VARCHAR
) AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get user data dengan table alias
    SELECT 
        u.id,
        u.username,
        u.full_name,
        u.role,
        u.is_active,
        u.password_hash,
        u.failed_login_attempts,
        u.account_locked_until
    INTO user_record
    FROM users u
    WHERE u.username = input_username;

    -- Check if user exists
    IF user_record.id IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, 
            NULL::VARCHAR, 
            NULL::VARCHAR, 
            NULL::VARCHAR, 
            false::BOOLEAN, 
            'User tidak ditemukan'::VARCHAR;
        RETURN;
    END IF;

    -- Check if user is active
    IF NOT user_record.is_active THEN
        RETURN QUERY SELECT 
            user_record.id, 
            user_record.username, 
            user_record.full_name, 
            user_record.role, 
            false::BOOLEAN, 
            'User tidak aktif'::VARCHAR;
        RETURN;
    END IF;

    -- Check if account is locked
    IF user_record.account_locked_until IS NOT NULL AND user_record.account_locked_until > NOW() THEN
        RETURN QUERY SELECT 
            user_record.id, 
            user_record.username, 
            user_record.full_name, 
            user_record.role, 
            false::BOOLEAN, 
            'Akun terkunci sementara'::VARCHAR;
        RETURN;
    END IF;

    -- Verify password
    IF user_record.password_hash = crypt(input_password, user_record.password_hash) THEN
        -- Success - reset counter
        UPDATE users 
        SET last_login = NOW(),
            failed_login_attempts = 0,
            account_locked_until = NULL,
            updated_at = NOW()
        WHERE id = user_record.id;
        
        RETURN QUERY SELECT 
            user_record.id, 
            user_record.username, 
            user_record.full_name, 
            user_record.role, 
            true::BOOLEAN, 
            'Login berhasil'::VARCHAR;
    ELSE
        -- Failed - increment counter
        UPDATE users 
        SET failed_login_attempts = user_record.failed_login_attempts + 1,
            updated_at = NOW()
        WHERE id = user_record.id;
        
        -- Check if should lock account
        IF user_record.failed_login_attempts + 1 >= 5 THEN
            UPDATE users 
            SET account_locked_until = NOW() + INTERVAL '30 minutes'
            WHERE id = user_record.id;
            
            RETURN QUERY SELECT 
                user_record.id, 
                user_record.username, 
                user_record.full_name, 
                user_record.role, 
                false::BOOLEAN, 
                'Terlalu banyak percobaan login'::VARCHAR;
        ELSE
            RETURN QUERY SELECT 
                user_record.id, 
                user_record.username, 
                user_record.full_name, 
                user_record.role, 
                false::BOOLEAN, 
                'Password salah'::VARCHAR;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function untuk mendapatkan statistik booking
CREATE OR REPLACE FUNCTION get_daily_booking_stats(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    total_bookings BIGINT,
    pending_bookings BIGINT,
    confirmed_bookings BIGINT,
    completed_bookings BIGINT,
    cancelled_bookings BIGINT,
    total_revenue DECIMAL,
    unique_patients BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
        COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed', 'completed')), 0) as total_revenue,
        COUNT(DISTINCT patient_phone) as unique_patients
    FROM bookings 
    WHERE appointment_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- ===== TRIGGERS =====

-- Triggers untuk generate IDs dan update timestamps
CREATE TRIGGER trigger_generate_booking_id
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION generate_booking_id();

CREATE TRIGGER trigger_update_timestamp_categories
    BEFORE UPDATE ON service_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_timestamp_services
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_timestamp_bookings
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_timestamp_gallery
    BEFORE UPDATE ON gallery
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_timestamp_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_calculate_booking_total
    AFTER INSERT OR UPDATE OR DELETE ON booking_services
    FOR EACH ROW
    EXECUTE FUNCTION calculate_booking_total();

-- Trigger untuk validasi appointment
CREATE TRIGGER trigger_validate_appointment
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION validate_appointment_time();

-- ===== SUPABASE ROW LEVEL SECURITY =====

-- Enable RLS on all tables
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Public read policies (for website)
CREATE POLICY "Public can view service_categories" ON service_categories FOR SELECT USING (true);
CREATE POLICY "Public can view services" ON services FOR SELECT USING (true);
CREATE POLICY "Public can view gallery" ON gallery FOR SELECT USING (true);
CREATE POLICY "Public can view social_media" ON social_media FOR SELECT USING (true);
CREATE POLICY "Public can view settings" ON settings FOR SELECT USING (true);

-- Patients can view their own data
CREATE POLICY "Patients can view own data" ON patients FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Patients can insert own data" ON patients FOR INSERT WITH CHECK (true);

-- Bookings policies
CREATE POLICY "Public can insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Patients can view own bookings" ON bookings FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "Admins can manage all bookings" ON bookings FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- Admin full access policies
CREATE POLICY "Admins have full access" ON service_categories FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));
CREATE POLICY "Admins have full access" ON services FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));
CREATE POLICY "Admins have full access" ON patients FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));
CREATE POLICY "Admins have full access" ON bookings FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));
CREATE POLICY "Admins have full access" ON booking_services FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));
CREATE POLICY "Admins have full access" ON gallery FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));
CREATE POLICY "Admins have full access" ON social_media FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));
CREATE POLICY "Admins have full access" ON settings FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));
CREATE POLICY "Admins have full access" ON audit_logs FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));
CREATE POLICY "Admins have full access" ON booking_attempts FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));
CREATE POLICY "Admins have full access" ON user_sessions FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- Users can only view their own data
CREATE POLICY "Users can view own user data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can manage users" ON users FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- ===== INDEXES FOR PERFORMANCE =====
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(appointment_date);
CREATE INDEX idx_bookings_datetime ON bookings(appointment_datetime);
CREATE INDEX idx_bookings_patient ON bookings(patient_id);
CREATE INDEX idx_bookings_phone_date ON bookings(patient_phone, appointment_date);
CREATE INDEX idx_bookings_created ON bookings(created_at);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_services_price ON services(price_numeric);
CREATE INDEX idx_booking_services_booking ON booking_services(booking_id);
CREATE INDEX idx_booking_services_service ON booking_services(service_id);
CREATE INDEX idx_gallery_active ON gallery(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_gallery_category ON gallery(category);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_social_media_platform ON social_media(platform);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_booking_attempts_phone ON booking_attempts(phone);
CREATE INDEX idx_booking_attempts_blocked ON booking_attempts(is_blocked) WHERE is_blocked = TRUE;
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = TRUE;

-- ===== VIEWS FOR REPORTING =====
CREATE VIEW dashboard_stats AS
SELECT 
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE appointment_date = CURRENT_DATE) as today_bookings,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
    COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed', 'completed')), 0) as total_revenue,
    COALESCE(SUM(total_price) FILTER (
        WHERE status IN ('confirmed', 'completed') 
        AND appointment_date >= DATE_TRUNC('month', CURRENT_DATE)
    ), 0) as monthly_revenue,
    COALESCE(SUM(total_price) FILTER (
        WHERE status IN ('confirmed', 'completed') 
        AND appointment_date >= DATE_TRUNC('year', CURRENT_DATE)
    ), 0) as yearly_revenue,
    (SELECT COUNT(*) FROM patients) as total_patients,
    (SELECT COUNT(*) FROM services WHERE is_active = TRUE) as total_services,
    (SELECT COUNT(*) FROM bookings WHERE created_at >= NOW() - INTERVAL '24 hours') as bookings_last_24h
FROM bookings;

CREATE VIEW booking_details AS
SELECT 
    b.*,
    p.email as patient_email,
    p.date_of_birth as patient_dob,
    p.gender as patient_gender,
    COUNT(bs.id) as service_count,
    STRING_AGG(bs.service_name, ', ') as service_names,
    SUM(bs.price_numeric * bs.quantity) as calculated_total
FROM bookings b
LEFT JOIN patients p ON b.patient_id = p.id
LEFT JOIN booking_services bs ON b.id = bs.booking_id
GROUP BY b.id, p.id;

CREATE VIEW service_popularity AS
SELECT 
    s.id as service_id,
    s.name as service_name,
    sc.title as category_name,
    COUNT(bs.id) as booking_count,
    SUM(bs.price_numeric * bs.quantity) as total_revenue,
    AVG(bs.price_numeric) as avg_price
FROM services s
JOIN service_categories sc ON s.category_id = sc.id
LEFT JOIN booking_services bs ON s.id = bs.service_id
LEFT JOIN bookings b ON bs.booking_id = b.id AND b.status IN ('confirmed', 'completed')
WHERE s.is_active = TRUE
GROUP BY s.id, s.name, sc.title
ORDER BY booking_count DESC;

-- ===== FINAL VERIFICATION =====
SELECT 
    'ALRA CARE DATABASE SETUP COMPLETE - ALL ERRORS FIXED' as status,
    (SELECT COUNT(*) FROM service_categories) as total_categories,
    (SELECT COUNT(*) FROM services) as total_services,
    (SELECT COUNT(*) FROM gallery) as total_gallery,
    (SELECT COUNT(*) FROM social_media) as total_social_media,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM settings) as total_settings,
    (SELECT check_duplicate_booking('081234567890', CURRENT_DATE)) as test_duplicate_function,
    (SELECT COUNT(*) FROM authenticate_user('admin', 'admin123')) as test_auth_function;