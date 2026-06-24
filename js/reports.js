function guestReportRows() {
  const filter = $('guestReportStatus')?.value || 'all';
  const dateFilter = $('guestReportDate')?.value || '';
  const stayRows = state.guests.map((guest) => {
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
      _date: guest.status === 'Check Out' ? guest.checkoutDate : guest.checkinDate,
    };
  });

  const reservationRows = (state.reservations || []).map((reservation) => {
    const room = state.rooms.find((item) => item.id === reservation.roomId);
    return {
      status: reservation.status,
      nama: reservation.name,
      nik: reservation.nik || '',
      jabatan: reservation.level || '',
      posisi: reservation.position || '',
      kamar: room ? roomLabel(room) : '',
      office: reservation.office || '',
      keperluan: reservation.purpose || '',
      dapat_makan: reservation.mealEligible || '',
      tanggal_ci: reservation.checkinDate || '',
      tanggal_co: '',
      lama_menginap: '-',
      catatan: reservation.note || '',
      _date: reservation.reservationDate || reservation.checkinDate || '',
    };
  });

  return [...stayRows, ...reservationRows]
    .filter((row) => {
      if (filter === 'all') return true;
      if (filter === 'CI Today') return row.tanggal_ci === todayIso();
      if (filter === 'Reserved') return row.status === 'Reserved';
      return row.status === filter;
    })
    .filter((row) => !dateFilter || row._date === dateFilter)
    .map(({ _date, ...row }) => row);
}

function reportBadgeClass(status) {
  if (status === 'Check Out' || status === 'Checked In') return 'ok';
  if (status === 'Reserved') return 'warn';
  if (status === 'Cancelled') return 'muted';
  return 'danger';
}

function renderReports() {
  const rows = guestReportRows();
  if (!$('guestReportTable')) return;
  $('guestReportTable').innerHTML = rows.length
    ? rows.map((row) => `<tr><td>${badge(row.status, reportBadgeClass(row.status))}</td><td>${row.nama}</td><td>${row.nik}</td><td>${row.jabatan}</td><td>${row.posisi}</td><td>${row.kamar || '-'}</td><td>${row.office}</td><td>${row.keperluan}</td><td>${row.dapat_makan}</td><td>${row.tanggal_ci || '-'}</td><td>${row.tanggal_co || '-'}</td><td>${row.lama_menginap}</td></tr>`).join('')
    : emptyRow(12, 'Belum ada data laporan tamu');
}

function initReportsMenu() {
  $('guestReportStatus')?.addEventListener('change', renderReports);
  $('guestReportDate')?.addEventListener('change', renderReports);
  $('downloadGuestReport')?.addEventListener('click', () => {
    downloadWorkbook('laporan-tamu-mess.xlsx', guestReportRows(), 'Laporan Tamu');
  });
}
