function availableReservationRooms() {
  return state.rooms.filter((room) => !roomOccupant(room.id) && room.status !== 'rusak');
}

function fillReservationEmployee(employee) {
  if ($('reservationName')) $('reservationName').value = employee.name || '';
  if ($('reservationNik')) $('reservationNik').value = employee.nik || '';
  if ($('reservationLevel')) $('reservationLevel').value = employee.level || '';
  if ($('reservationPosition')) $('reservationPosition').value = employee.position || '';
  if ($('reservationOffice')) $('reservationOffice').value = employee.office || '';
}

function handleReservationName() {
  const employee = findEmployeeByName($('reservationName')?.value);
  if (employee) fillReservationEmployee(employee);
}

function renderReservationRoomOptions() {
  const select = $('reservationRoom');
  if (!select) return;
  const rooms = availableReservationRooms();
  select.innerHTML = '<option value="">Belum pilih kamar</option>' + rooms.map((room) => `<option value="${room.id}">${roomLabel(room)} - ${room.type} (${room.status})</option>`).join('');
}

function reservationToGuestPayload(reservation, room, employee) {
  return {
    reservationId: reservation.id,
    employeeId: employee?.id || reservation.employeeId || '',
    name: employee?.name || reservation.name,
    nik: employee?.nik || reservation.nik || '',
    level: employee?.level || reservation.level || '',
    position: employee?.position || reservation.position || '',
    roomId: room.id,
    office: reservation.office || employee?.office || '',
    purpose: reservation.purpose || '',
    mealEligible: reservation.mealEligible || 'Ya',
    checkinDate: todayIso(),
    checkoutDate: '',
    note: reservation.note || '',
    status: 'In House',
    updatedAt: new Date().toISOString(),
  };
}

function convertReservationToCheckin(reservationId) {
  const reservation = state.reservations.find((item) => item.id === reservationId);
  if (!reservation || reservation.status !== 'Reserved') return;
  const room = state.rooms.find((item) => item.id === reservation.roomId);
  if (!room || room.status !== 'bersih' || roomOccupant(room.id)) return alert('Kamar reservasi tidak bersih/kosong. Ubah kamar atau check in manual.');
  let employee = findEmployeeByName(reservation.name);
  if (!employee && reservation.name && reservation.nik) {
    employee = createOrUpdateEmployee({ name: reservation.name, nik: reservation.nik, level: reservation.level, position: reservation.position, office: reservation.office, phone: '' });
    saveData(STORAGE_KEYS.employees, state.employees);
  }
  state.guests.push({ id: uid(), ...reservationToGuestPayload(reservation, room, employee), createdAt: new Date().toISOString() });
  room.status = 'terisi';
  reservation.status = 'Checked In';
  reservation.checkinDate = todayIso();
  saveData(STORAGE_KEYS.reservations, state.reservations);
  saveData(STORAGE_KEYS.guests, state.guests);
  saveData(STORAGE_KEYS.rooms, state.rooms);
  renderAll();
  showPage('inhouse', 'In House');
}

function setReservationStatus(reservationId, status) {
  const reservation = state.reservations.find((item) => item.id === reservationId);
  if (!reservation || reservation.status === 'Checked In') return;
  reservation.status = status;
  reservation.updatedAt = new Date().toISOString();
  saveData(STORAGE_KEYS.reservations, state.reservations);
  renderAll();
}

function renderReservations() {
  renderPurposeOptions();
  renderReservationRoomOptions();
  if ($('reservationDate') && !$('reservationDate').value) $('reservationDate').value = todayIso();
  const reservations = state.reservations.slice().reverse();
  if ($('reservationCountText')) $('reservationCountText').textContent = `${reservations.length} data`;
  if (!$('reservationCards')) return;
  $('reservationCards').innerHTML = reservations.length ? reservations.map((reservation) => {
    const room = state.rooms.find((item) => item.id === reservation.roomId);
    const canCheckin = reservation.status === 'Reserved';
    return `<article class="guest-card"><div class="guest-card-head"><div><h3>${reservation.name}</h3><p>${room ? roomLabel(room) : 'Belum pilih kamar'} • ${reservation.office || '-'}</p></div>${badge(reservation.status, reservationStatusClass(reservation.status))}</div><div class="guest-info"><span><b>NIK</b>${reservation.nik || '-'}</span><span><b>Tanggal</b>${reservation.reservationDate || '-'}</span><span><b>Keperluan</b>${reservation.purpose || '-'}</span><span><b>Makan</b>${reservation.mealEligible || '-'}</span></div>${reservation.note ? `<p class="note-text">${reservation.note}</p>` : ''}<div class="card-actions">${canCheckin ? `<button class="primary-btn" onclick="convertReservationToCheckin('${reservation.id}')">Check In</button><button class="secondary-btn no-margin" onclick="setReservationStatus('${reservation.id}','No Show')">No Show</button><button class="danger-btn" onclick="setReservationStatus('${reservation.id}','Cancelled')">Cancel</button>` : ''}</div></article>`;
  }).join('') : '<div class="empty-card">Belum ada reservasi.</div>';
}

function initReservationsMenu() {
  if ($('reservationDate')) $('reservationDate').value = todayIso();
  $('reservationName')?.addEventListener('input', handleReservationName);
  $('reservationName')?.addEventListener('change', handleReservationName);
  $('reservationForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const purpose = text($('reservationPurpose')?.value);
    addPurpose(purpose);
    const employee = findEmployeeByName($('reservationName')?.value);
    state.reservations.push({
      id: uid(), employeeId: employee?.id || '', name: text($('reservationName')?.value), nik: text($('reservationNik')?.value) || employee?.nik || '',
      level: text($('reservationLevel')?.value) || employee?.level || '', position: text($('reservationPosition')?.value) || employee?.position || '', office: text($('reservationOffice')?.value) || employee?.office || '',
      roomId: $('reservationRoom')?.value || '', purpose, mealEligible: $('reservationMealEligible')?.value || 'Ya', reservationDate: $('reservationDate')?.value || todayIso(),
      note: text($('reservationNote')?.value), status: 'Reserved', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    saveData(STORAGE_KEYS.reservations, state.reservations);
    event.target.reset();
    if ($('reservationDate')) $('reservationDate').value = todayIso();
    renderAll();
  });
}
