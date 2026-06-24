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

  if (status === 'rusak') {
    alert('Untuk status rusak, buat kamar dulu dengan status bersih/kotor. Setelah itu ubah ke Rusak dari menu Status Kamar agar wajib mengisi keterangan kerusakan dan rencana selesai.');
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
