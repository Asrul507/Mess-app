function forecastDateValue() {
  return $('forecastDate')?.value || todayIso();
}

function isoAddDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoMonthStart(dateText) {
  return `${dateText.slice(0, 7)}-01`;
}

function isoDateRange(startDate, endDate) {
  const dates = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = isoAddDays(cursor, 1);
  }
  return dates;
}

function isGuestInHouseOnDate(guest, dateText) {
  if (!guest?.checkinDate || guest.checkinDate > dateText) return false;
  if (guest.status === 'In House') return true;
  if (guest.status === 'Check Out' && guest.checkoutDate) return guest.checkoutDate > dateText;
  return !guest.checkoutDate || guest.checkoutDate > dateText;
}

function forecastArrivalCount(dateText) {
  const checkinArrivals = state.guests.filter((guest) => guest.checkinDate === dateText).length;
  const reservedArrivals = state.reservations.filter((reservation) => {
    const status = reservation.status || 'Reserved';
    return reservation.date === dateText && status === 'Reserved';
  }).length;
  return checkinArrivals + reservedArrivals;
}

function forecastDepartureCount(dateText) {
  return state.guests.filter((guest) => guest.checkoutDate === dateText || guest.departureDate === dateText).length;
}

function forecastInHouseCount(dateText) {
  return state.guests.filter((guest) => isGuestInHouseOnDate(guest, dateText)).length;
}

function forecastDayStats(dateText) {
  const totalRooms = state.rooms.length || 0;
  const lastNightDate = isoAddDays(dateText, -1);
  const inHouse = forecastInHouseCount(dateText);
  const occPercent = totalRooms ? (inHouse / totalRooms) * 100 : 0;

  return {
    date: dateText,
    totalRooms,
    lastNight: forecastInHouseCount(lastNightDate),
    arrival: forecastArrivalCount(dateText),
    departure: forecastDepartureCount(dateText),
    inHouse,
    occPercent,
  };
}

function forecastMtdStats(dateText) {
  const monthStart = isoMonthStart(dateText);
  const dates = isoDateRange(monthStart, dateText);
  const totalRooms = state.rooms.length || 0;
  const dailyStats = dates.map(forecastDayStats);
  const roomNights = dailyStats.reduce((sum, day) => sum + day.inHouse, 0);
  const availableRoomNights = totalRooms * dates.length;
  const occPercent = availableRoomNights ? (roomNights / availableRoomNights) * 100 : 0;

  return {
    from: monthStart,
    to: dateText,
    days: dates.length,
    totalRooms,
    lastNightAvg: dailyStats.length ? dailyStats.reduce((sum, day) => sum + day.lastNight, 0) / dailyStats.length : 0,
    arrival: dailyStats.reduce((sum, day) => sum + day.arrival, 0),
    departure: dailyStats.reduce((sum, day) => sum + day.departure, 0),
    inHouseAvg: dailyStats.length ? roomNights / dailyStats.length : 0,
    roomNights,
    availableRoomNights,
    occPercent,
  };
}

