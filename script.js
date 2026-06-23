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
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'A', capacity: 1, type: 'Sharing 4' },
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'B', capacity: 1, type: 'Sharing 4' },
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'C', capacity: 1, type: 'Sharing 4' },
    { id: crypto.randomUUID(), roomNo: '101', bedCode: 'D', capacity: 1, type: 'Sharing 4' },
    { id: crypto.randomUUID(), roomNo: '102', bedCode: '', capacity: 1, type: 'Single' },
    { id: crypto.randomUUID(), roomNo: '103', bedCode: 'A', capacity: 1, type: 'Sharing 2' },
    { id: crypto.randomUUID(), roomNo: '103', bedCode: 'B', capacity: 1, type: 'Sharing 2' },
  ];
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5);
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

function emptyRow(colspan, text) {
  return `<tr><td class="empty" colspan="${colspan}">${text}</td></tr>`;
}

function badge(text, type = 'ok') {
  return `<span class="badge ${type}">${text}</span>`;
}

function renderNavigation() {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.remove('active'));
      document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(button.dataset.page).classList.add('active');
      document.getElementById('pageTitle').textContent = button.textContent;
    });
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
          </tr>
        `;
      }).join('')
    : emptyRow(4, 'Belum ada penghuni aktif');

  document.getElementById('mealTodayTable').innerHTML = todaysMeals.length
    ? todaysMeals.slice(-8).reverse().map((meal) => `
        <tr>
          <td>${meal.guestName}</td>
          <td>${meal.type}</td>
          <td>${meal.time}</td>
        </tr>
      `).join('')
    : emptyRow(3, 'Belum ada absen makan hari ini');
}

function renderRoomOptions() {
  const availableRooms = state.rooms.filter((room) => !isRoomOccupied(room.id));
  const options = availableRooms.map((room) => `<option value="${room.id}">${roomLabel(room)} - ${room.type}</option>`).join('');
  document.getElementById('guestRoom').innerHTML = options || '<option value="">Semua kamar/bed terisi</option>';
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
          </tr>
        `;
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
      </tr>
    `).join('')
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
      </tr>
    `).join('')
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
        </tr>
      `;
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
}

function bindForms() {
  document.getElementById('roomForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const room = {
      id: crypto.randomUUID(),
      roomNo: document.getElementById('roomNo').value.trim(),
      bedCode: document.getElementById('bedCode').value.trim().toUpperCase(),
      capacity: Number(document.getElementById('roomCapacity').value || 1),
      type: document.getElementById('roomType').value,
    };

    state.rooms.push(room);
    saveData(STORAGE_KEYS.rooms, state.rooms);
    event.target.reset();
    document.getElementById('roomCapacity').value = 1;
    renderAll();
  });

  document.getElementById('employeeForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const employee = {
      id: crypto.randomUUID(),
      name: document.getElementById('employeeName').value.trim(),
      nik: document.getElementById('employeeNik').value.trim(),
      level: document.getElementById('employeeLevel').value,
      position: document.getElementById('employeePosition').value.trim(),
      office: document.getElementById('employeeOffice').value.trim(),
      phone: document.getElementById('employeePhone').value.trim(),
    };

    state.employees.push(employee);
    saveData(STORAGE_KEYS.employees, state.employees);
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

    const guest = {
      id: crypto.randomUUID(),
      name: document.getElementById('guestName').value.trim(),
      nik: document.getElementById('guestNik').value.trim(),
      roomId,
      office: document.getElementById('guestOffice').value.trim(),
      purpose: document.getElementById('guestPurpose').value,
      mealEligible: document.getElementById('guestMealEligible').value,
      checkinDate: document.getElementById('guestCheckinDate').value,
      checkoutPlan: document.getElementById('guestCheckoutPlan').value,
      note: document.getElementById('guestNote').value.trim(),
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

    const duplicate = state.meals.some((item) => (
      item.guestId === meal.guestId &&
      item.date === meal.date &&
      item.type === meal.type
    ));

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

  document.getElementById('roomCsv').addEventListener('change', handleRoomCsvUpload);

  document.getElementById('downloadRoomTemplate').addEventListener('click', () => {
    const csv = 'room_no,bed_code,capacity,type\n101,A,1,Sharing 4\n101,B,1,Sharing 4\n102,,1,Single\n';
    downloadFile('template-kamar-mess.csv', csv);
  });

  document.getElementById('guestName').addEventListener('change', (event) => {
    const employee = state.employees.find((item) => item.name.toLowerCase() === event.target.value.trim().toLowerCase());
    if (!employee) return;
    document.getElementById('guestNik').value = employee.nik;
    document.getElementById('guestOffice').value = employee.office;
  });
}

function handleRoomCsvUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const lines = String(reader.result)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const [, ...rows] = lines;
    const imported = rows.map((line) => {
      const [roomNo, bedCode, capacity, type] = line.split(',').map((value) => value?.trim() || '');
      return {
        id: crypto.randomUUID(),
        roomNo,
        bedCode: bedCode.toUpperCase(),
        capacity: Number(capacity || 1),
        type: type || 'Single',
      };
    }).filter((room) => room.roomNo);

    state.rooms.push(...imported);
    saveData(STORAGE_KEYS.rooms, state.rooms);
    event.target.value = '';
    renderAll();
    alert(`${imported.length} data kamar berhasil diimport.`);
  };

  reader.readAsText(file);
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
