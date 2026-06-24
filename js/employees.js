function employeeTemplateRows() {
  return [
    { nama: 'Andi Saputra', nik: 'EMP001', jabatan: 'Staff', posisi: 'Cleaning Service Officer', office: 'Office Balikpapan', site: 'Site Melak', no_hp: '081234567890', status: 'Aktif' },
  ];
}

function employeeExportRows() {
  return state.employees.map((employee) => ({
    nama: employee.name,
    nik: employee.nik,
    jabatan: employee.level,
    posisi: employee.position,
    office: employee.office,
    site: employee.site || '',
    no_hp: employee.phone || '',
    status: normalizeEmployeeStatus(employee.status),
  }));
}

function importEmployees(rows) {
  let count = 0;
  rows.forEach((row) => {
    const name = text(row.nama || row.name || row.employee_name);
    const nik = text(row.nik || row.NIK);
    if (!name || !nik) return;

    createOrUpdateEmployee({
      name,
      nik,
      level: text(row.jabatan || row.level || 'Staff'),
      position: text(row.posisi || row.position),
      office: text(row.office || row.nama_office),
      site: text(row.site || row.lokasi || row.lokasi_penempatan || row.penempatan),
      phone: text(row.no_hp || row.phone || row.nohp),
      status: normalizeEmployeeStatus(row.status || row.Status || row.employee_status),
    });
    count += 1;
  });
  saveData(STORAGE_KEYS.employees, state.employees);
  alert(`${count} data karyawan berhasil diupload/update.`);
}

function handleEmployeeFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = file.name.toLowerCase().endsWith('.csv') ? parseCsv(String(reader.result)) : parseExcel(reader.result);
      importEmployees(rows);
      event.target.value = '';
      renderAll();
    } catch (error) {
      console.error(error);
      alert('File karyawan gagal dibaca. Pastikan header sesuai template.');
    }
  };
  file.name.toLowerCase().endsWith('.csv') ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
}

function renderEmployees() {
  const employees = state.employees.filter((employee) => matchesSearch([employee.name, employee.nik, employee.level, employee.position, employee.office, employee.site, employee.phone, normalizeEmployeeStatus(employee.status)]));
  if ($('employeeCountText')) $('employeeCountText').textContent = `${employees.length} data`;
  if ($('employeeTable')) {
    $('employeeTable').innerHTML = employees.length
      ? employees.map((employee) => `<tr><td>${employee.name}</td><td>${employee.nik}</td><td>${employee.level}</td><td>${employee.position}</td><td>${employee.office}</td><td>${employee.site || '-'}</td><td>${employee.phone || '-'}</td><td>${badge(normalizeEmployeeStatus(employee.status), isEmployeeActive(employee) ? 'ok' : 'danger')}</td></tr>`).join('')
      : emptyRow(8, 'Belum ada data karyawan');
  }
  if ($('employeeNames')) {
    $('employeeNames').innerHTML = state.employees.filter(isEmployeeActive).map((employee) => `<option value="${employee.name}"></option>`).join('');
  }
}

function initEmployeesMenu() {
  $('employeeForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const employee = createOrUpdateEmployee({
      name: text($('employeeName')?.value),
      nik: text($('employeeNik')?.value),
      level: $('employeeLevel')?.value || 'Staff',
      position: text($('employeePosition')?.value),
      office: text($('employeeOffice')?.value),
      site: text($('employeeSite')?.value),
      phone: text($('employeePhone')?.value),
      status: normalizeEmployeeStatus($('employeeStatus')?.value),
    });
    saveData(STORAGE_KEYS.employees, state.employees);

    if (pendingCheckinEmployeeName && key(employee.name) === key(pendingCheckinEmployeeName)) {
      fillCheckinEmployee(employee);
      pendingCheckinEmployeeName = '';
      event.target.reset();
      renderAll();
      showPage('checkin', 'Check In');
      alert('Data karyawan berhasil ditambahkan dan otomatis dipakai di form check in.');
      return;
    }

    event.target.reset();
    renderAll();
  });

  $('employeeFile')?.addEventListener('change', handleEmployeeFileUpload);
  $('downloadEmployeeTemplate')?.addEventListener('click', () => downloadWorkbook('template-upload-karyawan-mess.xlsx', employeeTemplateRows(), 'Template Karyawan'));
  $('downloadEmployeeData')?.addEventListener('click', () => downloadWorkbook('data-karyawan-mess.xlsx', employeeExportRows(), 'Data Karyawan'));
}
