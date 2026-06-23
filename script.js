const STORAGE_KEYS = {
  rooms: 'messapp_rooms',
  employees: 'messapp_employees',
  guests: 'messapp_guests',
  meals: 'messapp_meals',
  purposes: 'messapp_purposes',
};

const DEFAULT_PURPOSES = ['Cuti', 'On Site', 'Dinas', 'New Hire Onsite', 'New Hire MCU', 'MCU Tahunan', 'Long Stay'];

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
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'A', capacity: 1, type: 'Sharing 4', status: 'available', floor: '1', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'B', capacity: 1, type: 'Sharing 4', status: 'available', floor: '1', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'C', capacity: 1, type: 'Sharing 4', status: 'available', floor: '1', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'D', capacity: 1, type: 'Sharing 4', status: 'available', floor: '1', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '102', bedCode: '', capacity: 1, type: 'Single', status: 'available', floor: '1', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '201', bedCode: 'A', capacity: 1, type: 'Sharing 3', status: 'available', floor: '2', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '201', bedCode: 'B', capacity: 1, type: 'Sharing 3', status: 'available', floor: '2', building: 'Mess A', note: '' },
    { id: crypto.randomUUID(), roomNo: '201', bedCode: 'C', capacity: 1, type: 'Sharing 3', status: 'available', floor: '2', building: 'Mess A', note: '' },
  ];
}

function roomLabel(room) { return room?.bedCode ? `${room.roomNo}${room.bedCode}` : room?.roomNo || '-'; }
function getActiveGuests() { return state.guests.filter((guest) => guest.status === 'In House'); }
function getCiGuests() { return state.guests.filter((guest) => guest.status === 'CI'); }
function getReportGuests() { return state.guests; }
function getGuestRoom(guest) { return state.rooms.find((room) => room.id === guest.roomId); }
function getEmployeeById(id) { return state.employees.find((employee) => employee.id === id); }
function getRoomOccupant(roomId) { return getActiveGuests().find((guest) => guest.roomId === roomId); }
function isRoomOccupied(roomId) { return Boolean(getRoomOccupant(roomId)); }
function findEmployeeByName(name) { return state.employees.find((employee) => normalizeName(employee.name) === normalizeName(name)); }

function emptyRow(colspan, text) { return `<tr><td class="empty" colspan="${colspan}">${text}</td></tr>`; }
function badge(text, type = 'ok') { return `<span class="badge ${type}">${text}</span>`; }
function statusBadge(status) {
  if (status === 'occupied' || status === 'In House') return badge(status, 'danger');
  if (status === 'maintenance' || status === 'CI') return badge(status, 'warn');
  if (status === 'inactive') return badge(status, 'muted');
  return badge(status, 'ok');
}

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

function renderNavigation() {
  document.querySelectorAll('.nav-btn').forEach((button) => button.addEventListener('click', () => showPage(button.dataset.page, button.textContent)));
}

