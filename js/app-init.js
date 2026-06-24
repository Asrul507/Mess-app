function loadLayoutFixes() {
  if (document.querySelector('link[data-layout-fixes]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'layout-fixes.css?v=19';
  link.dataset.layoutFixes = 'true';
  document.head.appendChild(link);
}

function loadFontAwesome() {
  if (document.querySelector('link[data-font-awesome]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
  link.referrerPolicy = 'no-referrer';
  link.dataset.fontAwesome = 'true';
  document.head.appendChild(link);
}

function ensureRepairState() {
  STORAGE_KEYS.repairHistory = STORAGE_KEYS.repairHistory || 'messapp_repair_history';
  if (!Array.isArray(state.repairHistory)) state.repairHistory = loadData(STORAGE_KEYS.repairHistory, []);
}

function navIconClass(button) {
  const page = button.dataset.page || button.dataset.quickPage || '';
  const roomOpen = button.dataset.roomOpen || '';
  const label = key(button.textContent);

  if (page === 'dashboard') return 'fa-chart-pie';
  if (page === 'guest-report') return 'fa-clipboard-list';
  if (page === 'stay-report') return 'fa-bed';
  if (page === 'checkin') return 'fa-right-to-bracket';
  if (page === 'inhouse') return 'fa-house-user';
  if (page === 'checkout') return 'fa-right-from-bracket';
  if (page === 'reservations') return 'fa-calendar-check';
  if (page === 'forecast') return 'fa-chart-line';
  if (page === 'meal') return 'fa-utensils';
  if (page === 'meal-report') return 'fa-file-lines';
  if (page === 'employees') return 'fa-users';
  if (page === 'rooms' && roomOpen === 'overview') return 'fa-building';
  if (page === 'rooms' && roomOpen === 'status') return 'fa-door-open';
  if (page === 'rooms' && roomOpen === 'broken') return 'fa-screwdriver-wrench';
  if (page === 'rooms' && roomOpen === 'add') return 'fa-square-plus';
  if (label.includes('forecast')) return 'fa-chart-line';
  if (label.includes('check in')) return 'fa-right-to-bracket';
  if (label.includes('in house')) return 'fa-house-user';
  if (label.includes('absen')) return 'fa-utensils';
  return 'fa-circle-dot';
}

function applyButtonIcon(button, iconClass) {
  if (!button || button.dataset.iconApplied === 'true') return;
  const label = text(button.textContent).replace(/^←\s*/, '');
  button.innerHTML = `<i class="fa-solid ${iconClass}" aria-hidden="true"></i><span>${label}</span>`;
  button.dataset.iconApplied = 'true';
}

function decorateAppIcons() {
  document.querySelectorAll('.nav-btn').forEach((button) => applyButtonIcon(button, navIconClass(button)));
  document.querySelectorAll('[data-quick-page]').forEach((button) => applyButtonIcon(button, navIconClass(button)));
  applyButtonIcon($('backBtn'), 'fa-arrow-left');

  const searchIcon = document.querySelector('.global-search span');
  if (searchIcon) searchIcon.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';
}

function repairDays(startDate, endDate = todayIso()) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(Math.floor((end - start) / 86400000) + 1, 1);
}

function repairBadge(status) {
  return badge(status === 'done' ? 'Done' : 'Progress', status === 'done' ? 'ok' : 'warn');
}

function activeRepair(room) {
  return room?.repair && room.repair.status === 'progress';
}

function repairHistoryRows() {
  ensureRepairState();
  return state.repairHistory.slice().sort((a, b) => text(b.startedAt || b.startDate).localeCompare(text(a.startedAt || a.startDate)));
}

function repairRoomLabel(record) {
  const room = state.rooms.find((item) => item.id === record.roomId);
  return record.roomLabel || roomLabel(room);
}

function repairStartDialog(roomNames) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'app-modal';
    modal.innerHTML = `<div class="app-modal-card repair-modal-card"><div class="app-modal-icon danger"><i class="fa-solid fa-screwdriver-wrench"></i></div><h3>Input Kamar Rusak</h3><p>${roomNames}</p><div class="repair-fields"><label>Keterangan Kerusakan<textarea id="repairDamageNote" placeholder="Contoh: AC bocor, plafon rusak, pintu macet"></textarea></label><label>Rencana Selesai<input type="date" id="repairTargetDate" min="${todayIso()}" value="${todayIso()}" /></label></div><div class="app-modal-actions"><button class="secondary-btn" id="repairCancel" type="button">Batal</button><button class="danger-btn" id="repairSave" type="button">Set Rusak</button></div></div>`;
    document.body.appendChild(modal);

    const close = (value) => {
      modal.remove();
      resolve(value);
    };

    modal.querySelector('#repairCancel')?.addEventListener('click', () => close(null));
    modal.querySelector('#repairSave')?.addEventListener('click', async () => {
      const note = text(modal.querySelector('#repairDamageNote')?.value);
      const targetDate = modal.querySelector('#repairTargetDate')?.value || todayIso();
      if (!note) return appAlert('Keterangan kerusakan wajib diisi.', 'Data Belum Lengkap', 'danger');
      if (targetDate < todayIso()) return appAlert('Rencana selesai tidak boleh sebelum tanggal hari ini.', 'Tanggal Tidak Valid', 'danger');
      close({ note, targetDate });
    });
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close(null);
    });
  });
}

