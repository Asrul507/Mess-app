const STORAGE_KEYS = {
  rooms: 'messapp_rooms',
  employees: 'messapp_employees',
  guests: 'messapp_guests',
  meals: 'messapp_meals',
  purposes: 'messapp_purposes',
  reservations: 'messapp_reservations',
};

const DEFAULT_PURPOSES = ['Cuti', 'On Site', 'Dinas', 'New Hire Onsite', 'New Hire MCU', 'MCU Tahunan', 'Long Stay'];
const ROOM_STATUSES = ['bersih', 'terisi', 'kotor', 'rusak'];

const state = {
  rooms: loadData(STORAGE_KEYS.rooms, seedRooms()),
  employees: loadData(STORAGE_KEYS.employees, []),
  guests: loadData(STORAGE_KEYS.guests, []),
  meals: loadData(STORAGE_KEYS.meals, []),
  purposes: loadData(STORAGE_KEYS.purposes, DEFAULT_PURPOSES),
  reservations: loadData(STORAGE_KEYS.reservations, []),
};

let pendingCheckinEmployeeName = '';
let editingGuestId = null;

const navigationHistory = ['dashboard'];
let suppressHistory = false;

function appModalElements() {
  return {
    modal: $('appModal'),
    title: $('appModalTitle'),
    message: $('appModalMessage'),
    input: $('appModalInput'),
    actions: $('appModalActions'),
    icon: $('appModalIcon'),
  };
}

function showAppModal({ title = 'Notifikasi', message = '', type = 'info', input = false, inputValue = '', confirmText = 'OK', cancelText = '' } = {}) {
  const elements = appModalElements();
  if (!elements.modal || !elements.actions) return Promise.resolve(input ? inputValue : true);
  elements.title.textContent = title;
  elements.message.textContent = message;
  elements.icon.textContent = type === 'danger' ? '!' : type === 'confirm' ? '?' : 'i';
  elements.icon.className = `app-modal-icon ${type}`;
  elements.input.classList.toggle('hidden', !input);
  elements.input.value = inputValue || '';
  elements.actions.innerHTML = '';
  elements.modal.classList.remove('hidden');
  if (input) setTimeout(() => elements.input.focus(), 30);

  return new Promise((resolve) => {
    const close = (value) => {
      elements.modal.classList.add('hidden');
      resolve(value);
    };
    if (cancelText) {
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'secondary-btn no-margin';
      cancel.textContent = cancelText;
      cancel.addEventListener('click', () => close(input ? null : false));
      elements.actions.appendChild(cancel);
    }
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = type === 'danger' ? 'danger-btn' : 'primary-btn';
    ok.textContent = confirmText;
    ok.addEventListener('click', () => close(input ? elements.input.value : true));
    elements.actions.appendChild(ok);
  });
}

function appAlert(message, title = 'Notifikasi', type = 'info') {
  return showAppModal({ title, message, type, confirmText: 'Mengerti' });
}

function appConfirm(message, title = 'Konfirmasi') {
  return showAppModal({ title, message, type: 'confirm', confirmText: 'Ya, lanjutkan', cancelText: 'Batal' });
}

function appPrompt(message, defaultValue = '', title = 'Input') {
  return showAppModal({ title, message, type: 'info', input: true, inputValue: defaultValue, confirmText: 'Simpan', cancelText: 'Batal' });
}

// Keep legacy alert() calls themed without relying on browser UI.
window.alert = (message) => { appAlert(String(message || '')); };

function $(id) {
  return document.getElementById(id);
}

function text(value) {
  return String(value || '').trim();
}

