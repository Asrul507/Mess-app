function initNavigation() {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => showPage(button.dataset.page, button.textContent));
  });
}

function initApp() {
  if ($('todayText')) $('todayText').textContent = formatDate();

  state.purposes = Array.from(new Set([...DEFAULT_PURPOSES, ...state.purposes]));
  saveData(STORAGE_KEYS.purposes, state.purposes);

  initNavigation();
  if (typeof prepareRoomMenuUi === 'function') prepareRoomMenuUi();
  initRoomsMenu();
  initEmployeesMenu();
  initCheckinMenu();
  initMealsMenu();
  initReportsMenu();

  renderAll();
}

initApp();