function repairDoneDialog(room) {
  return new Promise((resolve) => {
    const repair = activeRepair(room);
    const modal = document.createElement('div');
    modal.className = 'app-modal';
    modal.innerHTML = `<div class="app-modal-card repair-modal-card"><div class="app-modal-icon confirm"><i class="fa-solid fa-check"></i></div><h3>Selesai Perbaikan</h3><p>${roomLabel(room)}<br>Kerusakan: ${repair?.damageNote || '-'}</p><div class="repair-fields"><label>Catatan Selesai<textarea id="repairDoneNote" placeholder="Contoh: AC sudah normal, pintu sudah diperbaiki"></textarea></label></div><div class="app-modal-actions"><button class="secondary-btn" id="repairDoneCancel" type="button">Batal</button><button class="primary-btn" id="repairDoneSave" type="button">Selesai & Jadikan VD</button></div></div>`;
    document.body.appendChild(modal);

    const close = (value) => {
      modal.remove();
      resolve(value);
    };

    modal.querySelector('#repairDoneCancel')?.addEventListener('click', () => close(null));
    modal.querySelector('#repairDoneSave')?.addEventListener('click', () => close({ note: text(modal.querySelector('#repairDoneNote')?.value) }));
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close(null);
    });
  });
}

async function startRoomRepair(roomIds) {
  ensureRepairState();
  const rooms = roomIds.map((id) => state.rooms.find((room) => room.id === id)).filter(Boolean);
  const availableRooms = rooms.filter((room) => !roomOccupant(room.id));
  if (!availableRooms.length) return appAlert('Tidak ada kamar yang bisa diubah. Kamar terisi tidak bisa dibuat rusak dari menu Status Kamar.', 'Kamar Tidak Bisa Diubah', 'danger');

  const result = await repairStartDialog(availableRooms.map(roomLabel).join(', '));
  if (!result) return;

  const startDate = todayIso();
  availableRooms.forEach((room) => {
    const recordId = activeRepair(room)?.id || uid();
    room.status = 'rusak';
    room.repair = {
      id: recordId,
      status: 'progress',
      damageNote: result.note,
      startDate,
      targetDate: result.targetDate,
      plannedDays: repairDays(startDate, result.targetDate),
      startedAt: new Date().toISOString(),
    };

    const existingIndex = state.repairHistory.findIndex((item) => item.id === recordId);
    const record = {
      id: recordId,
      roomId: room.id,
      roomLabel: roomLabel(room),
      damageNote: result.note,
      startDate,
      targetDate: result.targetDate,
      plannedDays: repairDays(startDate, result.targetDate),
      status: 'progress',
      startedAt: new Date().toISOString(),
      completedDate: '',
      completedAt: '',
      doneNote: '',
      actualDays: '',
    };
    if (existingIndex >= 0) state.repairHistory[existingIndex] = { ...state.repairHistory[existingIndex], ...record };
    else state.repairHistory.push(record);
  });

  saveData(STORAGE_KEYS.rooms, state.rooms);
  saveData(STORAGE_KEYS.repairHistory, state.repairHistory);
  renderAll();
}