function updateRoomStatusesFromGuests() {
  state.rooms.forEach((room) => {
    if (room.status === 'maintenance' || room.status === 'inactive') return;
    room.status = isRoomOccupied(room.id) ? 'occupied' : 'available';
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

function renderDashboard() {
  updateRoomStatusesFromGuests();
  const counts = {
    available: state.rooms.filter((room) => room.status === 'available').length,
    occupied: state.rooms.filter((room) => room.status === 'occupied').length,
    maintenance: state.rooms.filter((room) => room.status === 'maintenance').length,
    inactive: state.rooms.filter((room) => room.status === 'inactive').length,
  };
  const todaysMeals = state.meals.filter((meal) => meal.date === todayIso());

  document.getElementById('totalRooms').textContent = state.rooms.length;
  document.getElementById('availableBeds').textContent = counts.available;
  document.getElementById('occupiedBeds').textContent = counts.occupied;
  document.getElementById('maintenanceBeds').textContent = counts.maintenance;
  document.getElementById('roomStatusText').textContent = `${state.rooms.length} kamar/bed`;
  document.getElementById('roomStatusCards').innerHTML = `
    <div class="mini-status ok"><strong>${counts.available}</strong><span>Available</span></div>
    <div class="mini-status danger"><strong>${counts.occupied}</strong><span>Occupied</span></div>
    <div class="mini-status warn"><strong>${counts.maintenance}</strong><span>Maintenance</span></div>
    <div class="mini-status muted"><strong>${counts.inactive}</strong><span>Inactive</span></div>
  `;

  document.getElementById('mealTodayCount').textContent = `${todaysMeals.length} absen`;
  document.getElementById('mealTodayTable').innerHTML = todaysMeals.length
    ? todaysMeals.slice(-10).reverse().map((meal) => `<tr><td>${meal.guestName}</td><td>${meal.type}</td><td>${meal.time}</td></tr>`).join('')
    : emptyRow(3, 'Belum ada absen makan hari ini');
}

function renderRoomOptions() {
  const availableRooms = state.rooms.filter((room) => room.status === 'available' && !isRoomOccupied(room.id));
  document.getElementById('guestRoom').innerHTML = availableRooms.length
    ? availableRooms.map((room) => `<option value="${room.id}">${roomLabel(room)} - ${room.type}</option>`).join('')
    : '<option value="">Tidak ada kamar available</option>';
}

function renderPurposeOptions() {
  document.getElementById('purposeOptions').innerHTML = state.purposes.map((purpose) => `<option value="${purpose}"></option>`).join('');
}

function renderRooms() {
  document.getElementById('roomCountText').textContent = `${state.rooms.length} data`;
  document.getElementById('roomTable').innerHTML = state.rooms.length
    ? state.rooms.map((room) => {
      const occupant = getRoomOccupant(room.id);
      return `<tr><td>${room.roomNo}</td><td>${room.bedCode || '-'}</td><td>${room.type}</td><td>${statusBadge(room.status)}</td><td>${occupant ? occupant.name : '-'}</td></tr>`;
    }).join('')
    : emptyRow(5, 'Belum ada data kamar');
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
      return `
        <article class="guest-card">
          <div class="guest-card-head">
            <div><h3>${guest.name}</h3><p>${roomLabel(room)} • ${guest.office}</p></div>
            ${statusBadge(guest.status)}
          </div>
          <div class="guest-info">
            <span><b>Jabatan</b>${employee.level || guest.level || '-'}</span>
            <span><b>Posisi</b>${employee.position || guest.position || '-'}</span>
            <span><b>Tgl CI</b>${guest.checkinDate}</span>
            <span><b>Lama Menginap</b>${nightsSince(guest.checkinDate)} hari</span>
            <span><b>Keperluan</b>${guest.purpose}</span>
            <span><b>Makan</b>${guest.mealEligible}</span>
          </div>
          ${guest.note ? `<p class="note-text">${guest.note}</p>` : ''}
          <div class="card-actions">
            <button class="secondary-btn no-margin" onclick="editGuest('${guest.id}')">Edit</button>
            <button class="secondary-btn no-margin" onclick="updateGuestNote('${guest.id}')">Catatan</button>
            <button class="danger-btn" onclick="checkoutGuest('${guest.id}')">Check Out</button>
          </div>
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
      return `
        <div class="meal-row">
          <div><strong>${guest.name}</strong><p>${roomLabel(room)} • ${guest.office}</p></div>
          <div class="meal-buttons">
            ${['Pagi', 'Siang', 'Malam'].map((type) => {
              const done = state.meals.some((meal) => meal.guestId === guest.id && meal.date === selectedDate && meal.type === type);
              return `<button class="meal-btn ${done ? 'done' : ''}" onclick="quickMeal('${guest.id}', '${type}')">${type}${done ? ' ✓' : ''}</button>`;
            }).join('')}
          </div>
        </div>`;
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
  return getReportGuests()
    .filter((guest) => filter === 'all' || guest.status === filter)
    .map((guest) => {
      const room = getGuestRoom(guest);
      const employee = getEmployeeById(guest.employeeId) || {};
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
        lama_menginap: `${nightsSince(guest.checkinDate, guest.checkoutDate)} hari`,
        catatan: guest.note || '',
      };
    });
}

function renderGuestReport() {
  const rows = guestReportRows();
  document.getElementById('guestReportTable').innerHTML = rows.length
    ? rows.map((row) => `<tr><td>${statusBadge(row.status)}</td><td>${row.nama}</td><td>${row.nik}</td><td>${row.jabatan}</td><td>${row.posisi}</td><td>${row.kamar}</td><td>${row.office}</td><td>${row.keperluan}</td><td>${row.dapat_makan}</td><td>${row.tanggal_ci}</td><td>${row.tanggal_co || '-'}</td><td>${row.lama_menginap}</td></tr>`).join('')
    : emptyRow(12, 'Belum ada data laporan tamu');
}

function renderAll() {
  updateRoomStatusesFromGuests();
  renderDashboard();
  renderRoomOptions();
  renderPurposeOptions();
  renderRooms();
  renderEmployees();
  renderInhouseCards();
  renderMealQuickList();
  renderMealReport();
  renderGuestReport();
  handleGuestNameCheck();
}

function createOrUpdateEmployee(employee) {
  const existingIndex = state.employees.findIndex((item) => normalizeText(item.nik) === normalizeText(employee.nik) || normalizeName(item.name) === normalizeName(employee.name));
  if (existingIndex >= 0) {
    state.employees[existingIndex] = { ...state.employees[existingIndex], ...employee };
    return state.employees[existingIndex];
  }
  const newEmployee = { id: crypto.randomUUID(), ...employee };
  state.employees.push(newEmployee);
  return newEmployee;
}

function createOrUpdateRoom(room) {
  const existingIndex = state.rooms.findIndex((item) => normalizeText(item.roomNo) === normalizeText(room.roomNo) && normalizeText(item.bedCode).toUpperCase() === normalizeText(room.bedCode).toUpperCase());
  if (existingIndex >= 0) {
    state.rooms[existingIndex] = { ...state.rooms[existingIndex], ...room };
    return state.rooms[existingIndex];
  }
  const newRoom = { id: crypto.randomUUID(), ...room };
  state.rooms.push(newRoom);
  return newRoom;
}

function bindForms() {
  document.getElementById('roomForm').addEventListener('submit', (event) => {
    event.preventDefault();
    createOrUpdateRoom({
      roomNo: normalizeText(document.getElementById('roomNo').value),
      bedCode: normalizeText(document.getElementById('bedCode').value).toUpperCase(),
      capacity: Number(document.getElementById('roomCapacity').value || 1),
      type: document.getElementById('roomType').value,
      status: document.getElementById('roomStatus').value,
      floor: '',
      building: normalizeText(document.getElementById('roomBuilding').value),
      note: '',
    });
    saveData(STORAGE_KEYS.rooms, state.rooms);
    event.target.reset();
    document.getElementById('roomCapacity').value = 1;
    renderAll();
  });

  document.getElementById('employeeForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const employee = createOrUpdateEmployee({
      name: normalizeText(document.getElementById('employeeName').value),
      nik: normalizeText(document.getElementById('employeeNik').value),
      level: document.getElementById('employeeLevel').value,
      position: normalizeText(document.getElementById('employeePosition').value),
      office: normalizeText(document.getElementById('employeeOffice').value),
      phone: normalizeText(document.getElementById('employeePhone').value),
    });
    saveData(STORAGE_KEYS.employees, state.employees);
    if (pendingCheckinEmployeeName && normalizeName(employee.name) === normalizeName(pendingCheckinEmployeeName)) {
      fillCheckinEmployee(employee);
      pendingCheckinEmployeeName = '';
      event.target.reset();
      renderAll();
      showPage('checkin', 'Check In');
      alert('Data karyawan berhasil ditambahkan dan otomatis dipakai di form check in.');
      return;
    }
    event.target.reset();
    renderAll();
  });

  document.getElementById('checkinForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const roomId = document.getElementById('guestRoom').value;
    const employee = findEmployeeByName(document.getElementById('guestName').value);
    if (!roomId) return alert('Tidak ada kamar/bed available.');
    if (!employee) { handleGuestNameCheck(); return alert('Nama karyawan belum ada di database. Tambahkan karyawan dulu.'); }

    const purpose = normalizeText(document.getElementById('guestPurpose').value);
    addPurposeIfNew(purpose);

    const guestData = {
      employeeId: employee.id,
      name: employee.name,
      nik: employee.nik,
      level: employee.level,
      position: employee.position,
      roomId,
      office: normalizeText(document.getElementById('guestOffice').value),
      purpose,
      mealEligible: document.getElementById('guestMealEligible').value,
      checkinDate: document.getElementById('guestCheckinDate').value,
      checkoutDate: '',
      note: normalizeText(document.getElementById('guestNote').value),
      status: 'In House',
      updatedAt: new Date().toISOString(),
    };

    if (editingGuestId) {
      const index = state.guests.findIndex((guest) => guest.id === editingGuestId);
      if (index >= 0) state.guests[index] = { ...state.guests[index], ...guestData };
      editingGuestId = null;
    } else {
      state.guests.push({ id: crypto.randomUUID(), ...guestData, status: 'CI', createdAt: new Date().toISOString() });
      const newGuest = state.guests[state.guests.length - 1];
      newGuest.status = 'In House';
    }

    saveData(STORAGE_KEYS.guests, state.guests);
    event.target.reset();
    setDefaultDates();
    renderAll();
    showPage('inhouse', 'In House');
  });

  document.getElementById('savePurposeBtn').addEventListener('click', () => {
    addPurposeIfNew(document.getElementById('guestPurpose').value);
    renderPurposeOptions();
    alert('Keperluan berhasil disimpan ke pilihan.');
  });

  document.getElementById('mealQuickDate').addEventListener('change', renderMealQuickList);
  document.getElementById('mealReportDate').addEventListener('change', renderMealReport);
  document.getElementById('guestReportStatus').addEventListener('change', renderGuestReport);
  document.getElementById('guestName').addEventListener('input', handleGuestNameCheck);
  document.getElementById('guestName').addEventListener('change', handleGuestNameCheck);
  document.getElementById('goAddEmployeeBtn').addEventListener('click', goAddEmployeeFromCheckin);
  document.getElementById('roomFile').addEventListener('change', (event) => handleFileUpload(event, 'rooms'));
  document.getElementById('employeeFile').addEventListener('change', (event) => handleFileUpload(event, 'employees'));
  document.getElementById('downloadRoomTemplate').addEventListener('click', () => downloadWorkbook('template-upload-kamar-mess.xlsx', roomTemplateRows(), 'Template Kamar'));
  document.getElementById('downloadRoomData').addEventListener('click', () => downloadWorkbook('data-kamar-mess.xlsx', roomExportRows(), 'Data Kamar'));
  document.getElementById('downloadEmployeeTemplate').addEventListener('click', () => downloadWorkbook('template-upload-karyawan-mess.xlsx', employeeTemplateRows(), 'Template Karyawan'));
  document.getElementById('downloadEmployeeData').addEventListener('click', () => downloadWorkbook('data-karyawan-mess.xlsx', employeeExportRows(), 'Data Karyawan'));
  document.getElementById('downloadGuestReport').addEventListener('click', () => downloadWorkbook('laporan-tamu-mess.xlsx', guestReportRows(), 'Laporan Tamu'));
}

window.quickMeal = function quickMeal(guestId, type) {
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest) return;
  const date = document.getElementById('mealQuickDate').value || todayIso();
  const duplicate = state.meals.some((meal) => meal.guestId === guestId && meal.date === date && meal.type === type);
  if (duplicate) return alert(`${guest.name} sudah absen makan ${type} pada tanggal ini.`);
  const room = getGuestRoom(guest);
  state.meals.push({ id: crypto.randomUUID(), guestId, guestName: guest.name, roomLabel: roomLabel(room), office: guest.office, type, date, time: currentTime(), createdAt: new Date().toISOString() });
  saveData(STORAGE_KEYS.meals, state.meals);
  renderAll();
};

window.checkoutGuest = function checkoutGuest(guestId) {
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest) return;
  const confirmed = confirm(`Check out ${guest.name} hari ini?`);
  if (!confirmed) return;
  guest.status = 'Check Out';
  guest.checkoutDate = todayIso();
  guest.updatedAt = new Date().toISOString();
  saveData(STORAGE_KEYS.guests, state.guests);
  renderAll();
};

window.updateGuestNote = function updateGuestNote(guestId) {
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest) return;
  const note = prompt(`Catatan untuk ${guest.name}`, guest.note || '');
  if (note === null) return;
  guest.note = normalizeText(note);
  saveData(STORAGE_KEYS.guests, state.guests);
  renderAll();
};

window.editGuest = function editGuest(guestId) {
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest) return;
  editingGuestId = guest.id;
  document.getElementById('guestName').value = guest.name;
  document.getElementById('guestNik').value = guest.nik || '';
  document.getElementById('guestLevel').value = guest.level || '';
  document.getElementById('guestPosition').value = guest.position || '';
  document.getElementById('guestOffice').value = guest.office || '';
  document.getElementById('guestPurpose').value = guest.purpose || '';
  document.getElementById('guestMealEligible').value = guest.mealEligible || 'Ya';
  document.getElementById('guestCheckinDate').value = guest.checkinDate || todayIso();
  document.getElementById('guestNote').value = guest.note || '';
  renderRoomOptions();
  const currentRoomOption = document.createElement('option');
  const currentRoom = getGuestRoom(guest);
  currentRoomOption.value = guest.roomId;
  currentRoomOption.textContent = `${roomLabel(currentRoom)} - ${currentRoom?.type || ''} (current)`;
  document.getElementById('guestRoom').prepend(currentRoomOption);
  document.getElementById('guestRoom').value = guest.roomId;
  showPage('checkin', 'Edit In House');
};

function handleGuestNameCheck() {
  const name = normalizeText(document.getElementById('guestName').value);
  const notice = document.getElementById('newEmployeeNotice');
  if (!name) return notice.classList.add('hidden');
  const employee = findEmployeeByName(name);
  if (employee) {
    fillCheckinEmployee(employee);
    notice.classList.add('hidden');
    return;
  }
  document.getElementById('guestNik').value = '';
  document.getElementById('guestLevel').value = '';
  document.getElementById('guestPosition').value = '';
  notice.classList.remove('hidden');
}

function fillCheckinEmployee(employee) {
  document.getElementById('guestName').value = employee.name || '';
  document.getElementById('guestNik').value = employee.nik || '';
  document.getElementById('guestLevel').value = employee.level || '';
  document.getElementById('guestPosition').value = employee.position || '';
  document.getElementById('guestOffice').value = employee.office || '';
}

function goAddEmployeeFromCheckin() {
  const name = normalizeText(document.getElementById('guestName').value);
  pendingCheckinEmployeeName = name;
  document.getElementById('employeeName').value = name;
  document.getElementById('employeeNik').value = normalizeText(document.getElementById('guestNik').value);
  document.getElementById('employeeOffice').value = normalizeText(document.getElementById('guestOffice').value);
  showPage('employees', 'Database Karyawan');
  document.getElementById('employeeNik').focus();
}

function roomTemplateRows() {
  return [
    { room_no: '101', bed_code: 'A', capacity: 1, type: 'Sharing 6', status: 'available', floor: '1', building: 'Mess A', note: 'Contoh sharing 6' },
    { room_no: '101', bed_code: 'B', capacity: 1, type: 'Sharing 6', status: 'available', floor: '1', building: 'Mess A', note: 'Contoh sharing 6' },
    { room_no: '102', bed_code: '', capacity: 1, type: 'Single', status: 'available', floor: '1', building: 'Mess A', note: 'Contoh single' },
    { room_no: '201', bed_code: 'A', capacity: 1, type: 'Sharing 3', status: 'available', floor: '2', building: 'Mess A', note: 'Contoh sharing 3' },
  ];
}

function employeeTemplateRows() {
  return [
    { nama: 'Andi Saputra', nik: 'EMP001', jabatan: 'Staff', posisi: 'Cleaning Service Officer', office: 'Office Balikpapan', no_hp: '081234567890' },
    { nama: 'Budi Rahman', nik: 'EMP002', jabatan: 'Non Staff', posisi: 'Driver', office: 'Office Balikpapan', no_hp: '081234567891' },
    { nama: 'Citra Dewi', nik: 'EMP003', jabatan: 'Manager', posisi: 'Area Manager', office: 'Office Samarinda', no_hp: '081234567892' },
  ];
}

function roomExportRows() { return state.rooms.map((room) => ({ room_no: room.roomNo, bed_code: room.bedCode || '', capacity: Number(room.capacity || 1), type: room.type || 'Single', status: room.status || 'available', floor: room.floor || '', building: room.building || '', note: room.note || '' })); }
function employeeExportRows() { return state.employees.map((employee) => ({ nama: employee.name, nik: employee.nik, jabatan: employee.level, posisi: employee.position, office: employee.office, no_hp: employee.phone || '' })); }

function downloadWorkbook(filename, rows, sheetName) {
  if (!window.XLSX) return downloadCsv(filename.replace('.xlsx', '.csv'), rows);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

function downloadCsv(filename, rows) {
  const headers = Object.keys(rows[0] || {});
  const csvRows = [headers.join(',')].concat(rows.map((row) => headers.map((header) => `"${String(row[header] || '').replaceAll('"', '""')}"`).join(',')));
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function handleFileUpload(event, type) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = file.name.toLowerCase().endsWith('.csv') ? parseCsv(String(reader.result)) : parseExcel(reader.result);
      if (type === 'rooms') importRooms(rows);
      if (type === 'employees') importEmployees(rows);
      event.target.value = '';
      renderAll();
    } catch (error) {
      console.error(error);
      alert('File gagal dibaca. Pastikan header sesuai template.');
    }
  };
  if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

function parseExcel(arrayBuffer) {
  if (!window.XLSX) throw new Error('Library XLSX belum tersedia');
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headers = lines.shift().split(',').map((header) => normalizeText(header).replace(/^"|"$/g, ''));
  return lines.map((line) => {
    const values = line.split(',').map((value) => normalizeText(value).replace(/^"|"$/g, ''));
    return headers.reduce((row, header, index) => { row[header] = values[index] || ''; return row; }, {});
  });
}

function importRooms(rows) {
  let count = 0;
  rows.forEach((row) => {
    const roomNo = normalizeText(row.room_no || row.no_kamar || row.kamar);
    if (!roomNo) return;
    createOrUpdateRoom({
      roomNo,
      bedCode: normalizeText(row.bed_code || row.kode_bed || row.bed).toUpperCase(),
      capacity: Number(row.capacity || row.kapasitas || 1),
      type: normalizeText(row.type || row.tipe || 'Single'),
      status: normalizeText(row.status || 'available'),
      floor: normalizeText(row.floor || row.lantai),
      building: normalizeText(row.building || row.gedung),
      note: normalizeText(row.note || row.catatan),
    });
    count += 1;
  });
  saveData(STORAGE_KEYS.rooms, state.rooms);
  alert(`${count} data kamar berhasil diupload/update.`);
}

function importEmployees(rows) {
  let count = 0;
  rows.forEach((row) => {
    const name = normalizeText(row.nama || row.name || row.employee_name);
    const nik = normalizeText(row.nik || row.NIK);
    if (!name || !nik) return;
    createOrUpdateEmployee({ name, nik, level: normalizeText(row.jabatan || row.level || 'Staff'), position: normalizeText(row.posisi || row.position), office: normalizeText(row.office || row.nama_office), phone: normalizeText(row.no_hp || row.phone || row.nohp) });
    count += 1;
  });
  saveData(STORAGE_KEYS.employees, state.employees);
  alert(`${count} data karyawan berhasil diupload/update.`);
}

function setDefaultDates() {
  document.getElementById('guestCheckinDate').value = todayIso();
  document.getElementById('mealQuickDate').value = todayIso();
  document.getElementById('mealReportDate').value = todayIso();
}

function init() {
  document.getElementById('todayText').textContent = formatDate();
  state.purposes = Array.from(new Set([...DEFAULT_PURPOSES, ...state.purposes]));
  saveData(STORAGE_KEYS.purposes, state.purposes);
  setDefaultDates();
  renderNavigation();
  bindForms();
  renderAll();
}

init();
