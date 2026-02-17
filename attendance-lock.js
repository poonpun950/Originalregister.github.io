const LABELS = {
    present: '✅ มา',
    late:    '⏰ สาย',
    leave:   '📄 ลา',
    absent:  '❌ ขาด'
};

function getTodayStr() {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
}

function getLockedStatus(studentId) {
    const dayAtt = appData.attendance[getTodayStr()] || [];
    const rec = dayAtt.find(a => a.student_id === studentId);
    return rec ? rec.status : null;
}

function lockButtons(studentId, activeStatus) {
    ['present','late','leave','absent'].forEach(st => {
        const btn = document.getElementById(`btn-${st}-${studentId}`);
        if (!btn) return;
        btn.style.cursor = 'not-allowed';
        if (st === activeStatus) {
            btn.style.opacity = '1';
            btn.title = 'บันทึกแล้ว';
        } else {
            btn.style.opacity = '0.3';
            btn.title = 'ล็อคแล้ว — เปลี่ยนได้พรุ่งนี้';
        }
    });
}

function unlockButtons(studentId) {
    ['present','late','leave','absent'].forEach(st => {
        const btn = document.getElementById(`btn-${st}-${studentId}`);
        if (!btn) return;
        btn.style.opacity = '1';
        btn.style.cursor  = 'pointer';
        btn.title = '';
    });
}

async function quickStatusLocked(studentId, status, date) {
    const student = appData.students.find(s => s.id === studentId);
    if (!student) return;

    const today  = getTodayStr();
    const locked = getLockedStatus(studentId);

    // ยังไม่มีข้อมูลวันนี้ → บันทึกเลย แล้วล็อค
    if (!locked) {
        await quickStatus(studentId, status, date);
        lockButtons(studentId, status);
        return;
    }

    // กดปุ่มเดิมซ้ำ
    if (locked === status) {
        Swal.fire({
            icon: 'info',
            title: 'บันทึกแล้ววันนี้',
            html: `<b>${student.name}</b> บันทึก <b>${LABELS[status]}</b> ไว้แล้ว<br>
                   <small style="color:#64748b;">กดเปลี่ยนสถานะอื่นได้ถ้าต้องการแก้</small>`,
            timer: 2000,
            showConfirmButton: false
        });
        return;
    }

    // กดสถานะอื่น → ถามยืนยัน
    const result = await Swal.fire({
        title: '⚠️ บันทึกแล้ววันนี้',
        html: `<div style="color:#94a3b8;font-size:14px;line-height:2.2;">
            <b style="color:#e2e8f0;">${student.name}</b><br>
            บันทึกไว้แล้วว่า <b style="color:#f59e0b;">${LABELS[locked]}</b><br>
            ต้องการ<b style="color:#ef4444;">ลบข้อมูลเดิมออกจาก Google Sheets</b><br>
            แล้วเปลี่ยนเป็น <b style="color:#60a5fa;">${LABELS[status]}</b> ใช่มั้ย?
        </div>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ใช่ เปลี่ยนเลย',
        cancelButtonText:  'ยกเลิก',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor:  '#374151'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'กำลังอัปเดต...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });

    // ลบข้อมูลเก่าออกจาก Google Sheets
    try {
        await jsonpRequest({ action: 'deleteAttendance', studentId, date: today });
    } catch(e) {
        console.warn('deleteAttendance failed:', e);
    }

    // ลบออกจาก local
    if (appData.attendance[today]) {
        appData.attendance[today] = appData.attendance[today]
            .filter(a => a.student_id !== studentId);
    }

    // บันทึกใหม่
    unlockButtons(studentId);
    await quickStatus(studentId, status, date);
    lockButtons(studentId, status);

    Swal.fire({
        icon: 'success',
        title: 'อัปเดตเรียบร้อย!',
        html: `เปลี่ยนเป็น <b>${LABELS[status]}</b> แล้ว`,
        timer: 1500,
        showConfirmButton: false
    });
}

// ล็อคปุ่มของนักเรียนที่มีข้อมูลแล้วตอนโหลดหน้า
function initLocks() {
    const dayAtt = appData.attendance[getTodayStr()] || [];
    dayAtt.forEach(rec => lockButtons(rec.student_id, rec.status));
}

// hook เข้า renderStudentList — ทำงานหลัง render เสร็จ
const _origRender = window.renderStudentList;
window.renderStudentList = function() {
    _origRender.apply(this, arguments);
    setTimeout(initLocks, 60);
};
