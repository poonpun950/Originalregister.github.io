
// ===== CONFIG =====
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyN0Z-tWKzdAfKUBfQFpRPIpP5CFp1I8G57m4E0J_-owAvWQokkgcpAWZvGA1ekI77eKg/exec';

// ===== DATA STORE =====
let appData = {
  students: [],
  attendance: {},
  loaded: false
};

// ===== INIT =====
window.onload = () => {
  setTodayDate();
  startClock();
  loadAllData();
};

function setTodayDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth()+1).padStart(2,'0');
  const d = String(today.getDate()).padStart(2,'0');
  document.getElementById('checkin-date').value = `${y}-${m}-${d}`;
}

function startClock() {
  const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์'];
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  function update() {
    const now = new Date();
    document.getElementById('clock-day').textContent = 'วัน' + days[now.getDay()];
    document.getElementById('clock-date').textContent =
      `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()+543}`;
    const hh = String(now.getHours()).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    const ss = String(now.getSeconds()).padStart(2,'0');
    document.getElementById('clock-time').textContent = `${hh}:${mm}:${ss}`;
  }
  update();
  setInterval(update, 1000);
}

// ===== NAVIGATION =====
function showPage(id, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  if (navEl) navEl.classList.add('active');

  // Load page-specific data
  if (id === 'statistics') loadStudentsForStats();
  if (id === 'students-list') renderStudentList();
  if (id === 'dashboard') updateDashboard();

  // Close sidebar + overlay on mobile
  if (window.innerWidth <= 768) closeSidebar();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('open')) {
    closeSidebar();
  } else {
    sidebar.classList.add('open');
    document.body.classList.add('sidebar-open');
    document.body.style.overflow = 'hidden';
  }
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.body.classList.remove('sidebar-open');
  document.body.style.overflow = '';
}

// คลิก overlay (body::after) เพื่อปิด sidebar
document.addEventListener('click', function(e) {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.querySelector('.menu-toggle');
  if (
    document.body.classList.contains('sidebar-open') &&
    !sidebar.contains(e.target) &&
    !toggle.contains(e.target)
  ) {
    closeSidebar();
  }
});

