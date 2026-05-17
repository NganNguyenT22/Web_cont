const API_URL = "https://script.google.com/macros/s/AKfycbyu_JxFlmxFNKObTQhdlxWITkUUyudOG-hB4CkUXLCGNM05baOBbYMC7IsYXjfFw9qN/exec";
        
let currentUser = null;
let dataNhap = [];
let dataCap = [];
let dataUsers = [];
let chartInstance = null;

let dataQuanLyLenh = [];
let currentGiaoNhanTab = 'HaRong';
let dataGiamDinh = [];
document.getElementById('current-date').innerText = new Date().toLocaleDateString('vi-VN');
const showLoading = (s) => document.getElementById('loader').style.display = s ? 'flex' : 'none';

// Hàm đóng mở Submenu Giám định & Sửa chữa
function toggleSubmenu(event, submenuId) {
    if (event) event.preventDefault();
    const submenu = document.getElementById(submenuId);
    const icon = document.getElementById('icon-giamdinh');
    if (submenu) {
        if (submenu.classList.contains('d-none')) {
            submenu.classList.remove('d-none');
            if (icon) icon.classList.add('rotate-180');
        } else {
            submenu.classList.add('d-none');
            if (icon) icon.classList.remove('rotate-180');
        }
    }
}

// ================= 1. ĐĂNG NHẬP =================
async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
   
    showLoading(true);

    if(API_URL.includes("DÁN_LINK")) {
        if(user === "admin") currentUser = { name: "Quản trị viên", role: "admin" };
        else if(user === "dieudo") currentUser = { name: "Nguyễn Văn Điều Độ", role: "dieudo" };
        else if(user === "nangha") currentUser = { name: "Lái cẩu Nâng Hạ", role: "nangha" };
        else if(user === "kythuat") currentUser = { name: "Kỹ sư Sửa chữa", role: "kythuat" };
        else { alert("Vui lòng dán định dạng link để chạy."); showLoading(false); return; }
    } else {
        try {
            const res = await fetch(API_URL + "?type=TaiKhoan");
            const users = await res.json();
            
            const found = users.find(u => u.Username === user && u.Password == pass);
            if(found) {
                currentUser = { name: found.HoTen, role: found.Role };
            } else {
                alert("Sai tài khoản hoặc mật khẩu!");
                showLoading(false);
                return;
            }
        } catch (err) {
            console.error(err); 
            alert("Lỗi kết nối API."); 
            showLoading(false);
            return;
        }
    }

    document.getElementById('user-fullname').innerText = currentUser.name;
    document.getElementById('user-role').innerText = "Vai trò: " + currentUser.role.toUpperCase();

    document.querySelectorAll('.role-section').forEach(el => el.style.display = 'none');
    
    if(currentUser.role === 'admin') {
        document.querySelectorAll('.role-section').forEach(el => el.style.display = 'block');
    } else if(currentUser.role === 'dieudo') {
        document.querySelectorAll('.view-dieudo, .view-giaonhan').forEach(el => el.style.display = 'block');
    } else if(currentUser.role === 'nangha') {
        document.querySelectorAll('.view-giaonhan').forEach(el => el.style.display = 'block');
    }

    const menuGiamDinh = document.getElementById('menu-giamdinh-wrapper');
    if (menuGiamDinh) {
        menuGiamDinh.classList.remove('d-none');
    }
    fetchGiamDinhData(); 

    document.querySelectorAll('.view-nhap, .view-cap').forEach(el => el.style.setProperty('display', 'none', 'important'));

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    
    await initDashboard();
}

// ================= 2. ĐIỀU HƯỚNG TRANG =================
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId);
    if(targetPage) targetPage.classList.add('active');
    
    if(window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
        document.getElementById('page-title').innerText = window.event.currentTarget.innerText;
    }
    
    if(pageId === 'page-users') loadUsers();
    if(pageId === 'page-quanlylenh') loadQuanLyLenh();
    if(pageId === 'page-giaonhan') { 
        switchGiaoNhanTab(currentGiaoNhanTab); 
    }
    if(pageId === 'page-quanlytinhtrang') fetchGiamDinhData();
    if(pageId === 'page-suachua') renderSuaChuaPage();
}

// ================= 3. TẢI DỮ LIỆU TỪ GOOGLE SHEETS =================
async function initDashboard() {
    if(API_URL.includes("DÁN_LINK")) return;
    showLoading(true);
    try {
        const [resNhap, resCap] = await Promise.all([
            fetch(API_URL + "?type=ContNhap"),
            fetch(API_URL + "?type=ContCap")
        ]);
        dataNhap = await resNhap.json();
        dataCap = await resCap.json();
    } catch (e) { console.log(e); }
    showLoading(false);
}

