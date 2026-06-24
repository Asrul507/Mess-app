function loadLayoutFixes() {
  if (document.querySelector('link[data-layout-fixes]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'layout-fixes.css?v=16';
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
  if (page === 'meal') return 'fa-utensils';
  if (page === 'meal-report') return 'fa-file-lines';
  if (page === 'employees') return 'fa-users';
  if (page === 'rooms' && roomOpen === 'overview') return 'fa-building';
  if (page === 'rooms' && roomOpen === 'status') return 'fa-door-open';
  if (page === 'rooms' && roomOpen === 'broken') return 'fa-screwdriver-wrench';
  if (page === 'rooms' && roomOpen === 'add') return 'fa-square-plus';
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

  if ($('todayText')) $('todayText').textContent = formatDate();

  if (typeof initRemoteDataSync === 'function') await initRemoteDataSync();

  state.purposes = Array.from(new Set([...DEFAULT_PURPOSES, ...state.purposes]));
  saveData(STORAGE_KEYS.purposes, state.purposes);

  initNavigation();
  decorateAppIcons();
  if (typeof prepareRoomMenuUi === 'function') prepareRoomMenuUi();
  initRoomsMenu();
  if (typeof initReservationsMenu === 'function') initReservationsMenu();
  initEmployeesMenu();
  initCheckinMenu();
  initMealsMenu();
  initReportsMenu();

  renderAll();
}

initApp();
