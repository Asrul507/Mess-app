function loadLayoutFixes() {
  if (document.querySelector('link[data-layout-fixes]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'layout-fixes.css?v=15';
  link.dataset.layoutFixes = 'true';
  document.head.appendChild(link);
}

function loadFontAwesome() {
  if (document.querySelector('link[data-font-awesome]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
  link.referrerPolicy = 'no-referrer';
  link.dataset.fontAwesome = 'true';
  document.head.appendChild(link);
}

function navIconClass(button) {
  const page = button.dataset.page || button.dataset.quickPage || '';
  const roomOpen = button.dataset.roomOpen || '';
  const label = key(button.textContent);

  if (page === 'dashboard') return 'fa-chart-pie';
  if (page === 'guest-report') return 'fa-clipboard-list';
  if (page === 'stay-report') return 'fa-bed';
  if (page === 'checkin') return 'fa-right-to-bracket';
  if (page === 'inhouse') return 'fa-house-user';
  if (page === 'checkout') return 'fa-right-from-bracket';
  if (page === 'reservations') return 'fa-calendar-check';
  if (page === 'meal') return 'fa-utensils';
  if (page === 'meal-report') return 'fa-file-lines';
  if (page === 'employees') return 'fa-users';
  if (page === 'rooms' && roomOpen === 'overview') return 'fa-building';
  if (page === 'rooms' && roomOpen === 'status') return 'fa-door-open';
  if (page === 'rooms' && roomOpen === 'broken') return 'fa-screwdriver-wrench';
  if (page === 'rooms' && roomOpen === 'add') return 'fa-square-plus';
  if (label.includes('check in')) return 'fa-right-to-bracket';
  if (label.includes('in house')) return 'fa-house-user';
  if (label.includes('absen')) return 'fa-utensils';
  return 'fa-circle-dot';
}

function applyButtonIcon(button, iconClass) {
  if (!button || button.dataset.iconApplied === 'true') return;
  const label = text(button.textContent).replace(/^←\s*/, '');
  button.innerHTML = `<i class="fa-solid ${iconClass}" aria-hidden="true"></i><span>${label}</span>`;
  button.dataset.iconApplied = 'true';
}

function decorateAppIcons() {
  document.querySelectorAll('.nav-btn').forEach((button) => applyButtonIcon(button, navIconClass(button)));
  document.querySelectorAll('[data-quick-page]').forEach((button) => applyButtonIcon(button, navIconClass(button)));
  applyButtonIcon($('backBtn'), 'fa-arrow-left');

  const searchIcon = document.querySelector('.global-search span');
  if (searchIcon) searchIcon.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';
}

function initNavigation() {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => {
      showPage(button.dataset.page, button.textContent);
      document.querySelectorAll('.nav-btn').forEach((item) => item.classList.toggle('active', item === button));
      if (button.dataset.roomOpen && typeof openRoomTab === 'function') openRoomTab(button.dataset.roomOpen);
    });
  });
  $('backBtn')?.addEventListener('click', goBackPage);
  $('globalSearch')?.addEventListener('input', renderAll);
  document.addEventListener('click', () => { if (typeof closeInhouseMenus === 'function') closeInhouseMenus(); });
  document.querySelectorAll('[data-quick-page]').forEach((button) => {
    button.addEventListener('click', () => showPage(button.dataset.quickPage, button.textContent));
  });
}

async function initApp() {
  loadLayoutFixes();
  loadFontAwesome();

  if ($('todayText')) $('todayText').textContent = formatDate();

  if (typeof initRemoteDataSync === 'function') await initRemoteDataSync();

  state.purposes = Array.from(new Set([...DEFAULT_PURPOSES, ...state.purposes]));
  saveData(STORAGE_KEYS.purposes, state.purposes);

  initNavigation();
  decorateAppIcons();
  if (typeof prepareRoomMenuUi === 'function') prepareRoomMenuUi();
  initRoomsMenu();
  if (typeof initReservationsMenu === 'function') initReservationsMenu();
  initEmployeesMenu();
  initCheckinMenu();
  initMealsMenu();
  initReportsMenu();

  renderAll();
}

initApp();