async function completeRoomRepair(roomId) {
  ensureRepairState();
  const room = state.rooms.find((item) => item.id === roomId);
  if (!room || !activeRepair(room)) return;
  const result = await repairDoneDialog(room);
  if (!result) return;

  const completedDate = todayIso();
  const repair = room.repair;
  const actualDays = repairDays(repair.startDate, completedDate);
  const historyIndex = state.repairHistory.findIndex((item) => item.id === repair.id);
  if (historyIndex >= 0) {
    state.repairHistory[historyIndex] = {
      ...state.repairHistory[historyIndex],
      status: 'done',
      completedDate,
      completedAt: new Date().toISOString(),
      doneNote: result.note,
      actualDays,
    };
  } else {
    state.repairHistory.push({
      id: repair.id,
      roomId: room.id,
      roomLabel: roomLabel(room),
      damageNote: repair.damageNote,
      startDate: repair.startDate,
      targetDate: repair.targetDate,
      plannedDays: repair.plannedDays,
      status: 'done',
      completedDate,
      completedAt: new Date().toISOString(),
      doneNote: result.note,
      actualDays,
    });
  }

  room.repair = { ...repair, status: 'done', completedDate, completedAt: new Date().toISOString(), doneNote: result.note, actualDays };
  room.status = 'kotor';
  saveData(STORAGE_KEYS.rooms, state.rooms);
  saveData(STORAGE_KEYS.repairHistory, state.repairHistory);
  renderAll();
  await appAlert(`Perbaikan kamar ${roomLabel(room)} selesai. Status kamar otomatis menjadi VD/Kotor.`, 'Perbaikan Selesai');
}

function setRoomStatus(roomId, status) {
  const room = state.rooms.find((item) => item.id === roomId);
  if (!room) return;
  if (roomOccupant(roomId)) return alert('Kamar masih terisi. Ubah hanya lewat pindah kamar atau check out dari menu In House.');
  if (status === 'rusak') return startRoomRepair([roomId]);
  if (activeRepair(room)) return appAlert('Kamar masih dalam proses perbaikan. Gunakan tombol Selesai Perbaikan di menu Kamar Perbaikan.', 'Perbaikan Masih Progress', 'danger');
  room.status = status;
  saveData(STORAGE_KEYS.rooms, state.rooms);
  renderAll();
}

function bulkSetRoomStatus(status) {
  const ids = selectedRoomIds();
  if (!ids.length) return alert('Pilih/centang kamar dulu.');
  if (status === 'rusak') return startRoomRepair(ids);
  let changed = 0;
  let skipped = 0;
  ids.forEach((id) => {
    const room = state.rooms.find((item) => item.id === id);
    if (!room) return;
    if (roomOccupant(id) || activeRepair(room)) { skipped += 1; return; }
    room.status = status;
    changed += 1;
  });
  saveData(STORAGE_KEYS.rooms, state.rooms);
  renderAll();
  alert(`${changed} kamar diubah ke ${status}.${skipped ? ` ${skipped} dilewati karena masih terisi/masih progress perbaikan.` : ''}`);
}

function ensureRepairHistoryUi() {
  const tab = $('roomTabBroken');
  if (!tab || $('repairHistoryCard')) return;
  const card = document.createElement('article');
  card.className = 'card repair-history-card';
  card.id = 'repairHistoryCard';
  card.innerHTML = `<div class="section-title"><h3>History Perbaikan</h3><span id="repairHistoryCountText">0 data</span></div><div class="table-wrap"><table><thead><tr><th>Kamar</th><th>Kerusakan</th><th>Mulai</th><th>Rencana Selesai</th><th>Selesai</th><th>Durasi</th><th>Status</th><th>Catatan Selesai</th></tr></thead><tbody id="repairHistoryTable"></tbody></table></div>`;
  tab.appendChild(card);
}

