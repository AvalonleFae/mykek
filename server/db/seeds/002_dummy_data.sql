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

-- Seed Orders (Tempahan)
-- T001 (Selesai), T002 (Diterima), T003 (Diterima), T004 (Siap), T005 (Ditolak), T006 (Dibatalkan)
INSERT INTO Tempahan (tempahanId, pelangganId, tarikhAmbil, kaedahPenghantaran, alamatPenghantaran, kaedahBayaran, jumlahHarga, statusTempahan, statusBayaran, nota, sebabTolak, tarikhTempahan, tarikhTerima)
VALUES 
  ('T001', 'C001', '2026-06-15', 'Ambil Sendiri', NULL, 'QR Code', 50.00, 'Selesai', 'Telah Dibayar', 'Hias dengan lilin biasa', NULL, '2026-06-14 10:00:00', NULL),
  ('T002', 'C002', '2026-07-20', 'Penghantaran', 'No 22, Lorong Malihah, Kuching', 'QR Code', 90.00, 'Diterima', 'Belum Dibayar', 'Tulis ucapan: Selamat Hari Lahir Ali', NULL, '2026-07-06 14:30:00', NOW()),
  ('T003', 'C003', '2026-07-25', 'Penghantaran', 'Lot 104, Kampung Gita, Kuching', 'QR Code', 145.00, 'Diterima', 'Telah Dibayar', 'Kurangkan manis', NULL, '2026-07-05 09:15:00', NOW()),
  ('T004', 'C004', '2026-07-10', 'Ambil Sendiri', NULL, 'QR Code', 95.00, 'Siap', 'Telah Dibayar', 'Hantar pagi sebelum 11am', NULL, '2026-07-04 16:45:00', NULL),
  ('T005', 'C002', '2026-07-12', 'Ambil Sendiri', NULL, 'QR Code', 50.00, 'Ditolak', 'Belum Dibayar', NULL, 'Kedai tutup pada tarikh tersebut', '2026-07-06 11:20:00', NULL),
  ('T006', 'C003', '2026-07-18', 'Penghantaran', 'Lot 104, Kampung Gita, Kuching', 'QR Code', 90.00, 'Dibatalkan', 'Belum Dibayar', 'Batal kerana ada perubahan rancangan', NULL, '2026-07-06 17:00:00', NULL),
  ('T007', 'C001', '2026-07-22', 'Ambil Sendiri', NULL, 'QR Code', 80.00, 'Menunggu Pengesahan', 'Belum Dibayar', 'Tolong tulis \'Selamat Pengantin Baru\'', NULL, '2026-07-07 10:00:00', NULL)
ON DUPLICATE KEY UPDATE 
  tarikhAmbil = VALUES(tarikhAmbil),
  kaedahPenghantaran = VALUES(kaedahPenghantaran),
  alamatPenghantaran = VALUES(alamatPenghantaran),
  jumlahHarga = VALUES(jumlahHarga),
  statusTempahan = VALUES(statusTempahan),
  statusBayaran = VALUES(statusBayaran),
  nota = VALUES(nota),
  sebabTolak = VALUES(sebabTolak),
  tarikhTempahan = VALUES(tarikhTempahan),
  tarikhTerima = VALUES(tarikhTerima);

-- Seed Order Details (ButiranTempahan)
INSERT INTO ButiranTempahan (butiranId, tempahanId, kategoriId, pilihanId, namaKategori, namaPilihan, hargaTambahan)
VALUES 
  ('B001', 'T001', 'K001', 'P001', 'Saiz Kek', '0.5kg', 50.00),
  ('B002', 'T001', 'K002', 'P004', 'Perisa Kek', 'Coklat Fudge', 0.00),
  
  ('B003', 'T002', 'K001', 'P002', 'Saiz Kek', '1.0kg', 80.00),
  ('B004', 'T002', 'K002', 'P005', 'Perisa Kek', 'Red Velvet', 10.00),
  
  ('B005', 'T003', 'K001', 'P003', 'Saiz Kek', '1.5kg', 130.00),
  ('B006', 'T003', 'K002', 'P006', 'Perisa Kek', 'Pandan Gula Melaka', 15.00),
  
  ('B007', 'T004', 'K001', 'P002', 'Saiz Kek', '1.0kg', 80.00),
  ('B008', 'T004', 'K002', 'P006', 'Perisa Kek', 'Pandan Gula Melaka', 15.00),
  
  ('B009', 'T005', 'K001', 'P001', 'Saiz Kek', '0.5kg', 50.00),
  ('B010', 'T005', 'K002', 'P004', 'Perisa Kek', 'Coklat Fudge', 0.00),
  
  ('B011', 'T006', 'K001', 'P002', 'Saiz Kek', '1.0kg', 80.00),
  ('B012', 'T006', 'K002', 'P005', 'Perisa Kek', 'Red Velvet', 10.00),
  ('B013', 'T007', 'K001', 'P002', 'Saiz Kek', '1.0kg', 80.00),
  ('B014', 'T007', 'K002', 'P004', 'Perisa Kek', 'Coklat Fudge', 0.00)
ON DUPLICATE KEY UPDATE 
  namaKategori = VALUES(namaKategori),
  namaPilihan = VALUES(namaPilihan),
  hargaTambahan = VALUES(hargaTambahan);

-- Seed Order Images (ImejTempahan)
INSERT INTO ImejTempahan (imejId, tempahanId, jenisImej, urlImej, promptAI)
VALUES 
  ('I001', 'T001', 'Muat Naik', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587', NULL),
  ('I002', 'T001', 'Resit', 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23', NULL),
  ('I003', 'T002', 'AI', 'https://images.unsplash.com/photo-1535141192574-5d4897c13636', 'A beautiful red velvet cake with cream cheese frosting and fresh strawberries on top'),
  ('I004', 'T003', 'Resit', 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23', NULL),
  ('I005', 'T004', 'Muat Naik', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c', NULL),
  ('I006', 'T007', 'Muat Naik', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587', NULL)
ON DUPLICATE KEY UPDATE 
  jenisImej = VALUES(jenisImej),
  urlImej = VALUES(urlImej),
  promptAI = VALUES(promptAI);

-- Seed Closed Dates (TarikhTutup)
INSERT INTO TarikhTutup (tarikhTutupId, tarikh, catatan)
VALUES 
  ('D001', '2026-07-25', 'Cuti Hari Sarawak'),
  ('D002', '2026-08-31', 'Cuti Hari Kebangsaan')
ON DUPLICATE KEY UPDATE 
  catatan = VALUES(catatan);
