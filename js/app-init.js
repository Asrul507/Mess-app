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
  document.querySelectorAll('[data-quick-page]').forEach((button) => {
    button.addEventListener('click', () => showPage(button.dataset.quickPage, button.textContent));
  });
}

function initApp() {
  if ($('todayText')) $('todayText').textContent = formatDate();

  state.purposes = Array.from(new Set([...DEFAULT_PURPOSES, ...state.purposes]));
  saveData(STORAGE_KEYS.purposes, state.purposes);

  initNavigation();
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