function renderRepairHistory() {
  ensureRepairState();
  ensureRepairHistoryUi();
  const rows = repairHistoryRows().filter((record) => matchesSearch([repairRoomLabel(record), record.damageNote, record.startDate, record.targetDate, record.completedDate, record.status, record.doneNote]));
  if ($('repairHistoryCountText')) $('repairHistoryCountText').textContent = `${rows.length} data`;
  if ($('repairHistoryTable')) $('repairHistoryTable').innerHTML = rows.length
    ? rows.map((record) => `<tr><td>${repairRoomLabel(record)}</td><td>${record.damageNote || '-'}</td><td>${record.startDate || '-'}</td><td>${record.targetDate || '-'}<br><small>${record.plannedDays || repairDays(record.startDate, record.targetDate)} hari rencana</small></td><td>${record.completedDate || '-'}</td><td>${record.status === 'done' ? `${record.actualDays || repairDays(record.startDate, record.completedDate)} hari actual` : `${repairDays(record.startDate)} hari berjalan`}</td><td>${repairBadge(record.status)}</td><td>${record.doneNote || '-'}</td></tr>`).join('')
    : emptyRow(8, 'Belum ada history perbaikan kamar');
}

function renderRooms() {
  ensureRepairState();
  ensureRepairHistoryUi();
  if ($('roomCountText')) $('roomCountText').textContent = `${state.rooms.length} data`;
  if ($('roomOverviewGrid')) $('roomOverviewGrid').innerHTML = sortedRooms(state.rooms).filter((room) => matchesSearch([roomLabel(room), room.type, room.status, room.building, roomOccupant(room.id)?.name, room.repair?.damageNote])).map((room) => {
    const occupant = roomOccupant(room.id);
    const repair = activeRepair(room);
    const info = repair ? `Rusak: ${repair.damageNote || '-'} • Target ${repair.targetDate || '-'} • ${repairDays(repair.startDate, repair.targetDate)} hari rencana` : occupant ? `${occupant.name} • CI ${occupant.checkinDate} • ${stayDays(occupant.checkinDate)} hari` : 'Kosong';
    return `<button type="button" class="room-card ${room.status}" onclick="showRoomDetail('${room.id}')"><div><strong>${roomLabel(room)}</strong><p>${room.type}</p></div>${statusBadge(room.status)}<small>${info}</small></button>`;
  }).join('');

  const filtered = getFilteredRooms();
  if ($('roomStatusTable')) $('roomStatusTable').innerHTML = filtered.length ? filtered.map((room) => {
    const occupant = roomOccupant(room.id);
    const repair = activeRepair(room);
    const disabled = occupant ? 'disabled title="Kamar terisi hanya bisa diubah lewat In House"' : '';
    const actions = repair
      ? `<button class="primary-btn" ${disabled} onclick="completeRoomRepair('${room.id}')">Selesai Perbaikan</button>`
      : `<button class="mini-btn" ${disabled} onclick="setRoomStatus('${room.id}','bersih')">Bersih</button><button class="mini-btn" ${disabled} onclick="setRoomStatus('${room.id}','kotor')">Kotor/VD</button><button class="danger-btn" ${disabled} onclick="setRoomStatus('${room.id}','rusak')">Rusak</button>`;
    const statusInfo = repair ? `${statusBadge(room.status)}<br><small>${repair.damageNote || '-'}</small>` : statusBadge(room.status);
    return `<tr><td><label class="check-cell"><input type="checkbox" class="room-check" value="${room.id}" ${occupant ? 'disabled' : ''}> ${roomLabel(room)}</label></td><td>${room.type}</td><td>${statusInfo}</td><td>${occupant ? occupant.name : '-'}</td><td><div class="button-row">${actions}</div></td></tr>`;
  }).join('') : emptyRow(5, 'Tidak ada kamar sesuai filter');

  const brokenRooms = sortedRooms(state.rooms).filter((room) => (room.status === 'rusak' || activeRepair(room)) && matchesSearch([roomLabel(room), room.type, room.status, room.building, room.repair?.damageNote]));
  if ($('brokenRoomCountText')) $('brokenRoomCountText').textContent = `${brokenRooms.length} progress`;
  if ($('brokenRoomCards')) $('brokenRoomCards').innerHTML = brokenRooms.length ? brokenRooms.map((room) => {
    const repair = activeRepair(room);
    if (!repair) return `<div class="guest-card repair-card"><div class="guest-card-head"><div><h3>${roomLabel(room)}</h3><p>${room.type}</p></div>${statusBadge(room.status)}</div><p class="note-text">Data kerusakan belum lengkap. Klik lengkapi untuk isi keterangan dan rencana durasi.</p><div class="card-actions"><button class="danger-btn" onclick="startRoomRepair(['${room.id}'])">Lengkapi Data Perbaikan</button></div></div>`;
    return `<div class="guest-card repair-card"><div class="guest-card-head"><div><h3>${roomLabel(room)}</h3><p>${room.type}</p></div>${repairBadge(repair.status)}</div><div class="repair-info-grid"><span><b>Kerusakan</b>${repair.damageNote || '-'}</span><span><b>Mulai</b>${repair.startDate || '-'}</span><span><b>Rencana Selesai</b>${repair.targetDate || '-'}</span><span><b>Durasi Rencana</b>${repairDays(repair.startDate, repair.targetDate)} hari</span><span><b>Berjalan</b>${repairDays(repair.startDate)} hari</span></div><p class="note-text">Tidak tampil di pilihan check in selama progress perbaikan.</p><div class="card-actions"><button class="primary-btn" onclick="completeRoomRepair('${room.id}')">Selesai Perbaikan</button></div></div>`;
  }).join('') : '<div class="empty-card">Tidak ada kamar dalam progress perbaikan.</div>';
  renderRepairHistory();
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
      return `<div class="inhouse-item"><div class="inhouse-main"><strong>${guest.name}</strong><span>${roomLabel(room)} • ${guest.office || '-'}</span></div><div class="inhouse-meta"><span>${employee.level || guest.level || '-'}</span><span>${employee.position || guest.position || '-'}</span><span>Site: ${guest.site || employee.site || '-'}</span><span>CI ${guest.checkinDate}</span><span>${stayDays(guest.checkinDate)} hari</span><span>${guest.purpose || '-'}</span><span>Barang: ${borrowedItemLabel(guest)}</span><span>Makan: ${guest.mealEligible || '-'}</span></div><div class="row-menu"><button class="dots-btn" onclick="toggleInhouseActions(event, '${guest.id}')" aria-label="Aksi ${guest.name}">⋯</button><div class="row-menu-list hidden" id="inhouseMenu-${guest.id}"><button onclick="detailGuest('${guest.id}')">Detail</button><button onclick="editGuest('${guest.id}')">Edit Data</button><button onclick="moveGuestRoom('${guest.id}')">Pindah Kamar</button><button onclick="updateGuestNote('${guest.id}')">Catatan</button>${guest.borrowedItem && !guest.borrowedReturned ? `<button onclick="returnBorrowedItem('${guest.id}')">Barang Kembali</button>` : ''}<button class="danger-text" onclick="checkoutGuest('${guest.id}')">Check Out</button></div></div></div>`;
    }).join('')
    : '<div class="empty-card">Belum ada penghuni In House.</div>';
}