window.globalHaRongData = [];
window.globalCapRongData = [];

function switchGiaoNhanTab(type) {
    currentGiaoNhanTab = type;
    
    const btnHaRong = document.getElementById('btn-tab-harong');
    const btnCapRong = document.getElementById('btn-tab-caprong');
    if(btnHaRong && btnCapRong) {
        if(type === 'HaRong') {
            btnHaRong.classList.add('active');
            btnCapRong.classList.remove('active');
        } else {
            btnCapRong.classList.add('active');
            btnHaRong.classList.remove('active');
        }
    }
    
    const sheetParam = (type === 'HaRong') ? 'ContNhap' : 'ContCap';
    loadGiaoNhanDataExplicit(sheetParam);    
}

async function loadGiaoNhanDataExplicit(sheetType) {
    showLoading(true);
    try {
        const res = await fetch(API_URL + "?type=" + sheetType);
        const data = await res.json();
        
        if (sheetType === 'ContNhap') {
            window.globalHaRongData = data;
            renderGiaoNhanTableExplicit(window.globalHaRongData, 'HaRong');
        } else if (sheetType === 'ContCap') {
            window.globalCapRongData = data;
            renderGiaoNhanTableExplicit(window.globalCapRongData, 'CapRong');
        }
    } catch (e) {
        console.error(e);
    }
    showLoading(false);
}

function renderGiaoNhanTableExplicit(data, currentTab) {
    let html = "";
    const sourceData = data || [];
    
    if(sourceData.length === 0) {
        html = `<tr><td colspan="8" class="text-center text-muted py-3">Không có dữ liệu lịch sử giao nhận.</td></tr>`;
    } else {
        sourceData.forEach((row, index) => {
            const containerNo = row["Số Container"] || row["Số container"] || '';
            const eirNo = row["Số lệnh"] || `EIR-${row["Stt"] || (index+1)}`;
            const hangTau = row["Line"] || row["Hãng tàu"] || '';
            const size = row["Size"] || '';
            const viTriBai = row["Bãi"] || 'ICD-Sotrans';
            
            const d = new Date(row["Ngày nhập bãi"] || row["Ngày thực hiện"]);
            const dateStr = !isNaN(d) ? d.toLocaleDateString('vi-VN') : '-';
            
            html += `<tr>
                <td class="ps-3 text-secondary fw-bold">${row["Stt"] || (index + 1)}</td>
                <td class="fw-bold text-dark">${eirNo}</td>
                <td class="fw-bold ${currentTab === 'HaRong' ? 'text-primary' : 'text-success'}">${containerNo}</td>
                <td>${hangTau}</td>
                <td><span class="badge bg-light text-dark border">${size}</span></td>
                <td><small>${dateStr}</small></td>
                <td><span class="badge bg-primary px-2 py-1">${viTriBai}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="alert('In phiếu ${eirNo}')"><i class="bi bi-printer"></i> EIR</button>
                </td>
            </tr>`;
        });
    }
    
    const tbody = document.getElementById('tbody-giaonhan');
    if(tbody) tbody.innerHTML = html;
}

function openGiaoNhanModalExplicit(loaiHinh) {
    currentGiaoNhanTab = loaiHinh;
    const titleObj = document.getElementById('giaoNhanModalLabel');
    if(titleObj) {
        titleObj.innerText = loaiHinh === 'HaRong' ? 'Lập Lệnh Hạ Rỗng (Nhập Bãi)' : 'Lập Lệnh Cấp Rỗng (Xuất Bãi)';
    }
    document.getElementById('gn_loaihinh_hidden').value = loaiHinh;
    const modalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGiaoNhan'));
    modalInstance.show();
}

function openDeXuatHaModal(rowIndex, container, hangtau, size) {
    document.getElementById('dx_container').value = container || '';
    document.getElementById('dx_hangtau').value = hangtau || '';
    document.getElementById('dx_size').value = size || '';
    const modalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDeXuatHa'));
    modalInstance.show();
}

function openTraCuuModalExplicit() {
    const modalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalTraCuu'));
    modalInstance.show();
}

