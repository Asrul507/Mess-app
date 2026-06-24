
function borrowedItemLabel(guest) {
  if (!guest?.borrowedItem) return '-';
  return `${guest.borrowedItem}${guest.borrowedQty ? ` (${guest.borrowedQty})` : ''}${guest.borrowedReturned ? ' • kembali' : ' • belum kembali'}`;
}

function renderPurposeOptions() {
  if (!$('purposeOptions')) return;
  $('purposeOptions').innerHTML = state.purposes.map((purpose) => `<option value="${purpose}"></option>`).join('');
}

function renderRoomOptions() {
  const select = $('guestRoom');
  if (!select) return;
  const availableRooms = sortedRooms(state.rooms).filter((room) => room.status === 'bersih' && !roomOccupant(room.id));
  select.innerHTML = availableRooms.length
    ? availableRooms.map((room) => `<option value="${room.id}">${roomLabel(room)} - ${room.type}</option>`).join('')
    : '<option value="">Tidak ada kamar bersih tersedia</option>';
}

function fillCheckinEmployee(employee) {
  if ($('guestName')) $('guestName').value = employee.name || '';
  if ($('guestNik')) $('guestNik').value = employee.nik || '';
  if ($('guestLevel')) $('guestLevel').value = employee.level || '';
  if ($('guestPosition')) $('guestPosition').value = employee.position || '';
  if ($('guestOffice')) $('guestOffice').value = employee.office || '';
  if ($('guestSite')) $('guestSite').value = employee.site || '';
}

function handleGuestNameCheck() {
  const name = text($('guestName')?.value);
  const notice = $('newEmployeeNotice');
  if (!name) {
    notice?.classList.add('hidden');
    return;
  }

  const employee = findEmployeeByName(name);
  if (notice) notice.querySelector('strong').textContent = 'Nama ini belum ada.';
  if (employee) {
    fillCheckinEmployee(employee);
    if (!isEmployeeActive(employee)) {
      notice?.classList.remove('hidden');
      if (notice) notice.querySelector('strong').textContent = 'Karyawan tidak aktif/blacklist.';
      return;
    }
    notice?.classList.add('hidden');
    return;
  }

  if ($('guestNik')) $('guestNik').value = '';
  if ($('guestLevel')) $('guestLevel').value = '';
  if ($('guestPosition')) $('guestPosition').value = '';
  if ($('guestSite')) $('guestSite').value = '';
  notice?.classList.remove('hidden');
}

function goAddEmployeeFromCheckin() {
  pendingCheckinEmployeeName = text($('guestName')?.value);
  if ($('employeeName')) $('employeeName').value = pendingCheckinEmployeeName;
  if ($('employeeNik')) $('employeeNik').value = text($('guestNik')?.value);
  if ($('employeeOffice')) $('employeeOffice').value = text($('guestOffice')?.value);
  if ($('employeeSite')) $('employeeSite').value = text($('guestSite')?.value);
  showPage('employees', 'Database Karyawan');
  $('employeeNik')?.focus();
}

function renderCheckin() {
  renderPurposeOptions();
  renderRoomOptions();
  handleGuestNameCheck();
  renderCheckinReport();
  renderCheckoutMenu();
}

