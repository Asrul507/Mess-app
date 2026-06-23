// Room generator override
// Patokan utama: No Kamar + Kapasitas.
// Kapasitas 1 => 102
// Kapasitas 2 => 102A, 102B
// Kapasitas 3 => 102A, 102B, 102C
// Tipe otomatis: Single / Sharing 2 / Sharing 3 / Sharing 4 / dst.

(function () {
  function getCapacity() {
    const value = Number(roomCapacity.value || 1);
    return Math.max(value, 1);
  }

  function getRoomTypeFromCapacity(capacity) {
    return capacity === 1 ? 'Single' : `Sharing ${capacity}`;
  }

  function getBedCode(index) {
    let result = '';
    let n = index + 1;
    while (n > 0) {
      const mod = (n - 1) % 26;
      result = String.fromCharCode(65 + mod) + result;
      n = Math.floor((n - 1) / 26);
    }
    return result;
  }

  function getPreviewRooms() {
    const baseRoom = String(roomNo.value || '').trim();
    const capacity = getCapacity();
    if (!baseRoom) return [];

    if (capacity === 1) return [baseRoom];
    return Array.from({ length: capacity }, (_, index) => `${baseRoom}${getBedCode(index)}`);
  }

  function ensurePreviewBox() {
    let box = document.getElementById('roomGeneratePreview');
    if (box) return box;

    box = document.createElement('div');
    box.id = 'roomGeneratePreview';
    box.className = 'room-generate-preview full';
    box.innerHTML = '<strong>Preview kamar/bed:</strong><div id="roomGeneratePreviewList" class="preview-list">Isi No Kamar dan Kapasitas dulu.</div>';

    const form = document.getElementById('roomForm');
    const submitButton = form?.querySelector('button[type="submit"]');
    if (form && submitButton) form.insertBefore(box, submitButton);
    return box;
  }

  function ensureLoadingBox() {
    let box = document.getElementById('roomGenerateLoading');
    if (box) return box;

    box = document.createElement('div');
    box.id = 'roomGenerateLoading';
    box.className = 'room-generate-loading hidden full';
    box.innerHTML = '<span class="spinner"></span><span>Sedang generate kamar, mohon tunggu...</span>';

    const form = document.getElementById('roomForm');
    const submitButton = form?.querySelector('button[type="submit"]');
    if (form && submitButton) form.insertBefore(box, submitButton);
    return box;
  }

  function updateRoomTypeAndPreview() {
    const capacity = getCapacity();
    if (roomType) {
      const autoType = getRoomTypeFromCapacity(capacity);
      const exists = Array.from(roomType.options).some((option) => option.value === autoType || option.textContent === autoType);
      if (!exists) roomType.add(new Option(autoType, autoType));
      roomType.value = autoType;
      roomType.disabled = true;
      roomType.title = 'Tipe otomatis mengikuti kapasitas';
    }

    const previewBox = ensurePreviewBox();
    const previewList = previewBox.querySelector('#roomGeneratePreviewList');
    const rooms = getPreviewRooms();

    if (!rooms.length) {
      previewList.innerHTML = 'Isi No Kamar dan Kapasitas dulu.';
      return;
    }

    previewList.innerHTML = rooms.map((room) => `<span>${room}</span>`).join('');
  }

  function setLoading(isLoading) {
    const box = ensureLoadingBox();
    const submitButton = document.querySelector('#roomForm button[type="submit"]');
    box.classList.toggle('hidden', !isLoading);
    if (submitButton) {
      submitButton.disabled = isLoading;
      submitButton.textContent = isLoading ? 'Generate...' : 'Simpan Kamar';
    }
  }

  function generateRoomsFromCapacityStrict() {
    const baseRoom = String(roomNo.value || '').trim();
    const capacity = getCapacity();
    const status = roomStatus.value || 'bersih';
    const building = String(roomBuilding.value || '').trim();
    const autoType = getRoomTypeFromCapacity(capacity);

    if (!baseRoom) {
      alert('No Kamar wajib diisi.');
      return 0;
    }

    let total = 0;
    for (let index = 0; index < capacity; index += 1) {
      const bedCode = capacity === 1 ? '' : getBedCode(index);
      createOrUpdateRoom({
        roomNo: baseRoom,
        bedCode,
        capacity: 1,
        type: autoType,
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

  function bindRoomGeneratorOverride() {
    const form = document.getElementById('roomForm');
    if (!form || form.dataset.generatorFixed === 'true') return;
    form.dataset.generatorFixed = 'true';

    if (bedCode) {
      bedCode.value = '';
      const bedLabel = bedCode.closest('label');
      if (bedLabel) bedLabel.style.display = 'none';
    }

    updateRoomTypeAndPreview();

    roomNo.addEventListener('input', updateRoomTypeAndPreview);
    roomCapacity.addEventListener('input', updateRoomTypeAndPreview);
    roomCapacity.addEventListener('change', updateRoomTypeAndPreview);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      setLoading(true);

      setTimeout(() => {
        const total = generateRoomsFromCapacityStrict();
        if (total > 0) {
          form.reset();
          roomCapacity.value = 1;
          bedCode.value = '';
          updateRoomTypeAndPreview();
          renderAll();
          alert(`${total} kamar/bed berhasil dibuat atau diupdate.`);
        }
        setLoading(false);
      }, 250);
    }, true);
  }

  bindRoomGeneratorOverride();
})();