// ===== JSONP HELPER =====
function jsonpRequest(params) {
  return new Promise((resolve, reject) => {
    const cbName = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const timeout = setTimeout(() => {
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
      reject(new Error('Request timeout'));
    }, 15000);

    window[cbName] = (data) => {
      clearTimeout(timeout);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(data);
    };

    const qs = Object.entries({...params, callback: cbName})
      .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(typeof v === 'object' ? JSON.stringify(v) : v)}`)
      .join('&');

    const script = document.createElement('script');
    script.src = `${SCRIPT_URL}?${qs}`;
    script.onerror = () => {
      clearTimeout(timeout);
      delete window[cbName];
      reject(new Error('Script load error'));
    };
    document.head.appendChild(script);
  });
}

// ===== LOAD DATA =====
async function loadAllData() {
  try {
    const res = await jsonpRequest({ action: 'getData' });
    if (res && res.students) {
      appData.students = res.students || [];
      appData.attendance = res.attendance || {};
      appData.loaded = true;
      updateBadge();
      updateDashboard();
      renderStudentList();
      renderStatsTable();
    }
  } catch(e) {
    console.warn('Load failed, using local data:', e);
    // Use demo data if can't connect
    appData.students = [
      {id:'s001', number:1, name:'นาย ธนภัทร สุขสวัสดิ์', class:'ม.1'},
      {id:'s002', number:2, name:'นางสาว มัลลิกา ดวงดี', class:'ม.1'},
      {id:'s003', number:3, name:'นาย อภิสิทธิ์ ทองแท้', class:'ม.1'},
      {id:'s004', number:1, name:'นาย พีรพัฒน์ แก้วใส', class:'ม.2'},
      {id:'s005', number:2, name:'นางสาว สุภาพร รุ่งเรือง', class:'ม.2'},
    ];
    appData.loaded = true;
    updateBadge();
    updateDashboard();
  }
}

function updateBadge() {
  document.getElementById('total-badge').textContent = appData.students.length;
  document.getElementById('dash-total').textContent = appData.students.length;
}

function updateDashboard() {
  const today = document.getElementById('checkin-date').value;
  const todayAtt = appData.attendance[today] || [];

  // นับสถิติวันนี้สำหรับ card หน้าหลัก
  let p=0, l=0, lv=0, ab=0;
  todayAtt.forEach(a => {
    if(a.status==='present') p++;
    else if(a.status==='late') l++;
    else if(a.status==='leave') lv++;
    else if(a.status==='absent') ab++;
  });

  // ถ้าวันนี้ไม่มีข้อมูล ให้นับจากทุกวันแทน
  if (todayAtt.length === 0) {
    Object.values(appData.attendance).forEach(dayRecs => {
      dayRecs.forEach(a => {
        if(a.status==='present') p++;
        else if(a.status==='late') l++;
        else if(a.status==='leave') lv++;
        else if(a.status==='absent') ab++;
      });
    });
  }

  document.getElementById('dash-present').textContent = p;
  document.getElementById('dash-late').textContent = l;
  document.getElementById('dash-leave').textContent = lv;
  document.getElementById('dash-absent').textContent = ab;

  const days = Object.keys(appData.attendance).length;
  document.getElementById('dash-checkin-days').textContent = days > 0 ? days + ' วัน' : '—';

  const total = p + l + lv + ab;
  if (total > 0) {
    const rate = Math.round((p / total) * 100);
    document.getElementById('dash-rate').textContent = rate + '%';
  } else {
    document.getElementById('dash-rate').textContent = '—';
  }
}

// ===== CHECK-IN =====
async function loadStudentsForCheckin() {
  const cls = document.getElementById('checkin-class').value;
  const wrap = document.getElementById('checkin-table-wrap');
  const saveSection = document.getElementById('checkin-save-section');

  if (!cls) {
    wrap.innerHTML = `<div class="empty-state"><i class="fas fa-arrow-up"></i><p>กรุณาเลือกชั้นเรียนก่อน</p></div>`;
    saveSection.style.display = 'none';
    return;
  }

  wrap.innerHTML = `<div class="empty-state"><div class="spinner"></div><p>กำลังโหลดรายชื่อ...</p></div>`;

  // Filter students
  const students = appData.students.filter(s => s.class === cls).sort((a,b) => (a.number||0)-(b.number||0));
  const date = document.getElementById('checkin-date').value;
  const prevAtt = appData.attendance[date] || [];

  if (students.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><i class="fas fa-user-slash"></i><p>ไม่พบนักเรียนในชั้น ${cls}<br><a onclick="showPage('addstudent',null)" style="color:var(--accent-blue);cursor:pointer;">+ เพิ่มนักเรียน</a></p></div>`;
    saveSection.style.display = 'none';
    return;
  }

  let html = `
    <table class="attendance-table">
      <thead>
        <tr>
          <th>เลขที่</th>
          <th>ชื่อ-สกุล</th>
          <th>สถานะ</th>
        </tr>
      </thead>
      <tbody>`;

  students.forEach(s => {
    const prev = prevAtt.find(a => a.student_id === s.id);
    const currentStatus = prev ? prev.status : 'present';
    html += `
      <tr class="student-row">
        <td><span class="student-num">${s.number || '—'}</span></td>
        <td><span class="student-name">${s.name}</span></td>
        <td>
          <div class="status-group">
            <input type="radio" class="status-radio" name="status_${s.id}" id="p_${s.id}" value="present" ${currentStatus==='present'?'checked':''}>
            <label class="status-label" for="p_${s.id}"><i class="fas fa-check"></i> มา</label>

            <input type="radio" class="status-radio" name="status_${s.id}" id="l_${s.id}" value="late" ${currentStatus==='late'?'checked':''}>
            <label class="status-label" for="l_${s.id}"><i class="fas fa-clock"></i> สาย</label>

            <input type="radio" class="status-radio" name="status_${s.id}" id="lv_${s.id}" value="leave" ${currentStatus==='leave'?'checked':''}>
            <label class="status-label" for="lv_${s.id}"><i class="fas fa-file-alt"></i> ลา</label>

            <input type="radio" class="status-radio" name="status_${s.id}" id="ab_${s.id}" value="absent" ${currentStatus==='absent'?'checked':''}>
            <label class="status-label" for="ab_${s.id}"><i class="fas fa-times"></i> ขาด</label>
          </div>
        </td>
      </tr>`;
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
  saveSection.style.display = 'block';
  updateCheckinCount();

  // Update count on change
  document.querySelectorAll('[name^="status_"]').forEach(r => {
    r.addEventListener('change', updateCheckinCount);
  });
}

function updateCheckinCount() {
  const cls = document.getElementById('checkin-class').value;
  const students = appData.students.filter(s => s.class === cls);
  const p = document.querySelectorAll('[name^="status_"][value="present"]:checked').length;
  const l = document.querySelectorAll('[name^="status_"][value="late"]:checked').length;
  const lv = document.querySelectorAll('[name^="status_"][value="leave"]:checked').length;
  const ab = document.querySelectorAll('[name^="status_"][value="absent"]:checked').length;
  const info = document.getElementById('checkin-count-info');
  if (info) info.innerHTML = `<span style="color:var(--success)">มา ${p}</span> · <span style="color:var(--warning)">สาย ${l}</span> · <span style="color:var(--info)">ลา ${lv}</span> · <span style="color:var(--danger)">ขาด ${ab}</span>`;
}

function setAllStatus(status) {
  document.querySelectorAll(`[name^="status_"][value="${status}"]`).forEach(r => {
    r.checked = true;
  });
  updateCheckinCount();
}

async function saveAttendance() {
  const date = document.getElementById('checkin-date').value;
  const cls = document.getElementById('checkin-class').value;
  if (!date || !cls) {
    Swal.fire({ icon:'warning', title:'แจ้งเตือน', text:'กรุณาเลือกวันที่และชั้นเรียน', confirmButtonText:'ตกลง' });
    return;
  }

  const students = appData.students.filter(s => s.class === cls);
  const records = [];
  students.forEach(s => {
    const checked = document.querySelector(`[name="status_${s.id}"]:checked`);
    if (checked) records.push({ student_id: s.id, status: checked.value, name: s.name, class: s.class, number: s.number });
  });

  if (records.length === 0) {
    Swal.fire({ icon:'warning', title:'ไม่มีข้อมูล', text:'ไม่พบรายชื่อนักเรียน', confirmButtonText:'ตกลง' });
    return;
  }

  Swal.fire({
    title: 'กำลังบันทึก...',
    html: '<div class="spinner" style="margin:0 auto"></div><br>กรุณารอสักครู่',
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const res = await jsonpRequest({
      action: 'saveAttendance',
      date: date,
      class: cls,
      records: JSON.stringify(records)
    });

    // Update local data
    appData.attendance[date] = appData.attendance[date] || [];
    // Remove old records for this class/date
    appData.attendance[date] = appData.attendance[date].filter(a => {
      const st = appData.students.find(s => s.id === a.student_id);
      return st && st.class !== cls;
    });
    records.forEach(r => appData.attendance[date].push({ student_id: r.student_id, status: r.status }));

    Swal.fire({
      icon: 'success',
      title: 'บันทึกสำเร็จ! ✓',
      html: `<b>เช็คชื่อ ${cls} วันที่ ${date}</b><br>บันทึกข้อมูล ${records.length} คน เรียบร้อย`,
      confirmButtonText: 'ตกลง',
      timer: 3000
    });

    updateDashboard();
  } catch(e) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      html: `ไม่สามารถเชื่อมต่อ Google Sheets ได้<br><small style="color:#888">${e.message}</small>`,
      confirmButtonText: 'ลองใหม่'
    });
  }
}

