-- Default Merchant account for Zuraida Patisserie
-- Username: admin
-- Password: admin123 (bcrypt hashed)
INSERT INTO Peniaga (peniagaId, namaPenggunaAdmin, kataLaluan, namaKedai, noTelefonKedai, peneranganKedai)
VALUES (
  'N001',
  'admin',
  '$2b$10$7awWGeJEcrt3bw2MZiIlj./yEhk5fhJoeTmUcljmwMkKBHrGZREc2',
  'Zuraida Patisserie',
  '0138001234',
  'Kedai kek dan pastri di Sarawak. Menyediakan pelbagai jenis kek mengikut tempahan.'
)
ON DUPLICATE KEY UPDATE namaPenggunaAdmin = namaPenggunaAdmin;
