let currentRoomTab = 'overview';

function bedCodeFromIndex(index) {
  let result = '';
  let number = index + 1;
  while (number > 0) {
    const mod = (number - 1) % 26;
    result = String.fromCharCode(65 + mod) + result;
    number = Math.floor((number - 1) / 26);
  }
  return result;
}

function capacityValue() {
  return Math.max(Number($('roomCapacity') && $('roomCapacity').value ? $('roomCapacity').value : 1), 1);
}

function roomTypeFromCapacity(capacity) {
  return capacity === 1 ? 'Single' : `Sharing ${capacity}`;
}

function ensureRoomTypeOption(value) {
  const select = $('roomType');
  if (!select) return;
  const exists = Array.from(select.options).some((option) => option.value === value || option.textContent === value);
  if (!exists) select.add(new Option(value, value));
  select.value = value;
  select.disabled = true;
}

function generatedRoomNames() {
  const baseRoom = text($('roomNo') && $('roomNo').value);
  const capacity = capacityValue();
  if (!baseRoom) return [];
  if (capacity === 1) return [baseRoom];
  return Array.from({ length: capacity }, (_, index) => `${baseRoom}${bedCodeFromIndex(index)}`);
}

function ensureRoomGeneratorPreview() {
  let preview = $('roomGeneratorCleanPreview');
  if (preview) return preview;
  preview = document.createElement('div');
  preview.id = 'roomGeneratorCleanPreview';
  preview.className = 'room-generator-clean-preview full';
  const form = $('roomForm');
  const submit = form ? form.querySelector('button[type="submit"]') : null;
  if (form && submit) form.insertBefore(preview, submit);
  return preview;
}

function ensureRoomGeneratorLoading() {
  let loading = $('roomGeneratorInlineLoading');
  if (loading) return loading;
  loading = document.createElement('div');
  loading.id = 'roomGeneratorInlineLoading';
  loading.className = 'room-generator-inline-loading full hidden';
  loading.innerHTML = '<span class="small-spinner"></span><span>Sedang membuat data kamar...</span>';
  const form = $('roomForm');
  const submit = form ? form.querySelector('button[type="submit"]') : null;
  if (form && submit) form.insertBefore(loading, submit);
  return loading;
}

function ensureRoomBulkControls() {
  if ($('roomStatusFilter')) return;
  const tab = $('roomTabStatus');
  const tableWrap = tab ? tab.querySelector('.table-wrap') : null;
  if (!tableWrap) return;
  const panel = document.createElement('div');
  panel.className = 'bulk-panel';
  panel.innerHTML = `
    <div class="bulk-left">
      <label>Filter Status
        <select id="roomStatusFilter">
          <option value="all">Semua</option>
          <option value="bersih">Bersih</option>
          <option value="terisi">Terisi</option>
          <option value="kotor">Kotor</option>
          <option value="rusak">Rusak</option>
        </select>
      </label>
      <button class="secondary-btn no-margin" type="button" onclick="selectFilteredRooms()">Centang Semua</button>
      <button class="secondary-btn no-margin" type="button" onclick="clearSelectedRooms()">Hapus Centang</button>
    </div>
    <div class="bulk-actions">
      <button class="primary-btn" type="button" onclick="bulkSetRoomStatus('bersih')">Set Bersih</button>
      <button class="secondary-btn no-margin" type="button" onclick="bulkSetRoomStatus('kotor')">Set Kotor</button>
      <button class="danger-btn" type="button" onclick="bulkSetRoomStatus('rusak')">Set Rusak</button>
    </div>
  `;
  tableWrap.before(panel);
}

function updateRoomPreview() {
  const capacity = capacityValue();
  const type = roomTypeFromCapacity(capacity);
  ensureRoomTypeOption(type);
  const preview = ensureRoomGeneratorPreview();
  if (!preview) return;
  const rooms = generatedRoomNames();
  if (!rooms.length) {
    preview.innerHTML = '<div class="preview-title">Preview kamar</div><p>Isi No Kamar dan Kapasitas.</p>';
    return;
  }
  preview.innerHTML = `
    <div class="preview-title">Preview kamar</div>
    <div class="preview-meta">${type} • ${rooms.length} bed</div>
    <div class="preview-pills">${rooms.map((room) => `<span>${room}</span>`).join('')}</div>
  `;
}

