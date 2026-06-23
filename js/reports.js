function guestReportRows() {
  const filter = $('guestReportStatus')?.value || 'all';
  return state.guests
    .filter((guest) => filter === 'all' || guest.status === filter)
    .map((guest) => {
      const room = roomOfGuest(guest);
      const employee = employeeOfGuest(guest);
      return {
        status: guest.status,
        nama: guest.name,
        nik: guest.nik || employee.nik || '',
        jabatan: employee.level || guest.level || '',
        posisi: employee.position || guest.position || '',
        kamar: roomLabel(room),
        office: guest.office,
        keperluan: guest.purpose,
        dapat_makan: guest.mealEligible,
        tanggal_ci: guest.checkinDate,
        tanggal_co: guest.checkoutDate || '',
        lama_menginap: `${stayDays(guest.checkinDate, guest.checkoutDate)} hari`,
        catatan: guest.note || '',
      };
    });
}

function renderReports() {
  const rows = guestReportRows();
  if (!$('guestReportTable')) return;
  $('guestReportTable').innerHTML = rows.length
    ? rows.map((row) => `<tr><td>${badge(row.status, row.status === 'Check Out' ? 'ok' : 'danger')}</td><td>${row.nama}</td><td>${row.nik}</td><td>${row.jabatan}</td><td>${row.posisi}</td><td>${row.kamar}</td><td>${row.office}</td><td>${row.keperluan}</td><td>${row.dapat_makan}</td><td>${row.tanggal_ci}</td><td>${row.tanggal_co || '-'}</td><td>${row.lama_menginap}</td></tr>`).join('')
    : emptyRow(12, 'Belum ada data laporan tamu');
}

function initReportsMenu() {
  $('guestReportStatus')?.addEventListener('change', renderReports);
  $('downloadGuestReport')?.addEventListener('click', () => {
    downloadWorkbook('laporan-tamu-mess.xlsx', guestReportRows(), 'Laporan Tamu');
  });
}