// --- GIẢM ĐỊNH & SỬA CHỮA ---
async function fetchGiamDinhData() {
    if(API_URL.includes("DÁN_LINK")) return;
    try {
        const res = await fetch(API_URL + "?type=GiamDinh");
        dataGiamDinh = await res.json();
        const tbody = document.getElementById('tbody-giamdinh');
        if(tbody) {
            let html = "";
            dataGiamDinh.forEach((row, i) => {
                html += `<tr>
                    <td>${i+1}</td>
                    <td class="fw-bold">${row["Mã container"] || ''}</td>
                    <td>${row["Hãng tàu"] || ''}</td>
                    <td>${row["Tình trạng"] || 'Tốt'}</td>
                    <td><span class="badge ${row["Cần sửa chữa"]==='CÓ'?'bg-danger':'bg-success'}">${row["Cần sửa chữa"] || 'KHÔNG'}</span></td>
                    <td>${row["Trạng thái"] || 'A'}</td>
                </tr>`;
            });
            tbody.innerHTML = html || '<tr><td colspan="6" class="text-center">Không có dữ liệu giám định</td></tr>';
        }
    } catch(e) { console.error(e); }
}

function renderSuaChuaPage() {
    const tbody = document.getElementById('tbody-suachua');
    if(!tbody) return;
    let listRepair = dataGiamDinh.filter(row => row['Cần sửa chữa'] === 'CÓ');
    if(listRepair.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Hiện tại không có container nào cần sửa chữa.</td></tr>`;
        return;
    }
    let html = "";
    listRepair.forEach((row, index) => {
        html += `<tr>
            <td>${index + 1}</td>
            <td class="fw-bold text-danger">${row['Mã container']}</td>
            <td>${row['Hãng tàu']}</td>
            <td>${row['Tình trạng'] || ''}</td>
            <td><span class="badge bg-warning">Hạng ${row['Trạng thái'] || 'B'}</span></td>
            <td class="text-center"><button class="btn btn-sm btn-success py-0" onclick="alert('Xong cont ${row['Mã container']}')">Xong</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function openTaoGiamDinhModal() {
    document.getElementById('form-giamdinh-chitiet').reset();
    document.querySelectorAll('.chk-loi').forEach(chk => chk.checked = false);
    const modalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGiamDinhChiTiet'));
    modalInstance.show();
}

async function submitGiamDinhChiTiet() {
    const maCont = document.getElementById('gd_macont').value.trim().toUpperCase();
    const hangTau = document.getElementById('gd_hangtau').value.trim().toUpperCase();
    const phanLoai = document.getElementById('gd_phantang').value;
    const canVeSinh = document.getElementById('gd_vesinh').value;

    if(!maCont || !hangTau) {
        alert("Vui lòng nhập đầy đủ Mã Container và Hãng Tàu!");
        return;
    }

    let mangLoiSelected = [];
    document.querySelectorAll('.chk-loi:checked').forEach(checkbox => {
        mangLoiSelected.push(checkbox.value);
    });

    let chuoiTinhTrang = mangLoiSelected.length > 0 ? mangLoiSelected.join(', ') : "Vỏ bình thường, không móp rách";
    let canSuaChua = (phanLoai === 'C' || mangLoiSelected.length > 0) ? "CÓ" : "KHÔNG";

    const payload = {
        "Mã container": maCont,
        "Hãng tàu": hangTau,
        "Tình trạng": chuoiTinhTrang,
        "Cần sửa chữa": canSuaChua,
        "Trạng thái": phanLoai
    };

    if(API_URL.includes("DÁN_LINK")) {
        alert("Thử nghiệm thành công chuỗi tình trạng:\n" + chuoiTinhTrang);
        bootstrap.Modal.getInstance(document.getElementById('modalGiamDinhChiTiet')).hide();
        return;
    }

    showLoading(true);
    try {
        await fetch(API_URL + "?type=GiamDinh", {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        alert("Đã lưu tình trạng chi tiết vào Google Sheet thành công!");
        bootstrap.Modal.getInstance(document.getElementById('modalGiamDinhChiTiet')).hide();
        await fetchGiamDinhData();
    } catch (error) {
        console.error(error);
        alert("Lỗi lưu dữ liệu.");
    }
    showLoading(false);
}

async function loadQuanLyLenh() {
    showLoading(true);
    try {
        const res = await fetch(API_URL + "?type=QuanLyLenh");
        window.globalDataLenh = await res.json();
        let html = "";
        window.globalDataLenh.forEach((row, index) => {
            html += `<tr><td>${index+1}</td><td>${row["Số Booking"] || ''}</td><td>${row["Hãng tàu"] || ''}</td><td>${row["Loại lệnh"] || ''}</td><td><span class="badge bg-info">${row["Trạng thái"] || 'Chờ duyệt'}</span></td></tr>`;
        });
        document.getElementById('tbody-quanlylenh').innerHTML = html;
    } catch(e) { console.error(e); }
    showLoading(false);
}
