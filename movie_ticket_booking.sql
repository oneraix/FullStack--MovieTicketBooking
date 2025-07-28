CREATE DATABASE Movie_Ticket_Booking

-- PostgreSQL Schema Design cho Website Đặt Vé Xem Phim
-- Chuẩn hóa, mở rộng tốt, bảo mật

-- =====================
-- 1. Users & Roles
-- =====================
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL -- admin, user
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar TEXT,
  role_id INTEGER REFERENCES roles(id) DEFAULT 2,
  -- ✅ Audit Fields
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  deleted_by UUID
);

CREATE TABLE movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  duration INTEGER, -- phút
  description TEXT,
  thumbnail TEXT,
  release_date DATE,
  is_showing BOOLEAN DEFAULT TRUE,

  -- ✅ Audit Fields
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id)
);


-- =====================
-- 3. Cinemas, Showtimes, Seats
-- =====================
CREATE TABLE cinemas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location TEXT NOT NULL,
 -- ✅ Audit Fields
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE showtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID REFERENCES movies(id),
  cinema_id INTEGER REFERENCES cinemas(id),
  show_date DATE NOT NULL,
  show_time TIME NOT NULL,
    -- ✅ Audit Fields
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE seats (
  id SERIAL PRIMARY KEY,
  cinema_id INTEGER REFERENCES cinemas(id),
  seat_number VARCHAR(10),
  seat_type VARCHAR(20),
    -- ✅ Audit Fields
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id)
);


-- =====================
-- 4. Bookings & Payment
-- =====================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  showtime_id UUID REFERENCES showtimes(id),
  status VARCHAR(20) DEFAULT 'pending', -- success, cancelled
  total_price DECIMAL(10,2),
    -- ✅ Audit Fields
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE booking_seats (
  id SERIAL PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  seat_id INTEGER REFERENCES seats(id),
  price DECIMAL(10,2),
      -- ✅ Audit Fields
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  method VARCHAR(50), -- stripe, momo, etc.
  status VARCHAR(20), -- paid, refunded
  transaction_id TEXT,
    -- ✅ Audit Fields
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id)
);

-- =====================
-- 6. Bookmarks, History, Notification
-- =====================
CREATE TABLE bookmarks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  movie_id UUID REFERENCES movies(id),
      -- ✅ Audit Fields
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE user_watch_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  movie_id UUID REFERENCES movies(id),
  watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      -- ✅ Audit Fields
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
    -- ✅ Audit Fields
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id)
);

-- =====================
-- 7. Admin Audit Logs
-- =====================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action VARCHAR(255),
  target_table VARCHAR(100),
  target_id UUID,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- docker run --name movieticketbooking_db  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=1234 -e POSTGRES_DB=movie_ticket_booking -p 5432:5432 -d postgres:17.5