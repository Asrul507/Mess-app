# Mess App - Sistem Mess Karyawan

Aplikasi awal untuk manajemen mess karyawan. Konsepnya mirip sistem hotel, tetapi disesuaikan untuk operasional mess/akomodasi karyawan.

## Fitur versi awal

- Dashboard okupansi mess
- Input check in penghuni mess
- Kolom khusus check in:
  - Keperluan
  - Dapat makan atau tidak
  - Nama office
- Database karyawan:
  - Nama
  - NIK
  - Jabatan: Staff, Non Staff, Manager
  - Posisi
  - Office
  - No HP
- Data kamar/bed:
  - Kamar single: contoh `102`
  - Kamar sharing: contoh `101A`, `101B`, `101C`, `101D`
- Upload kamar via CSV hasil export dari Excel
- Absen makan
- Rekap absen makan
- Rekap penghuni aktif / in-house

## Cara test lokal

1. Buka file `index.html` di browser.
2. Tambahkan data karyawan.
3. Tambahkan/check data kamar.
4. Lakukan check in penghuni.
5. Lakukan absen makan.
6. Cek dashboard dan rekap.

Data sementara tersimpan di `localStorage` browser.

## Format upload kamar dari Excel

Simpan file Excel sebagai CSV dengan header berikut:

```csv
room_no,bed_code,capacity,type
101,A,1,Sharing 4
101,B,1,Sharing 4
101,C,1,Sharing 4
101,D,1,Sharing 4
102,,1,Single
103,A,1,Sharing 2
103,B,1,Sharing 2
```

Keterangan:

- `room_no`: nomor kamar utama
- `bed_code`: kode bed, kosongkan jika kamar single
- `capacity`: kapasitas bed, umumnya 1 per bed
- `type`: Single, Sharing 2, Sharing 4, Dormitory, dan lainnya

## Rencana database Supabase

### employees

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| nama | text | Nama karyawan |
| nik | text | NIK unik |
| jabatan | text | Staff / Non Staff / Manager |
| posisi | text | Posisi pekerjaan |
| office | text | Nama office |
| no_hp | text | Nomor HP |
| created_at | timestamptz | Waktu dibuat |

### rooms

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| room_no | text | Nomor kamar |
| bed_code | text | A/B/C/D, nullable untuk single room |
| capacity | int | Kapasitas |
| type | text | Single / Sharing 2 / Sharing 4 / Dormitory |
| status | text | available / occupied / maintenance |
| created_at | timestamptz | Waktu dibuat |

### checkins

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| employee_id | uuid | Relasi ke employees |
| room_id | uuid | Relasi ke rooms |
| keperluan | text | Dinas / Training / Rolling / dll |
| dapat_makan | boolean | Ya/Tidak |
| office | text | Nama office |
| checkin_date | date | Tanggal masuk |
| checkout_plan | date | Estimasi keluar |
| checkout_date | date | Tanggal keluar aktual |
| status | text | in_house / checked_out |
| note | text | Catatan |
| created_at | timestamptz | Waktu dibuat |

### meal_attendance

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| checkin_id | uuid | Relasi ke checkins |
| employee_id | uuid | Relasi ke employees |
| meal_date | date | Tanggal makan |
| meal_type | text | Pagi / Siang / Malam |
| meal_time | time | Jam absen |
| created_at | timestamptz | Waktu dibuat |

## Catatan pengembangan berikutnya

- Tambahkan login role admin, office, dan user biasa
- Hubungkan ke Supabase
- Tambahkan checkout penghuni
- Tambahkan status kamar maintenance
- Tambahkan laporan harian, MTD, YTD seperti sistem hotel
- Tambahkan export Excel/PDF untuk rekap makan dan rekap penghuni
- Tambahkan filter berdasarkan office, jabatan, tanggal, dan status kamar