// ===== ADD STUDENT =====
async function addStudent() {
  const num = document.getElementById('add-num').value.trim();
  const name = document.getElementById('add-name').value.trim();
  const cls = document.getElementById('add-class').value;

  if (!num || !name || !cls) {
    Swal.fire({ icon:'warning', title:'ข้อมูลไม่ครบ', text:'กรุณากรอกข้อมูลให้ครบทุกช่อง', confirmButtonText:'ตกลง' });
    return;
  }

  // Check duplicate
  const duplicate = appData.students.find(s => s.class === cls && String(s.number) === String(num));
  if (duplicate) {
    Swal.fire({ icon:'error', title:'เลขที่ซ้ำ', text:`เลขที่ ${num} ในชั้น ${cls} มีอยู่แล้ว (${duplicate.name})`, confirmButtonText:'ตกลง' });
    return;
  }

  Swal.fire({
    title: 'กำลังบันทึก...',
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading()
  });

  const studentId = 's' + Date.now();
  const student = { id: studentId, number: parseInt(num), name, class: cls };

  try {
    const res = await jsonpRequest({
      action: 'addStudent',
      student: JSON.stringify(student)
    });

    appData.students.push(student);
    updateBadge();
    renderStudentList();

    document.getElementById('add-num').value = '';
    document.getElementById('add-name').value = '';
    document.getElementById('add-class').value = '';

    Swal.fire({
      icon: 'success',
      title: 'เพิ่มนักเรียนเรียบร้อย! ✓',
      html: `<b>${name}</b><br>ชั้น ${cls} เลขที่ ${num}`,
      confirmButtonText: 'ตกลง',
      timer: 3000
    });
  } catch(e) {
    // Add locally if server fails
    appData.students.push(student);
    updateBadge();
    renderStudentList();

    document.getElementById('add-num').value = '';
    document.getElementById('add-name').value = '';
    document.getElementById('add-class').value = '';

    Swal.fire({
      icon: 'warning',
      title: 'บันทึกในระบบชั่วคราว',
      html: `เพิ่ม <b>${name}</b> เรียบร้อยแล้ว<br><small style="color:#888">หมายเหตุ: ไม่สามารถซิงค์กับ Google Sheets ได้</small>`,
      confirmButtonText: 'ตกลง'
    });
  }
}

