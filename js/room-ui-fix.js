// UI helper untuk menu Room/Kamar.
// File ini sengaja dipisah agar form kamar tidak lagi bergantung pada override lama.

function ensureRoomGeneratorPreview() {
  let preview = $('roomGeneratorCleanPreview');
  if (preview) return preview;

  preview = document.createElement('div');
  preview.id = 'roomGeneratorCleanPreview';
  preview.className = 'room-generator-clean-preview full';

  const form = $('roomForm');
  const submit = form?.querySelector('button[type="submit"]');
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
  const submit = form?.querySelector('button[type="submit"]');
  if (form && submit) form.insertBefore(loading, submit);
  return loading;
}

function ensureRoomBulkControls() {
  if ($('roomStatusFilter')) return;
  const tab = $('roomTabStatus');
  const tableWrap = tab?.querySelector('.table-wrap');
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
  const button = document.querySelector('#roomForm button[type="submit"]');

  loading.classList.toggle('hidden', !isBusy);
  if (button) {
    button.disabled = isBusy;
    button.textContent = isBusy ? 'Menyimpan...' : 'Simpan Kamar';
  }
}

function prepareRoomMenuUi() {
  const oldOverlay = $('generateLoading');
  if (oldOverlay) oldOverlay.remove();

  const bedCode = $('bedCode');
  if (bedCode) {
    bedCode.value = '';
    bedCode.closest('label')?.classList.add('hide-bed-code-field');
  }

  ensureRoomGeneratorPreview();
  ensureRoomGeneratorLoading();
  ensureRoomBulkControls();
}
