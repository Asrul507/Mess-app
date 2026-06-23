const STORAGE_KEYS = {
  rooms: 'messapp_rooms',
  employees: 'messapp_employees',
  guests: 'messapp_guests',
  meals: 'messapp_meals',
};

const state = {
  rooms: loadData(STORAGE_KEYS.rooms, seedRooms()),
  employees: loadData(STORAGE_KEYS.employees, []),
  guests: loadData(STORAGE_KEYS.guests, []),
  meals: loadData(STORAGE_KEYS.meals, []),
};

let pendingCheckinEmployeeName = '';

function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Gagal membaca ${key}`, error);
    return fallback;
  }
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function seedRooms() {
  return [
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'A', capacity: 1, type: 'Sharing 4', floor: '', building: '', note: '' },
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'B', capacity: 1, type: 'Sharing 4', floor: '', building: '', note: '' },
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'C', capacity: 1, type: 'Sharing 4', floor: '', building: '', note: '' },
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'D', capacity: 1, type: 'Sharing 4', floor: '', building: '', note: '' },
    { id: crypto.randomUUID(), roomNo: '102', bedCode: '', capacity: 1, type: 'Single', floor: '', building: '', note: '' },
    { id: crypto.randomUUID(), roomNo: '103', bedCode: 'A', capacity: 1, type: 'Sharing 2', floor: '', building: '', note: '' },
    { id: crypto.randomUUID(), roomNo: '103', bedCode: 'B', capacity: 1, type: 'Sharing 2', floor: '', building: '', note: '' },
  ];
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeName(value) {
  return normalizeText(value).toLowerCase();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5);
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function roomLabel(room) {
  return room.bedCode ? `${room.roomNo}${room.bedCode}` : room.roomNo;
}

function getActiveGuests() {
  return state.guests.filter((guest) => guest.status === 'In House');
}

function getGuestRoom(guest) {
  return state.rooms.find((room) => room.id === guest.roomId);
}

function isRoomOccupied(roomId) {
  return getActiveGuests().some((guest) => guest.roomId === roomId);
}

function getRoomOccupant(roomId) {
  return getActiveGuests().find((guest) => guest.roomId === roomId);
}

function findEmployeeByName(name) {
  return state.employees.find((employee) => normalizeName(employee.name) === normalizeName(name));
}

function findEmployeeByNik(nik) {
  return state.employees.find((employee) => normalizeText(employee.nik) === normalizeText(nik));
}

function emptyRow(colspan, text) {
  return `<tr><td class="empty" colspan="${colspan}">${text}</td></tr>`;
}

function badge(text, type = 'ok') {
  return `<span class="badge ${type}">${text}</span>`;
}

function showPage(pageId, title = '') {
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.page === pageId));
  document.querySelectorAll('.page').forEach((page) => page.classList.toggle('active', page.id === pageId));
  document.getElementById('pageTitle').textContent = title || document.querySelector(`[data-page="${pageId}"]`)?.textContent || '';
}

function renderNavigation() {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => showPage(button.dataset.page, button.textContent));
  });
}

function renderDashboard() {
  const activeGuests = getActiveGuests();
  const totalBeds = state.rooms.reduce((sum, room) => sum + Number(room.capacity || 1), 0);
  const occupiedBeds = activeGuests.length;
  const availableBeds = Math.max(totalBeds - occupiedBeds, 0);
  const todaysMeals = state.meals.filter((meal) => meal.date === todayIso());

  document.getElementById('totalRooms').textContent = new Set(state.rooms.map((room) => room.roomNo)).size;
  document.getElementById('totalBeds').textContent = totalBeds;
  document.getElementById('occupiedBeds').textContent = occupiedBeds;
  document.getElementById('availableBeds').textContent = availableBeds;
  document.getElementById('activeGuestCount').textContent = `${activeGuests.length} orang`;
  document.getElementById('mealTodayCount').textContent = `${todaysMeals.length} absen`;

  document.getElementById('activeGuestTable').innerHTML = activeGuests.length
    ? activeGuests.map((guest) => {
      const room = getGuestRoom(guest);
      return `
        <tr>
          <td>${guest.name}</td>
          <td>${room ? roomLabel(room) : '-'}</td>
          <td>${guest.office}</td>
          <td>${guest.mealEligible === 'Ya' ? badge('Dapat makan', 'ok') : badge('Tidak', 'warn')}</td>
        </tr>`;
    }).join('')
    : emptyRow(4, 'Belum ada penghuni aktif');

  document.getElementById('mealTodayTable').innerHTML = todaysMeals.length
    ? todaysMeals.slice(-8).reverse().map((meal) => `
      <tr><td>${meal.guestName}</td><td>${meal.type}</td><td>${meal.time}</td></tr>
    `).join('')
    : emptyRow(3, 'Belum ada absen makan hari ini');
}

function renderRoomOptions() {
  const availableRooms = state.rooms.filter((room) => !isRoomOccupied(room.id));
  document.getElementById('guestRoom').innerHTML = availableRooms.length
    ? availableRooms.map((room) => `<option value="${room.id}">${roomLabel(room)} - ${room.type}</option>`).join('')
    : '<option value="">Semua kamar/bed terisi</option>';
}

function renderRooms() {
  document.getElementById('roomCountText').textContent = `${state.rooms.length} data`;
  document.getElementById('roomTable').innerHTML = state.rooms.length
    ? state.rooms.map((room) => {
      const occupant = getRoomOccupant(room.id);
      return `
        <tr>
          <td>${room.roomNo}</td>
          <td>${room.bedCode || '-'}</td>
          <td>${room.type}</td>
          <td>${occupant ? badge('Terisi', 'danger') : badge('Kosong', 'ok')}</td>
          <td>${occupant ? occupant.name : '-'}</td>
        </tr>`;
    }).join('')
    : emptyRow(5, 'Belum ada data kamar');
}

function renderEmployees() {
  document.getElementById('employeeCountText').textContent = `${state.employees.length} data`;
  document.getElementById('employeeTable').innerHTML = state.employees.length
    ? state.employees.map((employee) => `
      <tr>
        <td>${employee.name}</td>
        <td>${employee.nik}</td>
        <td>${employee.level}</td>
        <td>${employee.position}</td>
        <td>${employee.office}</td>
        <td>${employee.phone || '-'}</td>
      </tr>`).join('')
    : emptyRow(6, 'Belum ada data karyawan');

  document.getElementById('employeeNames').innerHTML = state.employees
    .map((employee) => `<option value="${employee.name}"></option>`)
    .join('');
}

function renderMealGuests() {
  const eligibleGuests = getActiveGuests().filter((guest) => guest.mealEligible === 'Ya');
  document.getElementById('mealGuest').innerHTML = eligibleGuests.length
    ? eligibleGuests.map((guest) => `<option value="${guest.id}">${guest.name} - ${guest.office}</option>`).join('')
    : '<option value="">Tidak ada penghuni yang dapat makan</option>';
}

function renderMealReport() {
  const selectedDate = document.getElementById('mealReportDate').value;
  const rows = state.meals.filter((meal) => !selectedDate || meal.date === selectedDate);
  document.getElementById('mealReportTable').innerHTML = rows.length
    ? rows.slice().reverse().map((meal) => `
      <tr>
        <td>${meal.date}</td>
        <td>${meal.guestName}</td>
        <td>${meal.roomLabel}</td>
        <td>${meal.office}</td>
        <td>${meal.type}</td>
        <td>${meal.time}</td>
      </tr>`).join('')
    : emptyRow(6, 'Belum ada data absen makan');
}

function renderGuestReport() {
  const activeGuests = getActiveGuests();
  document.getElementById('guestReportTable').innerHTML = activeGuests.length
    ? activeGuests.map((guest) => {
      const room = getGuestRoom(guest);
      return `
        <tr>
          <td>${guest.name}</td>
          <td>${guest.nik || '-'}</td>
          <td>${room ? roomLabel(room) : '-'}</td>
          <td>${guest.office}</td>
          <td>${guest.purpose}</td>
          <td>${guest.mealEligible}</td>
          <td>${guest.checkinDate}</td>
          <td>${guest.checkoutPlan || '-'}</td>
        </tr>`;
    }).join('')
    : emptyRow(8, 'Belum ada penghuni mess aktif');
}

function renderAll() {
  renderDashboard();
  renderRoomOptions();
  renderRooms();
  renderEmployees();
  renderMealGuests();
  renderMealReport();
  renderGuestReport();
  handleGuestNameCheck();
}

function createOrUpdateEmployee(employee) {
  const existingIndex = state.employees.findIndex((item) => normalizeText(item.nik) === normalizeText(employee.nik));
  if (existingIndex >= 0) {
    state.employees[existingIndex] = { ...state.employees[existingIndex], ...employee };
    return state.employees[existingIndex];
  }

  const byNameIndex = state.employees.findIndex((item) => normalizeName(item.name) === normalizeName(employee.name));
  if (byNameIndex >= 0) {
    state.employees[byNameIndex] = { ...state.employees[byNameIndex], ...employee };
    return state.employees[byNameIndex];
  }

  const newEmployee = { id: crypto.randomUUID(), ...employee };
  state.employees.push(newEmployee);
  return newEmployee;
}

function createOrUpdateRoom(room) {
  const existingIndex = state.rooms.findIndex((item) => (
    normalizeText(item.roomNo) === normalizeText(room.roomNo) &&
    normalizeText(item.bedCode).toUpperCase() === normalizeText(room.bedCode).toUpperCase()
  ));

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
      floor: '',
      building: '',
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
    if (!roomId) {
      alert('Tidak ada kamar/bed kosong. Tambah data kamar dulu.');
      return;
    }

    const employee = findEmployeeByName(document.getElementById('guestName').value);
    if (!employee) {
      alert('Nama karyawan belum ada di database. Klik tombol + Tambah Karyawan Baru dulu.');
      handleGuestNameCheck();
      return;
    }

    const guest = {
      id: crypto.randomUUID(),
      employeeId: employee.id,
      name: employee.name,
      nik: employee.nik,
      roomId,
      office: normalizeText(document.getElementById('guestOffice').value),
      purpose: document.getElementById('guestPurpose').value,
      mealEligible: document.getElementById('guestMealEligible').value,
      checkinDate: document.getElementById('guestCheckinDate').value,
      checkoutPlan: document.getElementById('guestCheckoutPlan').value,
      note: normalizeText(document.getElementById('guestNote').value),
      status: 'In House',
      createdAt: new Date().toISOString(),
    };

    state.guests.push(guest);
    saveData(STORAGE_KEYS.guests, state.guests);
    event.target.reset();
    setDefaultDates();
    renderAll();
  });

  document.getElementById('mealForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const guestId = document.getElementById('mealGuest').value;
    const guest = state.guests.find((item) => item.id === guestId);
    if (!guest) {
      alert('Tidak ada penghuni yang bisa absen makan.');
      return;
    }

    const room = getGuestRoom(guest);
    const meal = {
      id: crypto.randomUUID(),
      guestId,
      guestName: guest.name,
      roomLabel: room ? roomLabel(room) : '-',
      office: guest.office,
      type: document.getElementById('mealType').value,
      date: document.getElementById('mealDate').value,
      time: document.getElementById('mealTime').value,
      createdAt: new Date().toISOString(),
    };

    const duplicate = state.meals.some((item) => item.guestId === meal.guestId && item.date === meal.date && item.type === meal.type);
    if (duplicate) {
      alert('Penghuni ini sudah absen makan untuk jenis makan dan tanggal yang sama.');
      return;
    }

    state.meals.push(meal);
    saveData(STORAGE_KEYS.meals, state.meals);
    event.target.reset();
    setDefaultDates();
    renderAll();
  });

  document.getElementById('mealReportDate').addEventListener('change', renderMealReport);
  document.getElementById('guestName').addEventListener('input', handleGuestNameCheck);
  document.getElementById('guestName').addEventListener('change', handleGuestNameCheck);
  document.getElementById('goAddEmployeeBtn').addEventListener('click', goAddEmployeeFromCheckin);

  document.getElementById('roomFile').addEventListener('change', (event) => handleFileUpload(event, 'rooms'));
  document.getElementById('employeeFile').addEventListener('change', (event) => handleFileUpload(event, 'employees'));
  document.getElementById('downloadRoomTemplate').addEventListener('click', () => downloadWorkbook('template-upload-kamar-mess.xlsx', roomTemplateRows(), 'Template Kamar'));
  document.getElementById('downloadRoomData').addEventListener('click', () => downloadWorkbook('data-kamar-mess.xlsx', roomExportRows(), 'Data Kamar'));
  document.getElementById('downloadEmployeeTemplate').addEventListener('click', () => downloadWorkbook('template-upload-karyawan-mess.xlsx', employeeTemplateRows(), 'Template Karyawan'));
  document.getElementById('downloadEmployeeData').addEventListener('click', () => downloadWorkbook('data-karyawan-mess.xlsx', employeeExportRows(), 'Data Karyawan'));
}

function handleGuestNameCheck() {
  const input = document.getElementById('guestName');
  const notice = document.getElementById('newEmployeeNotice');
  const name = normalizeText(input.value);

  if (!name) {
    notice.classList.add('hidden');
    return;
  }

  const employee = findEmployeeByName(name);
  if (employee) {
    fillCheckinEmployee(employee);
    notice.classList.add('hidden');
    return;
  }

  notice.classList.remove('hidden');
}

function fillCheckinEmployee(employee) {
  document.getElementById('guestName').value = employee.name || '';
  document.getElementById('guestNik').value = employee.nik || '';
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
    { room_no: '101', bed_code: 'A', capacity: 1, type: 'Sharing 4', floor: '1', building: 'Mess A', note: 'Contoh kamar sharing' },
    { room_no: '101', bed_code: 'B', capacity: 1, type: 'Sharing 4', floor: '1', building: 'Mess A', note: 'Contoh kamar sharing' },
    { room_no: '102', bed_code: '', capacity: 1, type: 'Single', floor: '1', building: 'Mess A', note: 'Contoh kamar sendiri' },
  ];
}

function employeeTemplateRows() {
  return [
    { nama: 'Andi Saputra', nik: 'EMP001', jabatan: 'Staff', posisi: 'Cleaning Service Officer', office: 'Office Balikpapan', no_hp: '081234567890' },
    { nama: 'Budi Rahman', nik: 'EMP002', jabatan: 'Non Staff', posisi: 'Driver', office: 'Office Balikpapan', no_hp: '081234567891' },
    { nama: 'Citra Dewi', nik: 'EMP003', jabatan: 'Manager', posisi: 'Area Manager', office: 'Office Samarinda', no_hp: '081234567892' },
  ];
}

function roomExportRows() {
  return state.rooms.map((room) => ({
    room_no: room.roomNo,
    bed_code: room.bedCode || '',
    capacity: Number(room.capacity || 1),
    type: room.type || 'Single',
    floor: room.floor || '',
    building: room.building || '',
    note: room.note || '',
  }));
}

function employeeExportRows() {
  return state.employees.map((employee) => ({
    nama: employee.name,
    nik: employee.nik,
    jabatan: employee.level,
    posisi: employee.position,
    office: employee.office,
    no_hp: employee.phone || '',
  }));
}

function downloadWorkbook(filename, rows, sheetName) {
  if (!window.XLSX) {
    downloadCsv(filename.replace('.xlsx', '.csv'), rows);
    return;
  }

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
      const rows = file.name.toLowerCase().endsWith('.csv')
        ? parseCsv(String(reader.result))
        : parseExcel(reader.result);

      if (type === 'rooms') importRooms(rows);
      if (type === 'employees') importEmployees(rows);

      event.target.value = '';
      renderAll();
    } catch (error) {
      console.error(error);
      alert('File gagal dibaca. Pastikan format header sesuai template.');
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
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || '';
      return row;
    }, {});
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
    createOrUpdateEmployee({
      name,
      nik,
      level: normalizeText(row.jabatan || row.level || 'Staff'),
      position: normalizeText(row.posisi || row.position),
      office: normalizeText(row.office || row.nama_office),
      phone: normalizeText(row.no_hp || row.phone || row.nohp),
    });
    count += 1;
  });
  saveData(STORAGE_KEYS.employees, state.employees);
  alert(`${count} data karyawan berhasil diupload/update.`);
}

function setDefaultDates() {
  document.getElementById('guestCheckinDate').value = todayIso();
  document.getElementById('mealDate').value = todayIso();
  document.getElementById('mealReportDate').value = todayIso();
  document.getElementById('mealTime').value = currentTime();
}

function init() {
  document.getElementById('todayText').textContent = formatDate();
  setDefaultDates();
  renderNavigation();
  bindForms();
  renderAll();
}

init();