function percentText(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function numberText(value) {
  return Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

function ensureForecastPage() {
  if ($('forecast')) return;
  const frontOfficeGroup = Array.from(document.querySelectorAll('.nav-group')).find((group) => key(group.querySelector('p')?.textContent) === 'front office');
  if (frontOfficeGroup && !document.querySelector('[data-page="forecast"]')) {
    const button = document.createElement('button');
    button.className = 'nav-btn';
    button.dataset.page = 'forecast';
    button.innerHTML = '<i class="fa-solid fa-chart-line" aria-hidden="true"></i><span>Forecast</span>';
    button.dataset.iconApplied = 'true';
    frontOfficeGroup.appendChild(button);
  }

  const main = document.querySelector('.main');
  if (!main) return;
  const section = document.createElement('section');
  section.id = 'forecast';
  section.className = 'page';
  section.innerHTML = `<article class="card forecast-filter-card"><div class="section-title"><div><h3>Forecast</h3><p>Forecast Front Office berdasarkan tanggal filter.</p></div><label>Filter Tanggal<input type="date" id="forecastDate" /></label></div></article><div class="grid cards forecast-cards"><article class="card stat-card"><p>Last Night</p><strong id="forecastLastNight">0</strong></article><article class="card stat-card"><p>Arrival</p><strong id="forecastArrival">0</strong></article><article class="card stat-card"><p>Departure</p><strong id="forecastDeparture">0</strong></article><article class="card stat-card"><p>In House</p><strong id="forecastInHouse">0</strong></article></div><div class="grid two-col forecast-grid"><article class="card"><div class="section-title"><h3>Occupancy</h3><span id="forecastRoomBase">0 kamar</span></div><div class="forecast-occ"><strong id="forecastOcc">0.0%</strong><span>Occ sesuai tanggal filter</span></div></article><article class="card"><div class="section-title"><h3>MTD</h3><span id="forecastMtdRange">-</span></div><div class="forecast-occ"><strong id="forecastMtdOcc">0.0%</strong><span>Occ MTD sampai tanggal filter</span></div></article></div><article class="card"><div class="section-title"><h3>Forecast Table</h3><span id="forecastSummaryText">Daily & MTD</span></div><div class="table-wrap"><table><thead><tr><th>Periode</th><th>Last Night</th><th>Arrival</th><th>Departure</th><th>In House</th><th>Room Available</th><th>Room Night</th><th>Occ %</th></tr></thead><tbody id="forecastTable"></tbody></table></div></article>`;
  main.appendChild(section);
}

function renderForecast() {
  ensureForecastPage();
  const dateInput = $('forecastDate');
  if (dateInput && !dateInput.value) dateInput.value = todayIso();
  const dateText = forecastDateValue();
  const daily = forecastDayStats(dateText);
  const mtd = forecastMtdStats(dateText);

  if ($('forecastLastNight')) $('forecastLastNight').textContent = daily.lastNight;
  if ($('forecastArrival')) $('forecastArrival').textContent = daily.arrival;
  if ($('forecastDeparture')) $('forecastDeparture').textContent = daily.departure;
  if ($('forecastInHouse')) $('forecastInHouse').textContent = daily.inHouse;
  if ($('forecastOcc')) $('forecastOcc').textContent = percentText(daily.occPercent);
  if ($('forecastMtdOcc')) $('forecastMtdOcc').textContent = percentText(mtd.occPercent);
  if ($('forecastRoomBase')) $('forecastRoomBase').textContent = `${daily.totalRooms} kamar/bed tersedia`;
  if ($('forecastMtdRange')) $('forecastMtdRange').textContent = `${mtd.from} s/d ${mtd.to}`;
  if ($('forecastSummaryText')) $('forecastSummaryText').textContent = `Tanggal ${dateText}`;

  if ($('forecastTable')) {
    $('forecastTable').innerHTML = `
      <tr><td>Daily ${dateText}</td><td>${daily.lastNight}</td><td>${daily.arrival}</td><td>${daily.departure}</td><td>${daily.inHouse}</td><td>${daily.totalRooms}</td><td>${daily.inHouse}</td><td>${percentText(daily.occPercent)}</td></tr>
      <tr><td>MTD ${mtd.from} - ${mtd.to}</td><td>${numberText(mtd.lastNightAvg)} avg</td><td>${mtd.arrival}</td><td>${mtd.departure}</td><td>${numberText(mtd.inHouseAvg)} avg</td><td>${mtd.availableRoomNights}</td><td>${mtd.roomNights}</td><td>${percentText(mtd.occPercent)}</td></tr>
    `;
  }
}

function initForecastMenu() {
  ensureForecastPage();
  if ($('forecastDate')) $('forecastDate').value = todayIso();
  $('forecastDate')?.addEventListener('change', renderForecast);

  const forecastButton = document.querySelector('[data-page="forecast"]');
  if (forecastButton && !forecastButton.dataset.forecastNavReady) {
    forecastButton.addEventListener('click', () => {
      showPage('forecast', 'Forecast');
      document.querySelectorAll('.nav-btn').forEach((item) => item.classList.toggle('active', item === forecastButton));
      renderForecast();
    });
    forecastButton.dataset.forecastNavReady = 'true';
  }
  renderForecast();
}