function editGuest(guestId) {
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest) return;
  const currentRoom = roomOfGuest(guest);

  editingGuestId = guest.id;
  showPage('checkin', 'Edit Data In House');

  fillCheckinEmployee({ name: guest.name, nik: guest.nik, level: guest.level, position: guest.position, office: guest.office, site: guest.site });
  if ($('guestPurpose')) $('guestPurpose').value = guest.purpose || '';
  if ($('guestMealEligible')) $('guestMealEligible').value = guest.mealEligible || 'Ya';
  if ($('guestCheckinDate')) $('guestCheckinDate').value = guest.checkinDate || todayIso();
  if ($('guestNote')) $('guestNote').value = guest.note || '';
  if ($('guestBorrowedItem')) $('guestBorrowedItem').value = guest.borrowedItem || '';
  if ($('guestBorrowedQty')) $('guestBorrowedQty').value = guest.borrowedQty || '';
  if ($('guestRoom')) {
    $('guestRoom').innerHTML = `<option value="${guest.roomId}">${roomLabel(currentRoom)} - ${currentRoom?.type || ''} (kamar sekarang)</option>`;
    $('guestRoom').value = guest.roomId;
  }
}

function moveRoomDialog(guest, rooms) {
  const oldRoom = roomOfGuest(guest);
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'app-modal';
    modal.innerHTML = `<div class="app-modal-card move-room-card"><div class="app-modal-icon confirm"><i class="fa-solid fa-door-open"></i></div><h3>Pindah Kamar</h3><p>${guest.name}<br>Kamar sekarang: ${roomLabel(oldRoom)}</p><div class="move-room-fields"><label>Kamar Baru<select id="moveRoomSelect"></select></label><label>Catatan<textarea id="moveRoomNote" placeholder="Contoh: pindah karena kamar maintenance"></textarea></label></div><div class="app-modal-actions"><button class="secondary-btn" id="moveRoomCancel" type="button">Batal</button><button class="primary-btn" id="moveRoomSave" type="button">Simpan</button></div></div>`;
    document.body.appendChild(modal);

    const select = modal.querySelector('#moveRoomSelect');
    select.innerHTML = rooms.map((room) => `<option value="${room.id}">${roomLabel(room)} - ${room.type || '-'}</option>`).join('');

    const close = (value) => {
      modal.remove();
      resolve(value);
    };

    modal.querySelector('#moveRoomCancel')?.addEventListener('click', () => close(null));
    modal.querySelector('#moveRoomSave')?.addEventListener('click', () => close({
      roomId: select.value,
      note: text(modal.querySelector('#moveRoomNote')?.value),
    }));
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close(null);
    });
  });
}

