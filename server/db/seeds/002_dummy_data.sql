-- Clean up test leftovers
DELETE FROM PilihanSpesifikasiKek WHERE kategoriId = '1';
DELETE FROM KategoriSpesifikasiKek WHERE kategoriId = '1';

-- Seed Cake Specification Categories
-- Size ("Saiz Kek") and Flavor ("Perisa Kek") only
INSERT INTO KategoriSpesifikasiKek (kategoriId, nama, penerangan, aktif)
VALUES 
  ('K001', 'Saiz Kek', 'Pilihan saiz/berat kek dalam kilogram', TRUE),
  ('K002', 'Perisa Kek', 'Pilihan perisa asas kek', TRUE)
ON DUPLICATE KEY UPDATE 
  nama = VALUES(nama),
  penerangan = VALUES(penerangan),
  aktif = VALUES(aktif);

-- Seed Cake Specification Options
-- Saiz Kek (K001) - 0.5kg (RM50.00), 1.0kg (RM80.00), 1.5kg (RM130.00)
INSERT INTO PilihanSpesifikasiKek (pilihanId, kategoriId, nama, penerangan, hargaTambahan, aktif)
VALUES 
  ('P001', 'K001', '0.5kg', 'Saiz kek berat 0.5kg', 50.00, TRUE),
  ('P002', 'K001', '1.0kg', 'Saiz kek berat 1.0kg', 80.00, TRUE),
  ('P003', 'K001', '1.5kg', 'Saiz kek berat 1.5kg', 130.00, TRUE)
ON DUPLICATE KEY UPDATE 
  nama = VALUES(nama),
  penerangan = VALUES(penerangan),
  hargaTambahan = VALUES(hargaTambahan),
  aktif = VALUES(aktif);

-- Perisa Kek (K002) - Coklat Fudge (RM0.00), Red Velvet (RM0.00), Pandan Gula Melaka (RM0.00)
INSERT INTO PilihanSpesifikasiKek (pilihanId, kategoriId, nama, penerangan, hargaTambahan, aktif)
VALUES 
  ('P004', 'K002', 'Coklat Fudge', 'Kek coklat lembap dengan limpahan coklat fudge', 0.00, TRUE),
  ('P005', 'K002', 'Red Velvet', 'Kek velvet merah lembut dengan cream cheese frosting', 0.00, TRUE),
  ('P006', 'K002', 'Pandan Gula Melaka', 'Kek pandan wangi dengan limpahan sos gula melaka', 0.00, TRUE)
ON DUPLICATE KEY UPDATE 
  nama = VALUES(nama),
  penerangan = VALUES(penerangan),
  hargaTambahan = VALUES(hargaTambahan),
  aktif = VALUES(aktif);

-- Seed Customers (Pelanggan)
-- Insert new dummy customers C002, C003, C004 and update existing C001
INSERT INTO Pelanggan (pelangganId, noTelefon, nama, alamat, noTelefonDisahkan)
VALUES 
  ('C001', '0138092620', 'Aina Farhana', 'No 15, Jalan Empurau, Songs', TRUE),
  ('C002', '0123456789', 'Muhammad Ali', 'No 22, Lorong Malihah, Kuching', TRUE),
  ('C003', '0198765432', 'Siti Sarah', 'Lot 104, Kampung Gita, Kuching', TRUE),
  ('C004', '0112345678', 'Brandon Tan', 'No 88, Tabuan Laru, Kuching', TRUE)
ON DUPLICATE KEY UPDATE 
  nama = VALUES(nama),
  alamat = VALUES(alamat),
  noTelefonDisahkan = VALUES(noTelefonDisahkan);


