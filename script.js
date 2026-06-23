const STORAGE_KEYS = {
  rooms: 'messapp_rooms',
  employees: 'messapp_employees',
  guests: 'messapp_guests',
  meals: 'messapp_meals',
  purposes: 'messapp_purposes',
};

const DEFAULT_PURPOSES = ['Cuti', 'On Site', 'Dinas', 'New Hire Onsite', 'New Hire MCU', 'MCU Tahunan', 'Long Stay'];
const ROOM_STATUSES = ['bersih', 'terisi', 'kotor', 'rusak'];

const state = {
  rooms: loadData(STORAGE_KEYS.rooms, seedRooms()),
  employees: loadData(STORAGE_KEYS.employees, []),
  guests: loadData(STORAGE_KEYS.guests, []),
  meals: loadData(STORAGE_KEYS.meals, []),
  purposes: loadData(STORAGE_KEYS.purposes, DEFAULT_PURPOSES),
};

let pendingCheckinEmployeeName = '';
let editingGuestId = null;

function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Gagal membaca ${key}`, error);
    return fallback;
  }
}

function saveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function normalizeText(value) { return String(value || '').trim(); }
function normalizeName(value) { return normalizeText(value).toLowerCase(); }
function todayIso() { return new Date().toISOString().slice(0, 10); }
function currentTime() { return new Date().toTimeString().slice(0, 5); }

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function seedRooms() {
  return [
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'A', capacity: 1, type: 'Sharing 4', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'B', capacity: 1, type: 'Sharing 4', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'C', capacity: 1, type: 'Sharing 4', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'D', capacity: 1, type: 'Sharing 4', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '102', bedCode: '', capacity: 1, type: 'Single', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '201', bedCode: 'A', capacity: 1, type: 'Sharing 3', status: 'bersih', floor: '2', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '201', bedCode: 'B', capacity: 1, type: 'Sharing 3', status: 'bersih', floor: '2', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '201', bedCode: 'C', capacity: 1, type: 'Sharing 3', status: 'bersih', floor: '2', building: 'Mess A', note: '' },
  ];
}

function normalizeRoomStatus(status) {
  const value = normalizeName(status);
  if (value === 'available') return 'bersih';
  if (value === 'occupied') return 'terisi';
  if (value === 'dirty') return 'kotor';
  if (value === 'maintenance' || value === 'inactive' || value === 'broken') return 'rusak';
  if (ROOM_STATUSES.includes(value)) return value;
  return 'bersih';
}

function roomLabel(room) { return room?.bedCode ? `${room.roomNo}${room.bedCode}` : room?.roomNo || '-'; }
function getActiveGuests() { return state.guests.filter((guest) => guest.status === 'In House'); }
function getGuestRoom(guest) { return state.rooms.find((room) => room.id === guest.roomId); }
function getEmployeeById(id) { return state.employees.find((employee) => employee.id === id); }
function getRoomOccupant(roomId) { return getActiveGuests().find((guest) => guest.roomId === roomId); }
function isRoomOccupied(roomId) { return Boolean(getRoomOccupant(roomId)); }
function findEmployeeByName(name) { return state.employees.find((employee) => normalizeName(employee.name) === normalizeName(name)); }
function emptyRow(colspan, text) { return `<tr><td class="empty" colspan="${colspan}">${text}</td></tr>`; }
function badge(text, type = 'ok') { return `<span class="badge ${type}">${text}</span>`; }

function roomStatusClass(status) {
  const value = normalizeRoomStatus(status);
  if (value === 'bersih') return 'ok';
  if (value === 'terisi') return 'danger';
  if (value === 'kotor') return 'warn';
  return 'muted';
}

function statusBadge(status) { return badge(normalizeRoomStatus(status), roomStatusClass(status)); }

function nightsSince(checkinDate, checkoutDate = null) {
  if (!checkinDate) return 0;
  const start = new Date(`${checkinDate}T00:00:00`);
  const end = new Date(`${checkoutDate || todayIso()}T00:00:00`);
  const diff = Math.floor((end - start) / 86400000);
  return Math.max(diff + 1, 1);
}

function showPage(pageId, title = '') {
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.page === pageId));
  document.querySelectorAll('.page').forEach((page) => page.classList.toggle('active', page.id === pageId));
  document.getElementById('pageTitle').textContent = title || document.querySelector(`[data-page="${pageId}"]`)?.textContent || '';
}

function showRoomTab(tabId) {
  document.querySelectorAll('.subnav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.roomTab === tabId));
  document.querySelectorAll('.room-tab').forEach((tab) => tab.classList.toggle('active', tab.id === tabId));
}

function renderNavigation() {
  document.querySelectorAll('.nav-btn').forEach((button) => button.addEventListener('click', () => showPage(button.dataset.page, button.textContent)));
  document.querySelectorAll('.subnav-btn').forEach((button) => button.addEventListener('click', () => showRoomTab(button.dataset.roomTab)));
}

function syncRoomStatusesFromGuests() {
  state.rooms.forEach((room) => {
    room.status = normalizeRoomStatus(room.status);
    const occupied = isRoomOccupied(room.id);
    if (occupied) room.status = 'terisi';
    if (!occupied && room.status === 'terisi') room.status = 'kotor';
  });
  saveData(STORAGE_KEYS.rooms, state.rooms);
}

function addPurposeIfNew(value) {
  const purpose = normalizeText(value);
  if (!purpose) return;
  const exists = state.purposes.some((item) => normalizeName(item) === normalizeName(purpose));
  if (!exists) {
    state.purposes.push(purpose);
    state.purposes.sort((a, b) => a.localeCompare(b));
    saveData(STORAGE_KEYS.purposes, state.purposes);
  }
}

function roomCounts() {
  return {
    bersih: state.rooms.filter((room) => normalizeRoomStatus(room.status) === 'bersih').length,
    terisi: state.rooms.filter((room) => normalizeRoomStatus(room.status) === 'terisi').length,
    kotor: state.rooms.filter((room) => normalizeRoomStatus(room.status) === 'kotor').length,
    rusak: state.rooms.filter((room) => normalizeRoomStatus(room.status) === 'rusak').length,
  };
}

function renderDashboard() {
  syncRoomStatusesFromGuests();
  const counts = roomCounts();
  const todaysMeals = state.meals.filter((meal) => meal.date === todayIso());

  document.getElementById('totalRooms').textContent = state.rooms.length;
  document.getElementById('cleanBeds').textContent = counts.bersih;
  document.getElementById('occupiedBeds').textContent = counts.terisi;
  document.getElementById('dirtyBrokenBeds').textContent = counts.kotor + counts.rusak;
  document.getElementById('roomStatusText').textContent = `${state.rooms.length} kamar/bed`;
  document.getElementById('roomStatusCards').innerHTML = `
    <div class="mini-status ok"><strong>${counts.bersih}</strong><span>Bersih</span></div>
    <div class="mini-status danger"><strong>${counts.terisi}</strong><span>Terisi</span></div>
    <div class="mini-status warn"><strong>${counts.kotor}</strong><span>Kotor</span></div>
    <div class="mini-status muted"><strong>${counts.rusak}</strong><span>Rusak</span></div>`;

  document.getElementById('mealTodayCount').textContent = `${todaysMeals.length} absen`;
  document.getElementById('mealTodayTable').innerHTML = todaysMeals.length
    ? todaysMeals.slice(-10).reverse().map((meal) => `<tr><td>${meal.guestName}</td><td>${meal.type}</td><td>${meal.time}</td></tr>`).join('')
    : emptyRow(3, 'Belum ada absen makan hari ini');
}

function renderRoomOptions() {
  const cleanRooms = state.rooms.filter((room) => normalizeRoomStatus(room.status) === 'bersih' && !isRoomOccupied(room.id));
  document.getElementById('guestRoom').innerHTML = cleanRooms.length
    ? cleanRooms.map((room) => `<option value="${room.id}">${roomLabel(room)} - ${room.type}</option>`).join('')
    : '<option value="">Tidak ada kamar bersih yang kosong</option>';
}

function renderPurposeOptions() {
  document.getElementById('purposeOptions').innerHTML = state.purposes.map((purpose) => `<option value="${purpose}"></option>`).join('');
}

function renderRoomOverview() {
  const counts = roomCounts();
  document.getElementById('roomCountText').textContent = `${state.rooms.length} data`;
  document.getElementById('roomOverviewGrid').innerHTML = `
    <div class="room-overview-card ok"><strong>${counts.bersih}</strong><span>Bersih dan siap check in</span></div>
    <div class="room-overview-card danger"><strong>${counts.terisi}</strong><span>Terisi / In House</span></div>
    <div class="room-overview-card warn"><strong>${counts.kotor}</strong><span>Kotor setelah check out</span></div>
    <div class="room-overview-card muted"><strong>${counts.rusak}</strong><span>Rusak / tidak bisa dipakai</span></div>`;
}

function renderRooms() {
  document.getElementById('roomTable').innerHTML = state.rooms.length
    ? state.rooms.map((room) => {
      const occupant = getRoomOccupant(room.id);
      const disabled = occupant ? 'disabled' : '';
      return `<tr>
        <td>${room.roomNo}</td><td>${room.bedCode || '-'}</td><td>${room.type}</td><td>${statusBadge(room.status)}</td><td>${occupant ? occupant.name : '-'}</td>
        <td>
          <select class="status-select" ${disabled} onchange="changeRoomStatus('${room.id}', this.value)">
            ${ROOM_STATUSES.map((status) => `<option value="${status}" ${normalizeRoomStatus(room.status) === status ? 'selected' : ''}>${status}</option>`).join('')}
          </select>
        </td>
      </tr>`;
    }).join('')
    : emptyRow(6, 'Belum ada data kamar');
}

function renderBrokenRooms() {
  const rows = state.rooms.filter((room) => normalizeRoomStatus(room.status) === 'rusak');
  document.getElementById('brokenRoomCountText').textContent = `${rows.length} data`;
  document.getElementById('brokenRoomTable').innerHTML = rows.length
    ? rows.map((room) => `<tr><td>${room.roomNo}</td><td>${room.bedCode || '-'}</td><td>${room.type}</td><td>${room.building || '-'}</td><td>${room.note || '-'}</td><td><button class="secondary-btn no-margin" onclick="changeRoomStatus('${room.id}', 'bersih')">Set Bersih</button></td></tr>`).join('')
    : emptyRow(6, 'Tidak ada kamar rusak');
}

function renderEmployees() {
  document.getElementById('employeeCountText').textContent = `${state.employees.length} data`;
  document.getElementById('employeeTable').innerHTML = state.employees.length
    ? state.employees.map((employee) => `<tr><td>${employee.name}</td><td>${employee.nik}</td><td>${employee.level}</td><td>${employee.position}</td><td>${employee.office}</td><td>${employee.phone || '-'}</td></tr>`).join('')
    : emptyRow(6, 'Belum ada data karyawan');
  document.getElementById('employeeNames').innerHTML = state.employees.map((employee) => `<option value="${employee.name}"></option>`).join('');
}

function renderInhouseCards() {
  const activeGuests = getActiveGuests();
  document.getElementById('inhouseCountText').textContent = `${activeGuests.length} orang`;
  document.getElementById('inhouseCards').innerHTML = activeGuests.length
    ? activeGuests.map((guest) => {
      const room = getGuestRoom(guest);
      const employee = getEmployeeById(guest.employeeId) || {};
      return `<article class="guest-card">
        <div class="guest-card-head"><div><h3>${guest.name}</h3><p>${roomLabel(room)} • ${guest.office}</p></div>${badge(guest.status, 'danger')}</div>
        <div class="guest-info">
          <span><b>Jabatan</b>${employee.level || guest.level || '-'}</span><span><b>Posisi</b>${employee.position || guest.position || '-'}</span>
          <span><b>Tgl CI</b>${guest.checkinDate}</span><span><b>Lama Menginap</b>${nightsSince(guest.checkinDate)} hari</span>
          <span><b>Keperluan</b>${guest.purpose}</span><span><b>Makan</b>${guest.mealEligible}</span>
        </div>
        ${guest.note ? `<p class="note-text">${guest.note}</p>` : ''}
        <div class="card-actions"><button class="secondary-btn no-margin" onclick="editGuest('${guest.id}')">Edit</button><button class="secondary-btn no-margin" onclick="updateGuestNote('${guest.id}')">Catatan</button><button class="danger-btn" onclick="checkoutGuest('${guest.id}')">Check Out</button></div>
      </article>`;
    }).join('')
    : '<div class="empty-card">Belum ada penghuni In House.</div>';
}

function renderMealQuickList() {
  const guests = getActiveGuests().filter((guest) => guest.mealEligible === 'Ya');
  const selectedDate = document.getElementById('mealQuickDate').value || todayIso();
  document.getElementById('mealQuickList').innerHTML = guests.length
    ? guests.map((guest) => {
      const room = getGuestRoom(guest);
      return `<div class="meal-row"><div><strong>${guest.name}</strong><p>${roomLabel(room)} • ${guest.office}</p></div><div class="meal-buttons">${['Pagi', 'Siang', 'Malam'].map((type) => {
        const done = state.meals.some((meal) => meal.guestId === guest.id && meal.date === selectedDate && meal.type === type);
        return `<button class="meal-btn ${done ? 'done' : ''}" onclick="quickMeal('${guest.id}', '${type}')">${type}${done ? ' ✓' : ''}</button>`;
      }).join('')}</div></div>`;
    }).join('')
    : '<div class="empty-card">Belum ada penghuni yang dapat makan.</div>';
}

function renderMealReport() {
  const selectedDate = document.getElementById('mealReportDate').value;
  const rows = state.meals.filter((meal) => !selectedDate || meal.date === selectedDate);
  document.getElementById('mealReportTable').innerHTML = rows.length
    ? rows.slice().reverse().map((meal) => `<tr><td>${meal.date}</td><td>${meal.guestName}</td><td>${meal.roomLabel}</td><td>${meal.office}</td><td>${meal.type}</td><td>${meal.time}</td></tr>`).join('')
    : emptyRow(6, 'Belum ada data absen makan');
}

function guestReportRows() {
  const filter = document.getElementById('guestReportStatus').value;
  return state.guests.filter((guest) => filter === 'all' || guest.status === filter).map((guest) => {
    const room = getGuestRoom(guest);
    const employee = getEmployeeById(guest.employeeId) || {};
    return { status: guest.status, nama: guest.name, nik: guest.nik || employee.nik || '', jabatan: employee.level || guest.level || '', posisi: employee.position || guest.position || '', kamar: roomLabel(room), office: guest.office, keperluan: guest.purpose, dapat_makan: guest.mealEligible, tanggal_ci: guest.checkinDate, tanggal_co: guest.checkoutDate || '', lama_menginap: `${nightsSince(guest.checkinDate, guest.checkoutDate)} hari`, catatan: guest.note || '' };
  });
}

function renderGuestReport() {
  const rows = guestReportRows();
  document.getElementById('guestReportTable').innerHTML = rows.length
    ? rows.map((row) => `<tr><td>${badge(row.status, row.status === 'Check Out' ? 'muted' : 'danger')}</td><td>${row.nama}</td><td>${row.nik}</td><td>${row.jabatan}</td><td>${row.posisi}</td><td>${row.kamar}</td><td>${row.office}</td><td>${row.keperluan}</td><td>${row.dapat_makan}</td><td>${row.tanggal_ci}</td><td>${row.tanggal_co || '-'}</td><td>${row.lama_menginap}</td></tr>`).join('')
    : emptyRow(12, 'Belum ada data laporan tamu');
}

function renderAll() {
  syncRoomStatusesFromGuests();
  renderDashboard();
  renderRoomOptions();
  renderPurposeOptions();
  renderRoomOverview();
  renderRooms();
  renderBrokenRooms();
  renderEmployees();
  renderInhouseCards();
  renderMealQuickList();
  renderMealReport();
  renderGuestReport();
  handleGuestNameCheck();
}

function createOrUpdateEmployee(employee) {
  const existingIndex = state.employees.findIndex((item) => normalizeText(item.nik) === normalizeText(employee.nik) || normalizeName(item.name) === normalizeName(employee.name));
  if (existingIndex >= 0) { state.employees[existingIndex] = { ...state.employees[existingIndex], ...employee }; return state.employees[existingIndex]; }
  const newEmployee = { id: crypto.randomUUID(), ...employee }; state.employees.push(newEmployee); return newEmployee;
}

function createOrUpdateRoom(room) {
  const existingIndex = state.rooms.findIndex((item) => normalizeText(item.roomNo) === normalizeText(room.roomNo) && normalizeText(item.bedCode).toUpperCase() === normalizeText(room.bedCode).toUpperCase());
  room.status = normalizeRoomStatus(room.status);
  if (existingIndex >= 0) { state.rooms[existingIndex] = { ...state.rooms[existingIndex], ...room }; return state.rooms[existingIndex]; }
  const newRoom = { id: crypto.randomUUID(), ...room }; state.rooms.push(newRoom); return newRoom;
}

function bindForms() {
  document.getElementById('roomForm').addEventListener('submit', (event) => {
    event.preventDefault();
    createOrUpdateRoom({ roomNo: normalizeText(roomNo.value), bedCode: normalizeText(bedCode.value).toUpperCase(), capacity: Number(roomCapacity.value || 1), type: roomType.value, status: roomStatus.value, floor: '', building: normalizeText(roomBuilding.value), note: '' });
    saveData(STORAGE_KEYS.rooms, state.rooms); event.target.reset(); roomCapacity.value = 1; renderAll();
  });

  document.getElementById('employeeForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const employee = createOrUpdateEmployee({ name: normalizeText(employeeName.value), nik: normalizeText(employeeNik.value), level: employeeLevel.value, position: normalizeText(employeePosition.value), office: normalizeText(employeeOffice.value), phone: normalizeText(employeePhone.value) });
    saveData(STORAGE_KEYS.employees, state.employees);
    if (pendingCheckinEmployeeName && normalizeName(employee.name) === normalizeName(pendingCheckinEmployeeName)) { fillCheckinEmployee(employee); pendingCheckinEmployeeName = ''; event.target.reset(); renderAll(); showPage('checkin', 'Check In'); alert('Data karyawan berhasil ditambahkan dan otomatis dipakai di form check in.'); return; }
    event.target.reset(); renderAll();
  });

  document.getElementById('checkinForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const roomId = guestRoom.value;
    const room = state.rooms.find((item) => item.id === roomId);
    const employee = findEmployeeByName(guestName.value);
    if (!room || normalizeRoomStatus(room.status) !== 'bersih' || isRoomOccupied(room.id)) return alert('Kamar hanya bisa check in jika status bersih dan belum ditempati.');
    if (!employee) { handleGuestNameCheck(); return alert('Nama karyawan belum ada di database. Tambahkan karyawan dulu.'); }
    const purpose = normalizeText(guestPurpose.value); addPurposeIfNew(purpose);
    const guestData = { employeeId: employee.id, name: employee.name, nik: employee.nik, level: employee.level, position: employee.position, roomId, office: normalizeText(guestOffice.value), purpose, mealEligible: guestMealEligible.value, checkinDate: guestCheckinDate.value, checkoutDate: '', note: normalizeText(guestNote.value), status: 'In House', updatedAt: new Date().toISOString() };
    if (editingGuestId) { const index = state.guests.findIndex((guest) => guest.id === editingGuestId); if (index >= 0) state.guests[index] = { ...state.guests[index], ...guestData }; editingGuestId = null; }
    else state.guests.push({ id: crypto.randomUUID(), ...guestData, createdAt: new Date().toISOString() });
    room.status = 'terisi';
    saveData(STORAGE_KEYS.guests, state.guests); saveData(STORAGE_KEYS.rooms, state.rooms); event.target.reset(); setDefaultDates(); renderAll(); showPage('inhouse', 'In House');
  });

  savePurposeBtn.addEventListener('click', () => { addPurposeIfNew(guestPurpose.value); renderPurposeOptions(); alert('Keperluan berhasil disimpan ke pilihan.'); });
  mealQuickDate.addEventListener('change', renderMealQuickList); mealReportDate.addEventListener('change', renderMealReport); guestReportStatus.addEventListener('change', renderGuestReport);
  guestName.addEventListener('input', handleGuestNameCheck); guestName.addEventListener('change', handleGuestNameCheck); goAddEmployeeBtn.addEventListener('click', goAddEmployeeFromCheckin);
  roomFile.addEventListener('change', (event) => handleFileUpload(event, 'rooms')); employeeFile.addEventListener('change', (event) => handleFileUpload(event, 'employees'));
  downloadRoomTemplate.addEventListener('click', () => downloadWorkbook('template-upload-kamar-mess.xlsx', roomTemplateRows(), 'Template Kamar'));
  downloadRoomData.addEventListener('click', () => downloadWorkbook('data-kamar-mess.xlsx', roomExportRows(), 'Data Kamar'));
  downloadEmployeeTemplate.addEventListener('click', () => downloadWorkbook('template-upload-karyawan-mess.xlsx', employeeTemplateRows(), 'Template Karyawan'));
  downloadEmployeeData.addEventListener('click', () => downloadWorkbook('data-karyawan-mess.xlsx', employeeExportRows(), 'Data Karyawan'));
  downloadGuestReport.addEventListener('click', () => downloadWorkbook('laporan-tamu-mess.xlsx', guestReportRows(), 'Laporan Tamu'));
}

window.changeRoomStatus = function changeRoomStatus(roomId, status) {
  const room = state.rooms.find((item) => item.id === roomId);
  if (!room) return;
  if (isRoomOccupied(roomId)) { renderAll(); return alert('Kamar masih ditempati. Check out penghuni dulu sebelum ubah status kamar.'); }
  room.status = normalizeRoomStatus(status); saveData(STORAGE_KEYS.rooms, state.rooms); renderAll();
};

window.quickMeal = function quickMeal(guestId, type) {
  const guest = state.guests.find((item) => item.id === guestId); if (!guest) return;
  const date = mealQuickDate.value || todayIso();
  const duplicate = state.meals.some((meal) => meal.guestId === guestId && meal.date === date && meal.type === type);
  if (duplicate) return alert(`${guest.name} sudah absen makan ${type} pada tanggal ini.`);
  const room = getGuestRoom(guest);
  state.meals.push({ id: crypto.randomUUID(), guestId, guestName: guest.name, roomLabel: roomLabel(room), office: guest.office, type, date, time: currentTime(), createdAt: new Date().toISOString() });
  saveData(STORAGE_KEYS.meals, state.meals); renderAll();
};

window.checkoutGuest = function checkoutGuest(guestId) {
  const guest = state.guests.find((item) => item.id === guestId); if (!guest) return;
  if (!confirm(`Check out ${guest.name} hari ini? Kamar otomatis menjadi kotor.`)) return;
  guest.status = 'Check Out'; guest.checkoutDate = todayIso(); guest.updatedAt = new Date().toISOString();
  const room = getGuestRoom(guest); if (room) room.status = 'kotor';
  saveData(STORAGE_KEYS.guests, state.guests); saveData(STORAGE_KEYS.rooms, state.rooms); renderAll();
};

window.updateGuestNote = function updateGuestNote(guestId) {
  const guest = state.guests.find((item) => item.id === guestId); if (!guest) return;
  const note = prompt(`Catatan untuk ${guest.name}`, guest.note || ''); if (note === null) return;
  guest.note = normalizeText(note); saveData(STORAGE_KEYS.guests, state.guests); renderAll();
};

window.editGuest = function editGuest(guestId) {
  const guest = state.guests.find((item) => item.id === guestId); if (!guest) return;
  editingGuestId = guest.id; fillCheckinEmployee({ name: guest.name, nik: guest.nik, level: guest.level, position: guest.position, office: guest.office });
  guestPurpose.value = guest.purpose || ''; guestMealEligible.value = guest.mealEligible || 'Ya'; guestCheckinDate.value = guest.checkinDate || todayIso(); guestNote.value = guest.note || '';
  renderRoomOptions(); const currentRoom = getGuestRoom(guest); const option = document.createElement('option'); option.value = guest.roomId; option.textContent = `${roomLabel(currentRoom)} - ${currentRoom?.type || ''} (current)`; guestRoom.prepend(option); guestRoom.value = guest.roomId; showPage('checkin', 'Edit In House');
};

function handleGuestNameCheck() {
  const name = normalizeText(guestName.value); const notice = newEmployeeNotice;
  if (!name) return notice.classList.add('hidden');
  const employee = findEmployeeByName(name);
  if (employee) { fillCheckinEmployee(employee); notice.classList.add('hidden'); return; }
  guestNik.value = ''; guestLevel.value = ''; guestPosition.value = ''; notice.classList.remove('hidden');
}

function fillCheckinEmployee(employee) { guestName.value = employee.name || ''; guestNik.value = employee.nik || ''; guestLevel.value = employee.level || ''; guestPosition.value = employee.position || ''; guestOffice.value = employee.office || ''; }
function goAddEmployeeFromCheckin() { pendingCheckinEmployeeName = normalizeText(guestName.value); employeeName.value = pendingCheckinEmployeeName; employeeNik.value = normalizeText(guestNik.value); employeeOffice.value = normalizeText(guestOffice.value); showPage('employees', 'Database Karyawan'); employeeNik.focus(); }

function roomTemplateRows() { return [{ room_no: '101', bed_code: 'A', capacity: 1, type: 'Sharing 6', status: 'bersih', floor: '1', building: 'Mess A', note: '' }, { room_no: '101', bed_code: 'B', capacity: 1, type: 'Sharing 6', status: 'bersih', floor: '1', building: 'Mess A', note: '' }, { room_no: '102', bed_code: '', capacity: 1, type: 'Single', status: 'bersih', floor: '1', building: 'Mess A', note: '' }, { room_no: '201', bed_code: 'A', capacity: 1, type: 'Sharing 3', status: 'bersih', floor: '2', building: 'Mess A', note: '' }]; }
function employeeTemplateRows() { return [{ nama: 'Andi Saputra', nik: 'EMP001', jabatan: 'Staff', posisi: 'Cleaning Service Officer', office: 'Office Balikpapan', no_hp: '081234567890' }]; }
function roomExportRows() { return state.rooms.map((room) => ({ room_no: room.roomNo, bed_code: room.bedCode || '', capacity: Number(room.capacity || 1), type: room.type || 'Single', status: normalizeRoomStatus(room.status), floor: room.floor || '', building: room.building || '', note: room.note || '' })); }
function employeeExportRows() { return state.employees.map((employee) => ({ nama: employee.name, nik: employee.nik, jabatan: employee.level, posisi: employee.position, office: employee.office, no_hp: employee.phone || '' })); }

function downloadWorkbook(filename, rows, sheetName) { if (!window.XLSX) return downloadCsv(filename.replace('.xlsx', '.csv'), rows); const worksheet = XLSX.utils.json_to_sheet(rows); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, sheetName); XLSX.writeFile(workbook, filename); }
function downloadCsv(filename, rows) { const headers = Object.keys(rows[0] || {}); const csvRows = [headers.join(',')].concat(rows.map((row) => headers.map((header) => `"${String(row[header] || '').replaceAll('"', '""')}"`).join(','))); const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
function handleFileUpload(event, type) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const rows = file.name.toLowerCase().endsWith('.csv') ? parseCsv(String(reader.result)) : parseExcel(reader.result); if (type === 'rooms') importRooms(rows); if (type === 'employees') importEmployees(rows); event.target.value = ''; renderAll(); } catch (error) { console.error(error); alert('File gagal dibaca. Pastikan header sesuai template.'); } }; if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file); else reader.readAsArrayBuffer(file); }
function parseExcel(arrayBuffer) { if (!window.XLSX) throw new Error('Library XLSX belum tersedia'); const workbook = XLSX.read(arrayBuffer, { type: 'array' }); const firstSheet = workbook.Sheets[workbook.SheetNames[0]]; return XLSX.utils.sheet_to_json(firstSheet, { defval: '' }); }
function parseCsv(content) { const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); const headers = lines.shift().split(',').map((header) => normalizeText(header).replace(/^"|"$/g, '')); return lines.map((line) => { const values = line.split(',').map((value) => normalizeText(value).replace(/^"|"$/g, '')); return headers.reduce((row, header, index) => { row[header] = values[index] || ''; return row; }, {}); }); }
function importRooms(rows) { let count = 0; rows.forEach((row) => { const roomNo = normalizeText(row.room_no || row.no_kamar || row.kamar); if (!roomNo) return; createOrUpdateRoom({ roomNo, bedCode: normalizeText(row.bed_code || row.kode_bed || row.bed).toUpperCase(), capacity: Number(row.capacity || row.kapasitas || 1), type: normalizeText(row.type || row.tipe || 'Single'), status: normalizeRoomStatus(row.status || 'bersih'), floor: normalizeText(row.floor || row.lantai), building: normalizeText(row.building || row.gedung), note: normalizeText(row.note || row.catatan) }); count += 1; }); saveData(STORAGE_KEYS.rooms, state.rooms); alert(`${count} data kamar berhasil diupload/update.`); }
function importEmployees(rows) { let count = 0; rows.forEach((row) => { const name = normalizeText(row.nama || row.name || row.employee_name); const nik = normalizeText(row.nik || row.NIK); if (!name || !nik) return; createOrUpdateEmployee({ name, nik, level: normalizeText(row.jabatan || row.level || 'Staff'), position: normalizeText(row.posisi || row.position), office: normalizeText(row.office || row.nama_office), phone: normalizeText(row.no_hp || row.phone || row.nohp) }); count += 1; }); saveData(STORAGE_KEYS.employees, state.employees); alert(`${count} data karyawan berhasil diupload/update.`); }
function setDefaultDates() { guestCheckinDate.value = todayIso(); mealQuickDate.value = todayIso(); mealReportDate.value = todayIso(); }
function migrateLocalRoomStatuses() { state.rooms.forEach((room) => { room.status = normalizeRoomStatus(room.status); }); syncRoomStatusesFromGuests(); }
function init() { todayText.textContent = formatDate(); state.purposes = Array.from(new Set([...DEFAULT_PURPOSES, ...state.purposes])); saveData(STORAGE_KEYS.purposes, state.purposes); migrateLocalRoomStatuses(); setDefaultDates(); renderNavigation(); bindForms(); renderAll(); }
init();