function setRoomFormBusy(isBusy) {
  const loading = ensureRoomGeneratorLoading();
  const button = $('saveRoomBtn') || document.querySelector('#roomForm button[type="submit"]');
  if (loading) loading.classList.toggle('hidden', !isBusy);
  if (button) {
    button.disabled = isBusy;
    button.textContent = isBusy ? 'Menyimpan...' : 'Simpan Kamar';
  }
}

function prepareRoomMenuUi() {
  const oldOverlay = $('generateLoading');
  if (oldOverlay) oldOverlay.remove();
  const oldLoading = $('roomGenerateLoading');
  if (oldLoading) oldLoading.remove();
  const bedCode = $('bedCode');
  if (bedCode) {
    bedCode.value = '';
    const label = bedCode.closest('label');
    if (label) label.classList.add('hide-bed-code-field');
  }
  ensureRoomGeneratorPreview();
  ensureRoomGeneratorLoading();
  ensureRoomBulkControls();
}

function generateRoomsFromForm() {
  const baseRoom = text($('roomNo') && $('roomNo').value);
  const capacity = capacityValue();
  const type = roomTypeFromCapacity(capacity);
  const status = $('roomStatus') ? $('roomStatus').value : 'bersih';
  const building = text($('roomBuilding') && $('roomBuilding').value);
  if (!baseRoom) {
    alert('No Kamar wajib diisi.');
    return 0;
  }
  let total = 0;
  for (let index = 0; index < capacity; index += 1) {
    createOrUpdateRoom({ roomNo: baseRoom, bedCode: capacity === 1 ? '' : bedCodeFromIndex(index), capacity: 1, type, status, floor: '', building, note: '' });
    total += 1;
  }
  saveData(STORAGE_KEYS.rooms, state.rooms);
  return total;
}

function getRoomFilter() {
  return $('roomStatusFilter') ? $('roomStatusFilter').value : 'all';
}

function getFilteredRooms() {
  const filter = getRoomFilter();
  return sortedRooms(state.rooms).filter((room) => (filter === 'all' || room.status === filter) && matchesSearch([roomLabel(room), room.type, room.status, room.building, roomOccupant(room.id)?.name]));
}

function selectedRoomIds() {
  return Array.from(document.querySelectorAll('.room-check:checked')).map((checkbox) => checkbox.value);
}

function setRoomStatus(roomId, status) {
  const room = state.rooms.find((item) => item.id === roomId);
  if (!room) return;
  if (status === 'bersih' && roomOccupant(roomId)) return alert('Kamar masih terisi, tidak bisa dibuat bersih.');
  room.status = status;
  saveData(STORAGE_KEYS.rooms, state.rooms);
  renderAll();
}

function selectFilteredRooms() {
  document.querySelectorAll('.room-check').forEach((checkbox) => { checkbox.checked = true; });
}

function clearSelectedRooms() {
  document.querySelectorAll('.room-check').forEach((checkbox) => { checkbox.checked = false; });
}

function bulkSetRoomStatus(status) {
  const ids = selectedRoomIds();
  if (!ids.length) return alert('Pilih/centang kamar dulu.');
  let changed = 0;
  let skipped = 0;
  ids.forEach((id) => {
    const room = state.rooms.find((item) => item.id === id);
    if (!room) return;
    if (status === 'bersih' && roomOccupant(id)) { skipped += 1; return; }
    room.status = status;
    changed += 1;
  });
  saveData(STORAGE_KEYS.rooms, state.rooms);
  renderAll();
  alert(`${changed} kamar diubah ke ${status}.${skipped ? ` ${skipped} dilewati karena masih terisi.` : ''}`);
}