function renderInhouse() {
  const guests = activeGuests().filter((guest) => {
    const room = roomOfGuest(guest);
    const employee = employeeOfGuest(guest);
    return matchesSearch([guest.name, guest.nik, employee.level || guest.level, employee.position || guest.position, guest.office, guest.site, roomLabel(room), guest.purpose, guest.borrowedItem, guest.mealEligible, guest.note]);
  });
  if ($('inhouseCountText')) $('inhouseCountText').textContent = `${guests.length} orang`;
  if (!$('inhouseCards')) return;

  $('inhouseCards').innerHTML = guests.length
    ? guests.map((guest) => {
      const room = roomOfGuest(guest);
      const employee = employeeOfGuest(guest);
      return `<div class="inhouse-item"><div class="inhouse-main"><strong>${guest.name}</strong><span>${roomLabel(room)} • ${guest.office || '-'}</span></div><div class="inhouse-meta"><span>${employee.level || guest.level || '-'}</span><span>${employee.position || guest.position || '-'}</span><span>Site: ${guest.site || employee.site || '-'}</span><span>CI ${guest.checkinDate}</span><span>${stayDays(guest.checkinDate)} hari</span><span>${guest.purpose || '-'}</span><span>Barang: ${borrowedItemLabel(guest)}</span><span>Makan: ${guest.mealEligible || '-'}</span></div><div class="row-menu"><button class="dots-btn" onclick="toggleInhouseActions(event, '${guest.id}')" aria-label="Aksi ${guest.name}">⋯</button><div class="row-menu-list hidden" id="inhouseMenu-${guest.id}"><button onclick="detailGuest('${guest.id}')">Detail</button><button onclick="editGuest('${guest.id}')">Edit/Pindah</button><button onclick="updateGuestNote('${guest.id}')">Catatan</button>${guest.borrowedItem && !guest.borrowedReturned ? `<button onclick="returnBorrowedItem('${guest.id}')">Barang Kembali</button>` : ''}<button class="danger-text" onclick="checkoutGuest('${guest.id}')">Check Out</button></div></div></div>`;
    }).join('')
    : '<div class="empty-card">Belum ada penghuni In House.</div>';
}


function closeInhouseMenus() {
  document.querySelectorAll('.row-menu-list').forEach((menu) => menu.classList.add('hidden'));
}

function toggleInhouseActions(event, guestId) {
  event.stopPropagation();
  const menu = $(`inhouseMenu-${guestId}`);
  if (!menu) return;
  const willOpen = menu.classList.contains('hidden');
  closeInhouseMenus();
  menu.classList.toggle('hidden', !willOpen);
}

function editGuest(guestId) {
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest) return;
  editingGuestId = guest.id;
  fillCheckinEmployee({ name: guest.name, nik: guest.nik, level: guest.level, position: guest.position, office: guest.office, site: guest.site });
  if ($('guestPurpose')) $('guestPurpose').value = guest.purpose || '';
  if ($('guestMealEligible')) $('guestMealEligible').value = guest.mealEligible || 'Ya';
  if ($('guestCheckinDate')) $('guestCheckinDate').value = guest.checkinDate || todayIso();
  if ($('guestNote')) $('guestNote').value = guest.note || '';
  if ($('guestBorrowedItem')) $('guestBorrowedItem').value = guest.borrowedItem || '';
  if ($('guestBorrowedQty')) $('guestBorrowedQty').value = guest.borrowedQty || '';
  renderRoomOptions();
  const currentRoom = roomOfGuest(guest);
  const option = document.createElement('option');
  option.value = guest.roomId;
  option.textContent = `${roomLabel(currentRoom)} - ${currentRoom?.type || ''} (current)`;
  $('guestRoom')?.prepend(option);
  if ($('guestRoom')) $('guestRoom').value = guest.roomId;
  showPage('checkin', 'Edit In House');
}

async function detailGuest(guestId) {
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest) return;
  const room = roomOfGuest(guest);
  await appAlert(`Nama: ${guest.name}\nSite: ${guest.site || '-'}\nKamar: ${roomLabel(room)}\nCI: ${guest.checkinDate}\nLama: ${stayDays(guest.checkinDate)} hari\nKeperluan: ${guest.purpose}\nPinjam Barang: ${borrowedItemLabel(guest)}\nCatatan: ${guest.note || '-'}`, 'Detail Stay');
}

async function updateGuestNote(guestId) {
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest) return;
  const note = await appPrompt(`Catatan untuk ${guest.name}`, guest.note || '', 'Tambah Catatan');
  if (note === null) return;
  guest.note = text(note);
  saveData(STORAGE_KEYS.guests, state.guests);
  renderAll();
}