async function moveGuestRoom(guestId) {
  closeInhouseMenus();
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest) return;

  const availableRooms = sortedRooms(state.rooms).filter((room) => room.id !== guest.roomId && room.status === 'bersih' && !roomOccupant(room.id));
  if (!availableRooms.length) return appAlert('Tidak ada kamar bersih yang kosong untuk pindah kamar.', 'Kamar Tidak Tersedia', 'danger');

  const result = await moveRoomDialog(guest, availableRooms);
  if (!result?.roomId) return;

  const oldRoom = roomOfGuest(guest);
  const newRoom = state.rooms.find((room) => room.id === result.roomId);
  if (!newRoom || newRoom.status !== 'bersih' || roomOccupant(newRoom.id)) return appAlert('Kamar baru sudah tidak tersedia. Silakan pilih ulang.', 'Kamar Tidak Tersedia', 'danger');

  const oldLabel = roomLabel(oldRoom);
  const newLabel = roomLabel(newRoom);
  guest.roomId = newRoom.id;
  guest.updatedAt = new Date().toISOString();

  const moveNote = `Pindah kamar ${oldLabel} ke ${newLabel}${result.note ? ` - ${result.note}` : ''}`;
  guest.note = text([guest.note, moveNote].filter(Boolean).join('\n'));

  if (oldRoom && !roomOccupant(oldRoom.id)) oldRoom.status = 'kotor';
  newRoom.status = 'terisi';

  saveData(STORAGE_KEYS.guests, state.guests);
  saveData(STORAGE_KEYS.rooms, state.rooms);
  renderAll();
  await appAlert(`${guest.name} berhasil dipindahkan ke kamar ${newLabel}.`, 'Pindah Kamar Berhasil');
}

function initNavigation() {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => {
      showPage(button.dataset.page, button.textContent);
      document.querySelectorAll('.nav-btn').forEach((item) => item.classList.toggle('active', item === button));
      if (button.dataset.roomOpen && typeof openRoomTab === 'function') openRoomTab(button.dataset.roomOpen);
    });
  });
  $('backBtn')?.addEventListener('click', goBackPage);
  $('globalSearch')?.addEventListener('input', renderAll);
  document.addEventListener('click', () => { if (typeof closeInhouseMenus === 'function') closeInhouseMenus(); });
  document.querySelectorAll('[data-quick-page]').forEach((button) => {
    button.addEventListener('click', () => showPage(button.dataset.quickPage, button.textContent));
  });
}

async function initApp() {
  loadLayoutFixes();
  loadFontAwesome();
  ensureRepairState();

  if ($('todayText')) $('todayText').textContent = formatDate();

  if (typeof initRemoteDataSync === 'function') await initRemoteDataSync();
  ensureRepairState();

  state.purposes = Array.from(new Set([...DEFAULT_PURPOSES, ...state.purposes]));
  saveData(STORAGE_KEYS.purposes, state.purposes);

  initNavigation();
  if (typeof initForecastMenu === 'function') initForecastMenu();
  decorateAppIcons();
  if (typeof prepareRoomMenuUi === 'function') prepareRoomMenuUi();
  initRoomsMenu();
  ensureRepairHistoryUi();
  if (typeof initReservationsMenu === 'function') initReservationsMenu();
  initEmployeesMenu();
  initCheckinMenu();
  initMealsMenu();
  initReportsMenu();

  renderAll();
}

initApp();