function roomTemplateRows() {
  return [
    { room_no: '101', bed_code: 'A', capacity: 1, type: 'Sharing 4', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
    { room_no: '101', bed_code: 'B', capacity: 1, type: 'Sharing 4', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
    { room_no: '102', bed_code: '', capacity: 1, type: 'Single', status: 'bersih', floor: '1', building: 'Mess A', note: '' },
  ];
}

function roomExportRows() {
  return state.rooms.map((room) => ({ room_no: room.roomNo, bed_code: room.bedCode || '', capacity: room.capacity || 1, type: room.type, status: room.status, floor: room.floor || '', building: room.building || '', note: room.note || '' }));
}

function importRooms(rows) {
  let count = 0;
  rows.forEach((row) => {
    const roomNo = text(row.room_no || row.no_kamar || row.kamar);
    if (!roomNo) return;
    createOrUpdateRoom({ roomNo, bedCode: text(row.bed_code || row.kode_bed || row.bed).toUpperCase(), capacity: Number(row.capacity || row.kapasitas || 1), type: text(row.type || row.tipe || 'Single'), status: normalizeStatus(row.status || 'bersih'), floor: text(row.floor || row.lantai), building: text(row.building || row.gedung), note: text(row.note || row.catatan) });
    count += 1;
  });
  saveData(STORAGE_KEYS.rooms, state.rooms);
  alert(`${count} data kamar berhasil diupload/update.`);
}

function handleRoomFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = file.name.toLowerCase().endsWith('.csv') ? parseCsv(String(reader.result)) : parseExcel(reader.result);
      importRooms(rows);
      event.target.value = '';
      renderAll();
    } catch (error) {
      console.error(error);
      alert('File kamar gagal dibaca. Pastikan header sesuai template.');
    }
  };
  file.name.toLowerCase().endsWith('.csv') ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
}

function renderDashboard() {
  const counts = ROOM_STATUSES.reduce((acc, status) => { acc[status] = state.rooms.filter((room) => room.status === status).length; return acc; }, {});
  if ($('cleanRooms')) $('cleanRooms').textContent = counts.bersih || 0;
  if ($('occupiedRooms')) $('occupiedRooms').textContent = counts.terisi || 0;
  if ($('dirtyRooms')) $('dirtyRooms').textContent = counts.kotor || 0;
  if ($('brokenRooms')) $('brokenRooms').textContent = counts.rusak || 0;
  if ($('roomOverviewText')) $('roomOverviewText').textContent = `${state.rooms.length} kamar/bed`;
  if ($('roomStatusCards')) $('roomStatusCards').innerHTML = ROOM_STATUSES.map((status) => `<div class="mini-status ${statusClass(status)}"><strong>${counts[status] || 0}</strong><span>${status}</span></div>`).join('');
  const todayMeals = state.meals.filter((meal) => meal.date === todayIso());
  if ($('mealTodayCount')) $('mealTodayCount').textContent = `${todayMeals.length} absen`;
  if ($('mealTodayTable')) $('mealTodayTable').innerHTML = todayMeals.length ? todayMeals.slice(-10).reverse().map((meal) => `<tr><td>${meal.guestName}</td><td>${meal.type}</td><td>${meal.time}</td></tr>`).join('') : emptyRow(3, 'Belum ada absen makan hari ini');
}

