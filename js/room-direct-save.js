function directBedCode(index) {
  let result = '';
  let number = index + 1;
  while (number > 0) {
    const mod = (number - 1) % 26;
    result = String.fromCharCode(65 + mod) + result;
    number = Math.floor((number - 1) / 26);
  }
  return result;
}

function directRoomType(capacity) {
  return capacity === 1 ? 'Single' : `Sharing ${capacity}`;
}

function saveRoomDirect() {
  const button = document.getElementById('saveRoomBtn');
  const form = document.getElementById('roomForm');
  const roomNoInput = document.getElementById('roomNo');
  const capacityInput = document.getElementById('roomCapacity');
  const statusInput = document.getElementById('roomStatus');
  const buildingInput = document.getElementById('roomBuilding');
  const roomTypeInput = document.getElementById('roomType');

  const baseRoom = String(roomNoInput?.value || '').trim();
  const capacity = Math.max(Number(capacityInput?.value || 1), 1);
  const type = directRoomType(capacity);
  const status = statusInput?.value || 'bersih';
  const building = String(buildingInput?.value || '').trim();

  if (!baseRoom) {
    alert('No Kamar wajib diisi.');
    roomNoInput?.focus();
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'Menyimpan...';
  }

  try {
    let total = 0;
    for (let index = 0; index < capacity; index += 1) {
      createOrUpdateRoom({
        roomNo: baseRoom,
        bedCode: capacity === 1 ? '' : directBedCode(index),
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

    if (form) form.reset();
    if (capacityInput) capacityInput.value = 1;
    if (roomTypeInput) roomTypeInput.value = 'Single';
    if (typeof updateRoomPreview === 'function') updateRoomPreview();
    if (typeof renderAll === 'function') renderAll();

    alert(`${total} kamar/bed berhasil dibuat atau diupdate.`);
  } catch (error) {
    console.error(error);
    alert('Gagal menyimpan kamar. Coba refresh halaman lalu ulangi.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Simpan Kamar';
    }
  }
}
