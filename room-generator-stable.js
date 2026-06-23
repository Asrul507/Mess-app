// Stable Room Generator
// Menghindari double submit dan loading stuck.
// Patokan utama: No Kamar + Kapasitas.

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function text(value) {
    return String(value || '').trim();
  }

  function capacityValue() {
    return Math.max(Number($('roomCapacity')?.value || 1), 1);
  }

  function typeFromCapacity(capacity) {
    return capacity === 1 ? 'Single' : `Sharing ${capacity}`;
  }

  function bedCode(index) {
    let result = '';
    let number = index + 1;
    while (number > 0) {
      const mod = (number - 1) % 26;
      result = String.fromCharCode(65 + mod) + result;
      number = Math.floor((number - 1) / 26);
    }
    return result;
  }

  function generatedNames() {
    const baseRoom = text($('roomNo')?.value);
    const capacity = capacityValue();
    if (!baseRoom) return [];
    if (capacity === 1) return [baseRoom];
    return Array.from({ length: capacity }, (_, index) => `${baseRoom}${bedCode(index)}`);
  }

  function ensureOption(select, value) {
    if (!select) return;
    const found = Array.from(select.options).some((opt) => opt.value === value || opt.textContent === value);
    if (!found) select.add(new Option(value, value));
    select.value = value;
  }

  function ensurePreview() {
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

  function setTypeAndPreview() {
    const capacity = capacityValue();
    const type = typeFromCapacity(capacity);
    const roomType = $('roomType');

    ensureOption(roomType, type);
    if (roomType) {
      roomType.disabled = true;
      roomType.setAttribute('aria-readonly', 'true');
      roomType.title = 'Tipe kamar otomatis mengikuti kapasitas';
    }

    const preview = ensurePreview();
    const rooms = generatedNames();

    if (!rooms.length) {
      preview.innerHTML = `
        <div class="preview-title">Preview kamar</div>
        <p>Isi nomor kamar dan kapasitas untuk melihat hasil generate.</p>
      `;
      return;
    }

    preview.innerHTML = `
      <div class="preview-title">Preview kamar</div>
      <div class="preview-meta">${type} • ${rooms.length} bed</div>
      <div class="preview-pills">${rooms.map((room) => `<span>${room}</span>`).join('')}</div>
    `;
  }

  function setButtonLoading(isLoading) {
    const form = $('roomForm');
    const button = form?.querySelector('button[type="submit"]');
    let inline = $('roomGeneratorInlineLoading');

    if (!inline && form && button) {
      inline = document.createElement('div');
      inline.id = 'roomGeneratorInlineLoading';
      inline.className = 'room-generator-inline-loading full hidden';
      inline.innerHTML = '<span class="small-spinner"></span><span>Sedang membuat data kamar...</span>';
      form.insertBefore(inline, button);
    }

    if (inline) inline.classList.toggle('hidden', !isLoading);
    if (button) {
      button.disabled = isLoading;
      button.textContent = isLoading ? 'Membuat kamar...' : 'Simpan Kamar';
    }
  }

  function generateRooms() {
    const roomNo = $('roomNo');
    const roomStatus = $('roomStatus');
    const roomBuilding = $('roomBuilding');
    const baseRoom = text(roomNo?.value);
    const capacity = capacityValue();
    const type = typeFromCapacity(capacity);
    const status = roomStatus?.value || 'bersih';
    const building = text(roomBuilding?.value);

    if (!baseRoom) {
      alert('No Kamar wajib diisi.');
      return 0;
    }

    let total = 0;
    for (let index = 0; index < capacity; index += 1) {
      const code = capacity === 1 ? '' : bedCode(index);
      createOrUpdateRoom({
        roomNo: baseRoom,
        bedCode: code,
        capacity: 1,
        type,
        status,
        floor: '',
        building,
        note: '',
      });
      total += 1;
    }

    saveData(STORAGE_KEYS.rooms, state.rooms);
    return total;
  }

  function cleanupOldGeneratorArtifacts() {
    const oldOverlay = document.getElementById('generateLoading');
    if (oldOverlay) oldOverlay.remove();

    const oldLoading = document.getElementById('roomGenerateLoading');
    if (oldLoading) oldLoading.remove();
  }

  function bindStableGenerator() {
    const form = $('roomForm');
    if (!form) return;

    cleanupOldGeneratorArtifacts();

    const bedInput = $('bedCode');
    if (bedInput) {
      bedInput.value = '';
      const label = bedInput.closest('label');
      if (label) label.classList.add('hide-bed-code-field');
    }

    setTypeAndPreview();

    $('roomNo')?.addEventListener('input', setTypeAndPreview);
    $('roomCapacity')?.addEventListener('input', setTypeAndPreview);
    $('roomCapacity')?.addEventListener('change', setTypeAndPreview);

    const freshForm = form.cloneNode(true);
    form.parentNode.replaceChild(freshForm, form);

    const newRoomNo = $('roomNo');
    const newRoomCapacity = $('roomCapacity');
    const newRoomType = $('roomType');
    const newBedCode = $('bedCode');

    if (newBedCode) {
      newBedCode.value = '';
      const label = newBedCode.closest('label');
      if (label) label.classList.add('hide-bed-code-field');
    }

    if (newRoomType) {
      ensureOption(newRoomType, typeFromCapacity(capacityValue()));
      newRoomType.disabled = true;
      newRoomType.setAttribute('aria-readonly', 'true');
    }

    newRoomNo?.addEventListener('input', setTypeAndPreview);
    newRoomCapacity?.addEventListener('input', setTypeAndPreview);
    newRoomCapacity?.addEventListener('change', setTypeAndPreview);

    freshForm.addEventListener('submit', function (event) {
      event.preventDefault();

      setButtonLoading(true);

      window.setTimeout(function () {
        const total = generateRooms();

        if (total > 0) {
          freshForm.reset();
          $('roomCapacity').value = 1;
          ensureOption($('roomType'), 'Single');
          setTypeAndPreview();
          renderAll();
        }

        setButtonLoading(false);
        if (total > 0) alert(`${total} kamar/bed berhasil dibuat atau diupdate.`);
      }, 80);
    });
  }

  // Tunggu app.js selesai bind, lalu override secara bersih.
  window.setTimeout(bindStableGenerator, 0);
})();