function renderRooms() {
  if ($('roomCountText')) $('roomCountText').textContent = `${state.rooms.length} data`;
  if ($('roomOverviewGrid')) $('roomOverviewGrid').innerHTML = sortedRooms(state.rooms).filter((room) => matchesSearch([roomLabel(room), room.type, room.status, room.building, roomOccupant(room.id)?.name])).map((room) => { const occupant = roomOccupant(room.id); return `<div class="room-card ${room.status}"><div><strong>${roomLabel(room)}</strong><p>${room.type}</p></div>${statusBadge(room.status)}<small>${occupant ? occupant.name : 'Kosong'}</small></div>`; }).join('');
  const filtered = getFilteredRooms();
  if ($('roomStatusTable')) $('roomStatusTable').innerHTML = filtered.length ? filtered.map((room) => { const occupant = roomOccupant(room.id); return `<tr><td><label class="check-cell"><input type="checkbox" class="room-check" value="${room.id}"> ${roomLabel(room)}</label></td><td>${room.type}</td><td>${statusBadge(room.status)}</td><td>${occupant ? occupant.name : '-'}</td><td><div class="button-row"><button class="mini-btn" onclick="setRoomStatus('${room.id}','bersih')">Bersih</button><button class="mini-btn" onclick="setRoomStatus('${room.id}','kotor')">Kotor</button><button class="danger-btn" onclick="setRoomStatus('${room.id}','rusak')">Rusak</button></div></td></tr>`; }).join('') : emptyRow(5, 'Tidak ada kamar sesuai filter');
  const brokenRooms = sortedRooms(state.rooms).filter((room) => room.status === 'rusak' && matchesSearch([roomLabel(room), room.type, room.status, room.building]));
  if ($('brokenRoomCountText')) $('brokenRoomCountText').textContent = `${brokenRooms.length} rusak`;
  if ($('brokenRoomCards')) $('brokenRoomCards').innerHTML = brokenRooms.length ? brokenRooms.map((room) => `<div class="guest-card"><div class="guest-card-head"><div><h3>${roomLabel(room)}</h3><p>${room.type}</p></div>${statusBadge(room.status)}</div><p class="note-text">Tidak tampil di pilihan check in.</p><div class="card-actions"><button class="secondary-btn no-margin" onclick="setRoomStatus('${room.id}','kotor')">Set Kotor</button><button class="primary-btn" onclick="setRoomStatus('${room.id}','bersih')">Set Bersih</button></div></div>`).join('') : '<div class="empty-card">Tidak ada kamar rusak.</div>';
}


function openRoomTab(tabName = 'overview') {
  currentRoomTab = tabName;
  document.querySelectorAll('.tab-btn').forEach((item) => item.classList.toggle('active', item.dataset.roomTab === tabName));
  document.querySelectorAll('.room-tab').forEach((tab) => tab.classList.remove('active'));
  const targetTab = $(`roomTab${tabName[0].toUpperCase()}${tabName.slice(1)}`);
  if (targetTab) targetTab.classList.add('active');
}

function initRoomsMenu() {
  prepareRoomMenuUi();
  if ($('roomType')) $('roomType').disabled = true;
  $('roomNo') && $('roomNo').addEventListener('input', updateRoomPreview);
  $('roomCapacity') && $('roomCapacity').addEventListener('input', updateRoomPreview);
  $('roomCapacity') && $('roomCapacity').addEventListener('change', updateRoomPreview);
  $('roomForm') && $('roomForm').addEventListener('submit', (event) => {
    event.preventDefault();
    setRoomFormBusy(true);
    setTimeout(() => {
      let total = 0;
      try {
        total = generateRoomsFromForm();
        if (total > 0) {
          $('roomForm').reset();
          $('roomCapacity').value = 1;
          ensureRoomTypeOption('Single');
          updateRoomPreview();
          renderAll();
        }
      } catch (error) {
        console.error(error);
        alert('Gagal menyimpan kamar. Cek console/error detail.');
      } finally {
        setRoomFormBusy(false);
        if (total > 0) alert(`${total} kamar/bed berhasil dibuat atau diupdate.`);
      }
    }, 50);
  });
  $('roomStatusFilter') && $('roomStatusFilter').addEventListener('change', renderRooms);
  $('roomFile') && $('roomFile').addEventListener('change', handleRoomFileUpload);
  $('downloadRoomTemplate') && $('downloadRoomTemplate').addEventListener('click', () => downloadWorkbook('template-upload-kamar-mess.xlsx', roomTemplateRows(), 'Template Kamar'));
  $('downloadRoomData') && $('downloadRoomData').addEventListener('click', () => downloadWorkbook('data-kamar-mess.xlsx', roomExportRows(), 'Data Kamar'));
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      openRoomTab(button.dataset.roomTab);
    });
  });
  updateRoomPreview();
}
