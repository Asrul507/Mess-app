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
      site: guest.site || employee.site || '',
      pinjam_barang: typeof borrowedItemLabel === 'function' ? borrowedItemLabel(guest) : (guest.borrowedItem || ''),
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
      site: reservation.site || '',
      pinjam_barang: '',
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
    .filter((row) => matchesSearch([row.status, row.nama, row.nik, row.jabatan, row.posisi, row.kamar, row.office, row.site, row.keperluan, row.pinjam_barang, row.dapat_makan, row.tanggal_ci, row.tanggal_co]))
    .map(({ _date, ...row }) => row);
}

function reportBadgeClass(status) {
  if (status === 'Check Out' || status === 'Checked In') return 'ok';
  if (status === 'Reserved') return 'warn';
  if (status === 'Cancelled') return 'muted';
  return 'danger';
}

function renderReports() {
  if (typeof renderStayReport === 'function') renderStayReport();
  const rows = guestReportRows();
  if (!$('guestReportTable')) return;
  $('guestReportTable').innerHTML = rows.length
    ? rows.map((row) => `<tr><td>${badge(row.status, reportBadgeClass(row.status))}</td><td>${row.nama}</td><td>${row.nik}</td><td>${row.jabatan}</td><td>${row.posisi}</td><td>${row.kamar || '-'}</td><td>${row.office}</td><td>${row.site || '-'}</td><td>${row.keperluan}</td><td>${row.pinjam_barang || '-'}</td><td>${row.dapat_makan}</td><td>${row.tanggal_ci || '-'}</td><td>${row.tanggal_co || '-'}</td><td>${row.lama_menginap}</td></tr>`).join('')
    : emptyRow(14, 'Belum ada data laporan tamu');
}


function stayReportRows() {
  const status = $('stayReportStatus')?.value || 'all';
  const dateFrom = $('stayReportFrom')?.value || '';
  const dateTo = $('stayReportTo')?.value || '';
  return state.guests
    .filter((guest) => status === 'all' || guest.status === status)
    .filter((guest) => !dateFrom || guest.checkinDate >= dateFrom)
    .filter((guest) => !dateTo || (guest.checkoutDate || todayIso()) <= dateTo)
    .filter((guest) => matchesSearch([guest.status, guest.name, guest.nik, guest.level, guest.position, roomLabel(roomOfGuest(guest)), guest.office, guest.site, guest.purpose, guest.borrowedItem, guest.mealEligible, guest.checkinDate, guest.checkoutDate]))
    .map((guest) => {
      const employee = employeeOfGuest(guest);
      return {
        status: guest.status,
        nama: guest.name,
        nik: guest.nik || employee.nik || '',
        jabatan: employee.level || guest.level || '',
        posisi: employee.position || guest.position || '',
        kamar: roomLabel(roomOfGuest(guest)),
        office: guest.office || '',
        site: guest.site || employee.site || '',
        keperluan: guest.purpose || '',
        pinjam_barang: typeof borrowedItemLabel === 'function' ? borrowedItemLabel(guest) : (guest.borrowedItem || ''),
        makan: guest.mealEligible || '',
        tanggal_ci: guest.checkinDate || '',
        tanggal_co: guest.checkoutDate || '',
        lama: `${stayDays(guest.checkinDate, guest.checkoutDate)} hari`,
      };
    });
}

function renderStayReport() {
  const rows = stayReportRows();
  if (!$('stayReportTable')) return;
  $('stayReportTable').innerHTML = rows.length
    ? rows.map((row) => `<tr><td>${badge(row.status, reportBadgeClass(row.status))}</td><td>${row.nama}</td><td>${row.nik}</td><td>${row.jabatan}</td><td>${row.posisi}</td><td>${row.kamar}</td><td>${row.office}</td><td>${row.site || '-'}</td><td>${row.keperluan}</td><td>${row.pinjam_barang || '-'}</td><td>${row.makan}</td><td>${row.tanggal_ci || '-'}</td><td>${row.tanggal_co || '-'}</td><td>${row.lama}</td></tr>`).join('')
    : emptyRow(14, 'Tidak ada data menginap sesuai filter');
}

function initReportsMenu() {
  $('guestReportStatus')?.addEventListener('change', renderReports);
  $('guestReportDate')?.addEventListener('change', renderReports);
  $('downloadGuestReport')?.addEventListener('click', () => {
    downloadWorkbook('laporan-tamu-mess.xlsx', guestReportRows(), 'Laporan Tamu');
  });
  ['stayReportStatus', 'stayReportFrom', 'stayReportTo'].forEach((id) => $(id)?.addEventListener('change', renderStayReport));
  $('downloadStayReport')?.addEventListener('click', () => {
    downloadWorkbook('laporan-karyawan-menginap.xlsx', stayReportRows(), 'Laporan Menginap');
  });
}