async function returnBorrowedItem(guestId) {
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest || !guest.borrowedItem) return;
  if (!await appConfirm(`Tandai ${guest.borrowedItem} (${guest.borrowedQty || 1}) sudah dikembalikan oleh ${guest.name}?`, 'Konfirmasi Barang Kembali')) return;
  guest.borrowedReturned = true;
  guest.borrowedReturnedAt = new Date().toISOString();
  saveData(STORAGE_KEYS.guests, state.guests);
  renderAll();
}

async function checkoutGuest(guestId) {
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest) return;
  if (guest.borrowedItem && !guest.borrowedReturned) return appAlert(`${guest.name} masih meminjam ${borrowedItemLabel(guest)}. Check out belum bisa dilakukan sebelum barang dikembalikan.`, 'Barang Belum Kembali', 'danger');
  if (!await appConfirm(`Check out ${guest.name} hari ini? Kamar akan otomatis menjadi kotor.`, 'Konfirmasi Check Out')) return;
  guest.status = 'Check Out';
  guest.checkoutDate = todayIso();
  const room = roomOfGuest(guest);
  if (room) room.status = 'kotor';
  saveData(STORAGE_KEYS.guests, state.guests);
  saveData(STORAGE_KEYS.rooms, state.rooms);
  renderAll();
}


function renderCheckinReport() {
  const date = $('checkinReportDate')?.value || todayIso();
  const rows = state.guests.filter((guest) => guest.checkinDate === date && matchesSearch([guest.name, roomLabel(roomOfGuest(guest)), guest.office, guest.site, guest.purpose, guest.borrowedItem, guest.status]));
  if ($('checkinReportTable')) {
    $('checkinReportTable').innerHTML = rows.length
      ? rows.map((guest) => `<tr><td>${guest.name}</td><td>${roomLabel(roomOfGuest(guest))}</td><td>${guest.office || '-'}</td><td>${guest.site || '-'}</td><td>${guest.purpose || '-'}</td><td>${borrowedItemLabel(guest)}</td><td>${guest.checkinDate}</td><td>${badge(guest.status, guest.status === 'In House' ? 'danger' : 'ok')}</td></tr>`).join('')
      : emptyRow(8, 'Tidak ada data check in pada tanggal ini');
  }
}

