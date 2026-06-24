function renderMeals() {
  const mealDate = $('mealQuickDate')?.value || todayIso();
  if ($('mealQuickDate') && !$('mealQuickDate').value) $('mealQuickDate').value = todayIso();
  if ($('mealReportDate') && !$('mealReportDate').value) $('mealReportDate').value = todayIso();

  const eligibleGuests = activeGuests().filter((guest) => guest.mealEligible === 'Ya');
  if ($('mealQuickList')) {
    $('mealQuickList').innerHTML = eligibleGuests.length
      ? eligibleGuests.map((guest) => {
        const room = roomOfGuest(guest);
        return `<div class="meal-row"><div><strong>${guest.name}</strong><p>${roomLabel(room)} • ${guest.office}</p></div><div class="meal-buttons">${['Pagi', 'Siang', 'Malam'].map((type) => {
          const done = state.meals.some((meal) => meal.guestId === guest.id && meal.date === mealDate && meal.type === type);
          return `<button class="meal-btn ${done ? 'done' : ''}" onclick="quickMeal('${guest.id}', '${type}')">${type}${done ? ' ✓' : ''}</button>`;
        }).join('')}</div></div>`;
      }).join('')
      : '<div class="empty-card">Belum ada penghuni yang dapat makan.</div>';
  }

  const reportDate = $('mealReportDate')?.value;
  const rows = state.meals.filter((meal) => !reportDate || meal.date === reportDate);
  if ($('mealReportTable')) {
    $('mealReportTable').innerHTML = rows.length
      ? rows.slice().reverse().map((meal) => `<tr><td>${meal.date}</td><td>${meal.guestName}</td><td>${meal.roomLabel}</td><td>${meal.office}</td><td>${meal.type}</td><td>${meal.time}</td></tr>`).join('')
      : emptyRow(6, 'Belum ada data absen makan');
  }
}

function quickMeal(guestId, type) {
  const guest = state.guests.find((item) => item.id === guestId);
  if (!guest) return;
  const date = $('mealQuickDate')?.value || todayIso();
  const exists = state.meals.some((meal) => meal.guestId === guestId && meal.date === date && meal.type === type);
  if (exists) return alert(`${guest.name} sudah absen makan ${type}.`);

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
  if ($('mealQuickDate')) $('mealQuickDate').value = todayIso();
  if ($('mealReportDate')) $('mealReportDate').value = todayIso();
  $('mealQuickDate')?.addEventListener('change', renderMeals);
  $('mealReportDate')?.addEventListener('change', renderMeals);
  $('downloadMealReport')?.addEventListener('click', () => {
    const reportDate = $('mealReportDate')?.value;
    const rows = state.meals.filter((meal) => !reportDate || meal.date === reportDate);
    downloadWorkbook('rekap-absen-makan-mess.xlsx', rows, 'Rekap Makan');
  });
}
