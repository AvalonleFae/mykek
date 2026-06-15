CREATE TABLE IF NOT EXISTS ButiranTempahan (
  butiranId VARCHAR(10) PRIMARY KEY,
  tempahanId VARCHAR(10) NOT NULL,
  kategoriId VARCHAR(10) NOT NULL,
  pilihanId VARCHAR(10) NOT NULL,
  namaKategori VARCHAR(100) NOT NULL,
  namaPilihan VARCHAR(100) NOT NULL,
  hargaTambahan DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT fk_butiran_tempahan FOREIGN KEY (tempahanId) REFERENCES Tempahan(tempahanId) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_butiran_kategori FOREIGN KEY (kategoriId) REFERENCES KategoriSpesifikasiKek(kategoriId) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_butiran_pilihan FOREIGN KEY (pilihanId) REFERENCES PilihanSpesifikasiKek(pilihanId) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
