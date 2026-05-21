CREATE TABLE IF NOT EXISTS Tempahan (
  tempahanId INT AUTO_INCREMENT PRIMARY KEY,
  pelangganId INT NOT NULL,
  tarikhAmbil DATE NOT NULL,
  kaedahPenghantaran ENUM('Ambil Sendiri','Penghantaran') NOT NULL,
  alamatPenghantaran VARCHAR(255),
  kaedahBayaran ENUM('QR Code') NOT NULL DEFAULT 'QR Code',
  jumlahHarga DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  statusTempahan ENUM('Menunggu Pengesahan','Diterima','Ditolak','Dibatalkan','Sedang Diproses','Sedang Dihias','Sedia untuk Diambil/Dihantar','Selesai') NOT NULL DEFAULT 'Menunggu Pengesahan',
  statusBayaran ENUM('Belum Dibayar','Deposit Dibayar','Telah Dibayar') NOT NULL DEFAULT 'Belum Dibayar',
  nota VARCHAR(500),
  sebabTolak VARCHAR(500),
  tarikhTempahan DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tarikhTerima DATETIME,
  tarikhKemaskini DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tempahan_pelanggan FOREIGN KEY (pelangganId) REFERENCES Pelanggan(pelangganId) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