function key(value) {
  return text(value).toLowerCase();
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function loadData(storageKey, fallback) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Gagal membaca ${storageKey}`, error);
    return fallback;
  }
}

function saveData(storageKey, data) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function seedRooms() {
  return [
    { id: uid(), roomNo: '101', bedCode: 'A', capacity: 1, type: 'Sharing 4', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
    { id: uid(), roomNo: '101', bedCode: 'B', capacity: 1, type: 'Sharing 4', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
    { id: uid(), roomNo: '101', bedCode: 'C', capacity: 1, type: 'Sharing 4', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
    { id: uid(), roomNo: '101', bedCode: 'D', capacity: 1, type: 'Sharing 4', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
    { id: uid(), roomNo: '102', bedCode: '', capacity: 1, type: 'Single', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
  ];
}

function roomLabel(room) {
  if (!room) return '-';
  return room.bedCode ? `${room.roomNo}${room.bedCode}` : room.roomNo;
}

function activeGuests() {
  return state.guests.filter((guest) => guest.status === 'In House');
}

function reservationStatusClass(status) {
  return { Reserved: 'warn', 'Checked In': 'ok', Cancelled: 'muted', 'No Show': 'danger' }[status] || 'muted';
}

function roomOfGuest(guest) {
  return state.rooms.find((room) => room.id === guest.roomId);
}

function employeeOfGuest(guest) {
  return state.employees.find((employee) => employee.id === guest.employeeId) || {};
}

function roomOccupant(roomId) {
  return activeGuests().find((guest) => guest.roomId === roomId);
}

function normalizeStatus(status) {
  const map = {
    available: 'bersih',
    clean: 'bersih',
    occupied: 'terisi',
    dirty: 'kotor',
    maintenance: 'rusak',
    broken: 'rusak',
    inactive: 'rusak',
  };
  return map[key(status)] || key(status) || 'bersih';
}

function syncRoomStatuses() {
  state.rooms.forEach((room) => {
    const occupied = Boolean(roomOccupant(room.id));
    if (occupied) room.status = 'terisi';
    else if (room.status === 'terisi') room.status = 'kotor';
    else room.status = normalizeStatus(room.status);
  });
  saveData(STORAGE_KEYS.rooms, state.rooms);
}

function statusClass(status) {
  return { bersih: 'ok', terisi: 'danger', kotor: 'warn', rusak: 'muted' }[status] || 'muted';
}

function badge(label, cssClass = 'ok') {
  return `<span class="badge ${cssClass}">${label}</span>`;
}

function statusBadge(status) {
  return badge(status, statusClass(status));
}

function emptyRow(cols, message) {
  return `<tr><td class="empty" colspan="${cols}">${message}</td></tr>`;
}

function stayDays(checkinDate, checkoutDate = '') {
  if (!checkinDate) return 0;
  const start = new Date(`${checkinDate}T00:00:00`);
  const end = new Date(`${checkoutDate || todayIso()}T00:00:00`);
  return Math.max(Math.floor((end - start) / 86400000) + 1, 1);
}

function normalizeEmployeeStatus(status) {
  const normalized = text(status) || 'Aktif';
  const lower = key(normalized);
  if (['blacklist', 'blocked'].includes(lower)) return 'Blacklist';
  if (['non aktif', 'nonaktif', 'inactive', 'tidak aktif'].includes(lower)) return 'Non Aktif';
  return 'Aktif';
}

function isEmployeeActive(employee) {
  return normalizeEmployeeStatus(employee?.status) === 'Aktif';
}

function findEmployeeByName(name) {
  return state.employees.find((employee) => key(employee.name) === key(name));
}

function createOrUpdateRoom(room) {
  const normalized = { ...room, status: normalizeStatus(room.status) };
  const index = state.rooms.findIndex((item) => text(item.roomNo) === text(normalized.roomNo) && text(item.bedCode).toUpperCase() === text(normalized.bedCode).toUpperCase());
  if (index >= 0) {
    state.rooms[index] = { ...state.rooms[index], ...normalized };
    return state.rooms[index];
  }
  const created = { id: uid(), ...normalized };
  state.rooms.push(created);
  return created;
}

function createOrUpdateEmployee(employee) {
  const index = state.employees.findIndex((item) => text(item.nik) === text(employee.nik) || key(item.name) === key(employee.name));
  if (index >= 0) {
    state.employees[index] = { ...state.employees[index], status: normalizeEmployeeStatus(state.employees[index].status), ...employee, status: normalizeEmployeeStatus(employee.status || state.employees[index].status) };
    return state.employees[index];
  }
  const created = { id: uid(), ...employee, status: normalizeEmployeeStatus(employee.status) };
  state.employees.push(created);
  return created;
}

function addPurpose(value) {
  const purpose = text(value);
  if (!purpose) return;
  if (!state.purposes.some((item) => key(item) === key(purpose))) {
    state.purposes.push(purpose);
    state.purposes.sort((a, b) => a.localeCompare(b));
    saveData(STORAGE_KEYS.purposes, state.purposes);
  }
}

function showPage(pageId, title = '') {
  const current = document.querySelector('.page.active')?.id;
  if (!suppressHistory && current && current !== pageId) navigationHistory.push(current);
  suppressHistory = false;
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.page === pageId);
  });
  document.querySelectorAll('.page').forEach((page) => {
    page.classList.toggle('active', page.id === pageId);
  });
  const pageTitle = $('pageTitle');
  if (pageTitle) pageTitle.textContent = title || document.querySelector(`[data-page="${pageId}"]`)?.textContent || '';
}

function goBackPage() {
  const previous = navigationHistory.pop() || 'dashboard';
  suppressHistory = true;
  showPage(previous);
}

function downloadWorkbook(filename, rows, sheetName) {
  if (!window.XLSX) return alert('Library Excel belum tersedia.');
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

function parseExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headers = lines.shift().split(',').map(text);
  return lines.map((line) => {
    const values = line.split(',').map((value) => text(value).replace(/^"|"$/g, ''));
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || '';
      return row;
    }, {});
  });
}

function renderAll() {
  syncRoomStatuses();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderRooms === 'function') renderRooms();
  if (typeof renderEmployees === 'function') renderEmployees();
  if (typeof renderReservations === 'function') renderReservations();
  if (typeof renderCheckin === 'function') renderCheckin();
  if (typeof renderInhouse === 'function') renderInhouse();
  if (typeof renderMeals === 'function') renderMeals();
  if (typeof renderReports === 'function') renderReports();
}
