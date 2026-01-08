# Alra Care - Clinic Management System

Sistem manajemen klinik lengkap dengan backend API, frontend website, dan panel admin. Menggunakan Supabase sebagai database dan dapat di-deploy ke Vercel.

## 🚀 Fitur Utama

### Frontend Publik
- ✅ Tampilan layanan klinik (Perawatan Luka, Kecantikan, Sunat, Hipnoterapi, Skincare)
- ✅ Sistem booking online dengan validasi
- ✅ Galeri foto klinik
- ✅ Informasi kontak dan media sosial
- ✅ Responsive design untuk mobile dan desktop

### Panel Admin
- ✅ Dashboard dengan statistik real-time
- ✅ Manajemen booking (lihat, konfirmasi, batalkan)
- ✅ Manajemen layanan dan kategori
- ✅ Manajemen galeri
- ✅ Pengaturan klinik dan media sosial
- ✅ Export data booking ke CSV
- ✅ Print detail booking

### Backend API
- ✅ RESTful API dengan Express.js
- ✅ Autentikasi JWT untuk admin
- ✅ Integrasi Supabase PostgreSQL
- ✅ CRUD operations untuk semua entitas
- ✅ Validasi data dan error handling
- ✅ Rate limiting untuk booking

## 📋 Prerequisites

- Node.js 18.x atau lebih tinggi
- Akun Supabase (gratis)
- Akun Vercel (gratis) untuk deployment

## 🛠️ Setup Lokal

### 1. Clone Repository

```bash
cd proyekalracare02-main\ -\ Copy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Supabase

1. Buat project baru di [Supabase](https://supabase.com)
2. Jalankan SQL script dari file `database.sql` di SQL Editor Supabase
3. Catat URL dan API Keys dari Settings > API

### 4. Konfigurasi Environment Variables

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Edit file `.env` dan isi dengan credentials Supabase Anda:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=your_random_secret_key_here
PORT=3000
NODE_ENV=development
```

### 5. Jalankan Development Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000`

- Frontend Publik: `http://localhost:3000/public-site.html`
- Panel Admin: `http://localhost:3000/admin-site.html`
- API Health Check: `http://localhost:3000/api/health`

## 🌐 Deployment ke Vercel

### 1. Install Vercel CLI (opsional)

```bash
npm install -g vercel
```

### 2. Setup Environment Variables di Vercel

Masuk ke dashboard Vercel project Anda, buka Settings > Environment Variables, dan tambahkan:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

### 3. Deploy

**Via Vercel CLI:**
```bash
vercel
```

**Via GitHub:**
1. Push code ke GitHub repository
2. Import repository di Vercel
3. Vercel akan otomatis deploy

### 4. Akses Website

Setelah deployment selesai:
- Frontend: `https://your-domain.vercel.app/`
- Admin: `https://your-domain.vercel.app/admin`
- API: `https://your-domain.vercel.app/api/health`

## 📚 API Documentation

### Authentication

#### Login Admin
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "uuid",
      "username": "admin",
      "full_name": "Administrator",
      "role": "superadmin"
    }
  }
}
```

#### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "role": "superadmin"
    }
  }
}
```

### Services

#### Get All Services
```http
GET /api/services

Response:
{
  "success": true,
  "data": {
    "perawatan1": {
      "title": "Perawatan Luka Modern",
      "description": "...",
      "type": "checkbox",
      "options": [...]
    }
  }
}
```

#### Get Service by ID
```http
GET /api/services/{id}
```

#### Create Service (Admin)
```http
POST /api/services
Authorization: Bearer {token}
Content-Type: application/json

{
  "category_id": "perawatan1",
  "name": "Nama Layanan",
  "price": "Rp 150.000",
  "price_numeric": 150000,
  "image_url": "https://..."
}
```

### Bookings

#### Get All Bookings (Admin)
```http
GET /api/bookings
Authorization: Bearer {token}

Query Parameters:
- status: pending|confirmed|completed|cancelled
- date: YYYY-MM-DD
```