// ===== STUDENT LIST =====
function renderStudentList() {
  const wrap = document.getElementById('students-list-table-wrap');
  if (!wrap) return;

  const filter = document.getElementById('list-class-filter') ? document.getElementById('list-class-filter').value : '';
  let students = filter ? appData.students.filter(s => s.class === filter) : appData.students;
  students = [...students].sort((a,b) => {
    if (a.class < b.class) return -1;
    if (a.class > b.class) return 1;
    return (a.number||0) - (b.number||0);
  });

  if (students.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><i class="fas fa-user-slash"></i><p>ไม่พบข้อมูลนักเรียน</p></div>`;
    return;
  }

  let html = `
    <table class="stats-table">
      <thead>
        <tr>
          <th>เลขที่</th>
          <th>ชื่อ-สกุล</th>
          <th>ชั้นเรียน</th>
          <th style="text-align:right; padding-right:20px;">จัดการ</th>
        </tr>
      </thead>
      <tbody>`;

  students.forEach(s => {
    html += `
      <tr>
        <td><span class="student-num">${s.number || '—'}</span></td>
        <td style="font-weight:500">${s.name}</td>
        <td><span style="background:rgba(59,130,246,0.15);color:var(--accent-blue-bright);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">${s.class}</span></td>
        <td style="text-align:right; padding-right:16px;">
          <button onclick="deleteStudent('${s.id}')" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:var(--danger);padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-family:inherit;">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function deleteStudent(id) {
  const student = appData.students.find(s => s.id === id);
  if (!student) return;

  Swal.fire({
    title: 'ยืนยันการลบ?',
    html: `ลบ <b>${student.name}</b><br><small style="color:#94a3b8">ชั้น ${student.class} เลขที่ ${student.number}</small>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: '<i class="fas fa-trash"></i> ลบเลย',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#374151'
  }).then(async result => {
    if (!result.isConfirmed) return;

    // แสดง loading ระหว่างรอ
    Swal.fire({
      title: 'กำลังลบ...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // ส่งคำสั่งลบไปยัง Google Sheets
      await jsonpRequest({ action: 'deleteStudent', id: id });
    } catch(e) {
      console.warn('GAS delete failed, removing locally only:', e);
    }

    // ลบออกจาก local data ไม่ว่า GAS จะสำเร็จหรือไม่
    appData.students = appData.students.filter(s => s.id !== id);
    updateBadge();
    renderStudentList();

    Swal.fire({
      icon: 'success',
      title: 'ลบเรียบร้อย!',
      html: `ลบ <b>${student.name}</b> ออกจากระบบแล้ว`,
      timer: 2000,
      showConfirmButton: false
    });
  });
}

// ===== STATISTICS =====
function loadStudentsForStats() {
  loadAllData().then(() => {
    renderStatsTable();
  }).catch(() => {
    renderStatsTable();
  });
}

function renderStatsTable() {
  const wrap = document.getElementById('stats-table-wrap');
  if (!wrap) return;

  const filter = document.getElementById('stat-class-filter') ? document.getElementById('stat-class-filter').value : '';
  let students = filter ? appData.students.filter(s => s.class === filter) : appData.students;
  students = [...students].sort((a,b) => {
    if (a.class < b.class) return -1;
    if (a.class > b.class) return 1;
    return (a.number||0)-(b.number||0);
  });

  // Compute stats per student
  let totalP=0,totalL=0,totalLv=0,totalAb=0;
  const studentStats = students.map(s => {
    let p=0,l=0,lv=0,ab=0;
    Object.values(appData.attendance).forEach(dayRecords => {
      dayRecords.forEach(rec => {
        if (rec.student_id === s.id) {
          if (rec.status==='present') p++;
          else if (rec.status==='late') l++;
          else if (rec.status==='leave') lv++;
          else if (rec.status==='absent') ab++;
        }
      });
    });
    totalP+=p; totalL+=l; totalLv+=lv; totalAb+=ab;
    const total = p+l+lv+ab;
    const rate = total > 0 ? Math.round((p/total)*100) : 0;
    return {...s, p, l, lv, ab, total, rate};
  });

  // Update summary
  document.getElementById('stat-total-present').textContent = totalP;
  document.getElementById('stat-total-late').textContent = totalL;
  document.getElementById('stat-total-leave').textContent = totalLv;
  document.getElementById('stat-total-absent').textContent = totalAb;

  if (studentStats.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><p>ยังไม่มีข้อมูลสถิติ</p></div>`;
    return;
  }

  let html = `
    <table class="stats-table">
      <thead>
        <tr>
          <th>เลขที่</th>
          <th>ชื่อ-สกุล</th>
          <th>ชั้น</th>
          <th style="text-align:center"><i class="fas fa-check" style="color:var(--success)"></i> มา</th>
          <th style="text-align:center"><i class="fas fa-clock" style="color:var(--warning)"></i> สาย</th>
          <th style="text-align:center"><i class="fas fa-file-alt" style="color:var(--info)"></i> ลา</th>
          <th style="text-align:center"><i class="fas fa-times" style="color:var(--danger)"></i> ขาด</th>
          <th>อัตรา</th>
        </tr>
      </thead>
      <tbody>`;

  studentStats.forEach(s => {
    const total = s.total || 1;
    html += `
      <tr>
        <td><span class="student-num">${s.number||'—'}</span></td>
        <td style="font-weight:500">${s.name}</td>
        <td><span style="background:rgba(59,130,246,0.12);color:var(--accent-blue-bright);padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700">${s.class}</span></td>
        <td style="text-align:center"><span class="status-pill pill-present">${s.p}</span></td>
        <td style="text-align:center"><span class="status-pill pill-late">${s.l}</span></td>
        <td style="text-align:center"><span class="status-pill pill-leave">${s.lv}</span></td>
        <td style="text-align:center"><span class="status-pill pill-absent">${s.ab}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="mini-bar-wrap">
              <div class="mini-bar" style="width:${(s.p/total*100).toFixed(0)}%;background:var(--success)"></div>
              <div class="mini-bar" style="width:${(s.l/total*100).toFixed(0)}%;background:var(--warning)"></div>
              <div class="mini-bar" style="width:${(s.lv/total*100).toFixed(0)}%;background:var(--info)"></div>
              <div class="mini-bar" style="width:${(s.ab/total*100).toFixed(0)}%;background:var(--danger)"></div>
            </div>
            <span style="font-size:11px;font-weight:700;color:${s.rate>=80?'var(--success)':s.rate>=60?'var(--warning)':'var(--danger)'}">${s.total>0?s.rate+'%':'—'}</span>
          </div>
        </td>
      </tr>`;
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
}

// ===== TOAST =====
function showToast(msg, type='success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':'exclamation-circle'}"></i><span style="font-size:13px">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ===== SEARCH =====
function handleSearch(val) {
  if (val.length > 1) {
    const results = appData.students.filter(s => s.name.includes(val));
    showToast(`พบ ${results.length} คนที่ตรงกับ "${val}"`, 'success');
  }
}

// ===== EXPORT =====
function exportData() {
  const rows = [['วันที่', 'รหัสนักเรียน', 'ชื่อ', 'ชั้น', 'เลขที่', 'สถานะ']];
  Object.entries(appData.attendance).forEach(([date, records]) => {
    records.forEach(r => {
      const s = appData.students.find(st => st.id === r.student_id);
      if (s) rows.push([date, s.id, s.name, s.class, s.number, r.status]);
    });
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'attendance_export.csv'; a.click();
  showToast('ส่งออกข้อมูลสำเร็จ', 'success');
}