function renderCheckoutMenu() {
  const active = activeGuests().filter((guest) => matchesSearch([guest.name, roomLabel(roomOfGuest(guest)), guest.office, guest.site, guest.purpose, guest.borrowedItem, guest.mealEligible]));
  if ($('checkoutTable')) {
    $('checkoutTable').innerHTML = active.length
      ? active.map((guest) => `<tr><td>${guest.name}</td><td>${roomLabel(roomOfGuest(guest))}</td><td>${guest.office || '-'}</td><td>${guest.site || '-'}</td><td>${borrowedItemLabel(guest)}</td><td>${guest.checkinDate}</td><td>${stayDays(guest.checkinDate)} hari</td><td><button class="danger-btn no-margin" onclick="checkoutGuest('${guest.id}')">Check Out</button></td></tr>`).join('')
      : emptyRow(8, 'Tidak ada penghuni yang bisa checkout');
  }
  const date = $('checkoutReportDate')?.value || todayIso();
  const checkedOut = state.guests.filter((guest) => guest.status === 'Check Out' && guest.checkoutDate === date && matchesSearch([guest.name, roomLabel(roomOfGuest(guest)), guest.office, guest.site, guest.borrowedItem, guest.checkinDate, guest.checkoutDate]));
  if ($('checkoutCountText')) $('checkoutCountText').textContent = `${checkedOut.length} data`;
  if ($('checkoutReportTable')) {
    $('checkoutReportTable').innerHTML = checkedOut.length
      ? checkedOut.map((guest) => `<tr><td>${guest.name}</td><td>${roomLabel(roomOfGuest(guest))}</td><td>${guest.office || '-'}</td><td>${guest.site || '-'}</td><td>${borrowedItemLabel(guest)}</td><td>${guest.checkinDate}</td><td>${guest.checkoutDate}</td><td>${stayDays(guest.checkinDate, guest.checkoutDate)} hari</td></tr>`).join('')
      : emptyRow(8, 'Tidak ada checkout pada tanggal ini');
  }
}
function initCheckinMenu() {
  if ($('guestCheckinDate')) $('guestCheckinDate').value = todayIso();
  if ($('checkinReportDate')) $('checkinReportDate').value = todayIso();
  if ($('checkoutReportDate')) $('checkoutReportDate').value = todayIso();

  $('checkinReportDate')?.addEventListener('change', renderCheckinReport);
  $('checkoutReportDate')?.addEventListener('change', renderCheckoutMenu);
  $('guestName')?.addEventListener('input', handleGuestNameCheck);
  $('guestName')?.addEventListener('change', handleGuestNameCheck);
  $('goAddEmployeeBtn')?.addEventListener('click', goAddEmployeeFromCheckin);
  $('savePurposeBtn')?.addEventListener('click', () => {
    addPurpose($('guestPurpose')?.value);
    renderPurposeOptions();
    alert('Keperluan tersimpan.');
  });

  $('checkinForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const employee = findEmployeeByName($('guestName')?.value);
    const room = state.rooms.find((item) => item.id === $('guestRoom')?.value);

    if (!employee) return alert('Nama karyawan belum ada di database.');
    if (!isEmployeeActive(employee)) return alert('Check in hanya bisa untuk karyawan status Aktif.');
    const existingGuest = editingGuestId ? state.guests.find((guest) => guest.id === editingGuestId) : null;
    const isCurrentRoom = existingGuest && existingGuest.roomId === room?.id;
    if (!room || (!isCurrentRoom && (room.status !== 'bersih' || roomOccupant(room.id)))) return alert('Kamar tidak tersedia. Pilih kamar bersih yang kosong.');

    const purpose = text($('guestPurpose')?.value);
    const borrowedItem = text($('guestBorrowedItem')?.value);
    const borrowedQty = Number($('guestBorrowedQty')?.value || 0) || '';
    addPurpose(purpose);

    const data = {
      employeeId: employee.id,
      name: employee.name,
      nik: employee.nik,
      level: employee.level,
      position: employee.position,
      roomId: room.id,
      office: text($('guestOffice')?.value),
      site: text($('guestSite')?.value) || employee.site || '',
      purpose,
      mealEligible: $('guestMealEligible')?.value || 'Ya',
      checkinDate: $('guestCheckinDate')?.value || todayIso(),
      checkoutDate: '',
      borrowedItem,
      borrowedQty,
      borrowedReturned: existingGuest && borrowedItem && key(existingGuest.borrowedItem) === key(borrowedItem) ? Boolean(existingGuest.borrowedReturned) : !borrowedItem,
      note: text($('guestNote')?.value),
      status: 'In House',
      updatedAt: new Date().toISOString(),
    };

    if (editingGuestId) {
      const index = state.guests.findIndex((guest) => guest.id === editingGuestId);
      if (index >= 0) {
        const oldRoomId = state.guests[index].roomId;
        state.guests[index] = { ...state.guests[index], ...data };
        if (oldRoomId && oldRoomId !== room.id) {
          const oldRoom = state.rooms.find((item) => item.id === oldRoomId);
          if (oldRoom && !roomOccupant(oldRoom.id)) oldRoom.status = 'kotor';
        }
      }
      editingGuestId = null;
    } else {
      state.guests.push({ id: uid(), ...data, createdAt: new Date().toISOString() });
    }

    room.status = 'terisi';
    saveData(STORAGE_KEYS.guests, state.guests);
    saveData(STORAGE_KEYS.rooms, state.rooms);
    event.target.reset();
    if ($('guestCheckinDate')) $('guestCheckinDate').value = todayIso();
  if ($('checkinReportDate')) $('checkinReportDate').value = todayIso();
  if ($('checkoutReportDate')) $('checkoutReportDate').value = todayIso();
    renderAll();
    showPage('inhouse', 'In House');
  });
}