#### Create Booking (Public)
```http
POST /api/bookings
Content-Type: application/json

{
  "patient_name": "John Doe",
  "patient_phone": "081234567890",
  "patient_address": "Jl. Example No. 123",
  "patient_notes": "Catatan tambahan",
  "appointment_date": "2024-01-15",
  "appointment_time": "10:00",
  "selected_services": [
    {
      "id": "service_id",
      "name": "Nama Layanan",
      "price": "Rp 150.000"
    }
  ]
}
```

#### Update Booking Status (Admin)
```http
PUT /api/bookings/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "confirmed"
}
```

#### Get Booking Statistics (Admin)
```http
GET /api/bookings/stats/dashboard
Authorization: Bearer {token}
```

### Gallery

#### Get All Gallery Images
```http
GET /api/gallery
```

#### Add Gallery Image (Admin)
```http
POST /api/gallery
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Judul Gambar",
  "description": "Deskripsi",
  "image_url": "https://...",
  "category": "clinic"
}
```

### Settings

#### Get All Settings
```http
GET /api/settings

Query Parameters:
- category: general|notifications|security
```

#### Update Settings (Admin)
```http
PUT /api/settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "settings": {
    "clinic_name": "Alra Care",
    "clinic_phone": "6281381223811"
  }
}
```

#### Get Social Media Accounts
```http
GET /api/settings/social/accounts
```

## 🗄️ Database Schema

Database menggunakan PostgreSQL di Supabase dengan struktur:

- `service_categories` - Kategori layanan
- `services` - Layanan klinik
- `patients` - Data pasien
- `bookings` - Data booking
- `booking_services` - Detail layanan per booking
- `gallery` - Galeri foto
- `users` - Admin users
- `social_media` - Akun media sosial
- `settings` - Pengaturan aplikasi
- `audit_logs` - Log aktivitas
- `booking_attempts` - Rate limiting
- `user_sessions` - Session management

## 🔒 Security Features

- ✅ JWT authentication untuk admin
- ✅ Row Level Security (RLS) di Supabase
- ✅ Password hashing dengan bcrypt
- ✅ Input validation dan sanitization
- ✅ Rate limiting untuk booking
- ✅ CORS configuration
- ✅ SQL injection prevention

## 📱 Login Admin

Default credentials:
- Username: `admin`
- Password: `admin123`

**⚠️ PENTING:** Ganti password default setelah deployment pertama!

## 🎨 Teknologi yang Digunakan

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- Bootstrap 5 untuk admin panel
- Font Awesome icons
- Responsive design

### Backend
- Node.js + Express.js
- Supabase (PostgreSQL)
- JWT untuk authentication
- bcryptjs untuk password hashing

### Deployment
- Vercel (Serverless Functions)
- Supabase (Database hosting)

## 📝 Cara Menggunakan

### Untuk Pasien (Public)

1. Buka website klinik
2. Pilih layanan yang diinginkan
3. Isi formulir booking dengan data lengkap
4. Submit booking
5. Tunggu konfirmasi dari klinik via telepon/WhatsApp

### Untuk Admin

1. Login ke panel admin (`/admin`)
2. Dashboard menampilkan statistik real-time
3. Kelola booking:
   - Konfirmasi booking baru
   - Update status booking
   - Print detail booking
4. Kelola layanan dan galeri
5. Update pengaturan klinik

## 🐛 Troubleshooting

### Error: Missing Supabase environment variables
- Pastikan file `.env` sudah dibuat dan diisi dengan benar
- Verifikasi SUPABASE_URL dan SUPABASE_ANON_KEY

### Error: Authentication failed
- Cek username dan password
- Pastikan user sudah dibuat di database
- Verifikasi JWT_SECRET sudah diset

### Error: CORS issues
- Update ALLOWED_ORIGINS di environment variables
- Tambahkan domain Vercel Anda

### Booking tidak tersimpan
- Cek koneksi ke Supabase
- Verifikasi RLS policies sudah dijalankan
- Cek console browser untuk error details

## 📞 Support

Untuk bantuan lebih lanjut:
- Email: rahmadramadhanaswin@gmail.com
- WhatsApp: 6281381223811

## 📄 License

MIT License - Copyright (c) 2024 Alra Care

## 🙏 Credits

Developed for Alra Care Clinic
- Perawatan Luka Modern
- Perawatan Kecantikan
- Sunat Modern
- Hipnoterapi
- Skincare

---

**Made with ❤️ for Alra Care**