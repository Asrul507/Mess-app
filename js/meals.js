function mealReportRows() {
  const reportDate = $('mealReportDate')?.value || todayIso();
  const grouped = new Map();
  state.meals
    .filter((meal) => meal.date === reportDate)
    .forEach((meal) => {
      const keyValue = `${meal.date}|${meal.guestId || meal.guestName}`;
      if (!grouped.has(keyValue)) {
        grouped.set(keyValue, {
          tanggal: meal.date,
          nama: meal.guestName,
          kamar: meal.roomLabel,
          office: meal.office,
          pagi: '',
          siang: '',
          malam: '',
        });
      }
      grouped.get(keyValue)[key(meal.type)] = meal.time;
    });
  return Array.from(grouped.values()).filter((row) => matchesSearch([row.tanggal, row.nama, row.kamar, row.office, row.pagi, row.siang, row.malam])).sort((a, b) => a.nama.localeCompare(b.nama));
}

function renderMeals() {
  const mealDate = todayIso();
  if ($('mealTodayDateText')) $('mealTodayDateText').textContent = formatDate();
  if ($('mealReportDate') && !$('mealReportDate').value) $('mealReportDate').value = todayIso();

  const eligibleGuests = activeGuests().filter((guest) => guest.mealEligible === 'Ya' && matchesSearch([guest.name, roomLabel(roomOfGuest(guest)), guest.office]));
  if ($('mealQuickList')) {
    $('mealQuickList').innerHTML = eligibleGuests.length
      ? eligibleGuests.map((guest) => {
        const room = roomOfGuest(guest);
        return `<div class="meal-row"><div><strong>${guest.name}</strong><p>${roomLabel(room)} • ${guest.office}</p></div><div class="meal-buttons">${['Pagi', 'Siang', 'Malam'].map((type) => {
          const done = state.meals.some((meal) => meal.guestId === guest.id && meal.date === mealDate && meal.type === type);
          const doneMeal = state.meals.find((meal) => meal.guestId === guest.id && meal.date === mealDate && meal.type === type);
          return `<button class="meal-btn ${done ? 'done' : ''}" onclick="quickMeal('${guest.id}', '${type}')">${type}${done ? ` • ${doneMeal.time}` : ''}</button>`;
        }).join('')}</div></div>`;
      }).join('')
      : '<div class="empty-card">Belum ada penghuni yang dapat makan.</div>';
  }

  const rows = mealReportRows();
  if ($('mealReportTable')) {
    $('mealReportTable').innerHTML = rows.length
      ? rows.map((row) => `<tr><td>${row.tanggal}</td><td>${row.nama}</td><td>${row.kamar}</td><td>${row.office}</td><td>${row.pagi || '-'}</td><td>${row.siang || '-'}</td><td>${row.malam || '-'}</td></tr>`).join('')
      : emptyRow(7, 'Belum ada data absen makan pada tanggal ini');
  }
}

function quickMeal(guestId, type) {
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest) return;
  const date = todayIso();
  const exists = state.meals.some((meal) => meal.guestId === guestId && meal.date === date && meal.type === type);
  if (exists) return alert(`${guest.name} sudah absen makan ${type} hari ini.`);

  const room = roomOfGuest(guest);
  state.meals.push({
    id: uid(),
    guestId,
    guestName: guest.name,
    roomLabel: roomLabel(room),
    office: guest.office,
    type,
    date,
    time: currentTime(),
    createdAt: new Date().toISOString(),
  });
  saveData(STORAGE_KEYS.meals, state.meals);
  renderAll();
}

function initMealsMenu() {
  if ($('mealReportDate')) $('mealReportDate').value = todayIso();
  $('mealReportDate')?.addEventListener('change', renderMeals);
  $('downloadMealReport')?.addEventListener('click', () => {
    downloadWorkbook('rekap-absen-makan-mess.xlsx', mealReportRows(), 'Rekap Makan');
  });
}
