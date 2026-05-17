const API_URL = "https://script.google.com/macros/s/AKfycbyu_JxFlmxFNKObTQhdlxWITkUUyudOG-hB4CkUXLCGNM05baOBbYMC7IsYXjfFw9qN/exec"; // <-- THAY LINK CỦA BẠN VÀO ĐÂY
        
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

// Hàm đóng mở Submenu Giám định & Sửa chữa (SỬA LỖI KHÔNG HIỂN THỊ)
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

// ================= 1. ĐĂNG NHẬP (Lấy dữ liệu từ Sheet TaiKhoan) =================
async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
   
    showLoading(true);

    if(API_URL.includes("DÁN_LINK")) {
        // Đăng nhập giả lập nếu chưa cấu hình API
        if(user === "admin") currentUser = { name: "Quản trị viên", role: "admin" };
        else if(user === "dieudo") currentUser = { name: "Nguyễn Văn Điều Độ", role: "dieudo" };
        else if(user === "nangha") currentUser = { name: "Lái cẩu Nâng Hạ", role: "nangha" };
        else if(user === "kythuat") currentUser = { name: "Kỹ sư Sửa chữa", role: "kythuat" };
        else { alert("Vui lòng dán link API_URL để đăng nhập thật, hoặc dùng tài khoản giả lập: admin / dieudo"); showLoading(false); return; }
    } else {
        // Xác thực tài khoản thật qua API
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
            console.error("Lỗi API chi tiết:", err); 
            alert("Lỗi kết nối API: " + err.message); 
            showLoading(false);
            return;
        }
    }

    document.getElementById('user-fullname').innerText = currentUser.name;
    document.getElementById('user-role').innerText = "Vai trò: " + currentUser.role.toUpperCase();

    // Hiển thị Menu & Nút bấm theo phân quyền
    document.querySelectorAll('.role-section').forEach(el => el.style.display = 'none');
    
    if(currentUser.role === 'admin') {
        document.querySelectorAll('.role-section').forEach(el => el.style.display = 'block');
    } else if(currentUser.role === 'dieudo') {
        document.querySelectorAll('.view-dieudo, .view-giaonhan').forEach(el => el.style.display = 'block');
    } else if(currentUser.role === 'nangha') {
        document.querySelectorAll('.view-giaonhan').forEach(el => el.style.display = 'block');
    } else if(currentUser.role === 'kythuat') {
        // Cho phép kỹ thuật xem các phần được cấp quyền riêng
    }

    // ĐÃ FIX: Mở hiển thị Giám định & Sửa chữa cho tất cả các vai trò hợp lệ truy cập nghiệp vụ
    const menuGiamDinh = document.getElementById('menu-giamdinh-wrapper');
    if (menuGiamDinh) {
        menuGiamDinh.classList.remove('d-none');
    }
    fetchGiamDinhData(); 

    // ĐÃ FIX: Ẩn triệt để QL Nhập bãi và Cấp Rỗng với tất cả các vai trò
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
    
    if(pageId === 'page-cont-nhap') loadData('ContNhap');
    if(pageId === 'page-cont-cap') loadData('ContCap');
    if(pageId === 'page-users') loadUsers();
    if(pageId === 'page-quanlylenh') loadQuanLyLenh();
    
    if(pageId === 'page-harong' || pageId === 'page-giaonhan') { 
        switchGiaoNhanTab('HaRong'); 
    }
    if(pageId === 'page-caprong') { 
        switchGiaoNhanTab('CapRong'); 
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
        drawChart();
    } catch (e) { console.log(e); }
    showLoading(false);
}

async function loadData(type) {
    showLoading(true);
    try {
        const res = await fetch(API_URL + "?type=" + type);
        const data = await res.json();
        if(type === 'ContNhap') {
            dataNhap = data;
            renderTableNhap();
        } else {
            dataCap = data;
            renderTableCap();
        }
    } catch (e) { console.error(e); }
    showLoading(false);
}

// ================= 4. HIỂN THỊ BẢNG CONTAINER =================
function renderTableNhap() {
    let html = "";
    dataNhap.forEach(row => {
        const d = new Date(row["Ngày nhập bãi"]);
        const dateStr = !isNaN(d) ? d.toLocaleString('vi-VN') : row["Ngày nhập bãi"];
        html += `<tr>
            <td>${row["Stt"] || ''}</td>
            <td class="fw-bold text-primary">${row["Số Container"] || ''}</td>
            <td>${row["Size"] || ''}</td>
            <td><span class="badge bg-secondary">${row["Line"] || ''}</span></td>
            <td class="small">${dateStr}</td>
            <td><span class="badge bg-primary px-2 py-1">${row["Bãi"] || 'Chưa xếp'}</span></td>
            <td class="small text-muted" style="max-width:200px; overflow:hidden; text-overflow:ellipsis;">${row["Ghi chú"] || ''}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary" onclick="openModal('edit', 'ContNhap', ${row.rowIndex})"><i class="bi bi-pencil"></i></button>
                ${currentUser.role === 'admin' ? `<button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteRow('ContNhap', ${row.rowIndex})"><i class="bi bi-trash"></i></button>` : ''}
            </td>
        </tr>`;
    });
    document.getElementById('tbody-nhap').innerHTML = html || '<tr><td colspan="8" class="text-center">Trống</td></tr>';
}

function renderTableCap() {
    let html = "";
    dataCap.forEach(row => {
        const d = new Date(row["Ngày thực hiện"]);
        const dateStr = !isNaN(d) ? d.toLocaleString('vi-VN') : row["Ngày thực hiện"];
        html += `<tr>
            <td>${row["Stt"] || ''}</td>
            <td class="fw-bold text-success">${row["Số Container"] || ''}</td>
            <td>${row["Size"] || ''}</td>
            <td><span class="badge bg-secondary">${row["Line"] || ''}</span></td>
            <td class="small">${row["Ngày Nhập bãi"] || ''}</td>
            <td class="small fw-bold">${dateStr}</td>
            <td>${row["Giao"] || ''}</td>
            <td>${row["Cảng ct"] || ''}</td>
            <td class="small text-muted" style="max-width:150px; overflow:hidden; text-overflow:ellipsis;">${row["Ghi chú"] || ''}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary" onclick="openModal('edit', 'ContCap', ${row.rowIndex})"><i class="bi bi-pencil"></i></button>
                ${currentUser.role === 'admin' ? `<button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteRow('ContCap', ${row.rowIndex})"><i class="bi bi-trash"></i></button>` : ''}
            </td>
        </tr>`;
    });
    document.getElementById('tbody-cap').innerHTML = html || '<tr><td colspan="10" class="text-center">Trống</td></tr>';
}

// ================= BỘ ĐIỀU HƯỚNG TAB GIAO NHẬN CHUẨN =================
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
            dataNhap = data;
            renderGiaoNhanTableExplicit(window.globalHaRongData, 'HaRong');
        } else if (sheetType === 'ContCap') {
            window.globalCapRongData = data;
            dataCap = data;
            renderGiaoNhanTableExplicit(window.globalCapRongData, 'CapRong');
        }
    } catch (e) {
        console.error("Lỗi đồng bộ danh mục giao nhận rỗng:", e);
    }
    showLoading(false);
}

// Đồng bộ gộp chung render để hiển thị nút EIR linh hoạt cho cả Cấp rỗng & Hạ rỗng
function renderGiaoNhanTableExplicit(data, currentTab) {
    let html = "";
    const sourceData = data || [];
    
    if(sourceData.length === 0) {
        html = `<tr><td colspan="8" class="text-center text-muted py-3">Không có dữ liệu lịch sử giao nhận.</td></tr>`;
    } else {
        sourceData.forEach((row, index) => {
            const containerNo = row["Số Container"] || row["Số container"] || row["Mã container"] || '';
            const eirNo = row["Số lệnh"] || row["Số Lệnh"] || `EIR-${row["Stt"] || (index+1)}`;
            const hangTau = row["Line"] || row["Hãng tàu"] || '';
            const size = row["Size"] || row["Kích cỡ"] || '';
            const viTriBai = row["Bãi"] || row["Vị trí"] || 'ICD-Sotrans';
            
            const d = new Date(row["Ngày nhập bãi"] || row["Ngày thực hiện"] || row["Thời gian"]);
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
                    <button class="btn btn-xs btn-outline-secondary py-0 px-2" onclick="printEIR('${eirNo}', '${currentTab}')"><i class="bi bi-printer"></i> EIR</button>
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
    const hiddenInput = document.getElementById('gn_loaihinh_hidden');
    if(hiddenInput) hiddenInput.value = loaiHinh;
    
    const modalElement = document.getElementById('modalGiaoNhan');
    if(modalElement) {
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.show();
    }
}

function openDeXuatHaModal(rowIndex, container, hangtau, size) {
    if(document.getElementById('dx_container')) document.getElementById('dx_container').value = container || '';
    if(document.getElementById('dx_hangtau')) document.getElementById('dx_hangtau').value = hangtau || '';
    if(document.getElementById('dx_size')) document.getElementById('dx_size').value = size || '';
    
    const modalElement = document.getElementById('modalDeXuatHa');
    if (modalElement) {
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.show();
    }
}

function openTraCuuModalExplicit() {
    const modalElement = document.getElementById('modalTraCuu');
    if(modalElement) {
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.show();
    }
}

// --- GIẢM ĐỊNH & SỬA CHỮA DỮ LIỆU PHỤ TRỢ ---
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
    } catch(e) { console.error("Lỗi tải giám định:", e); }
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
            <td class="text-center"><button class="btn btn-sm btn-success py-0" onclick="alert('Hoàn thành sửa chữa cont ${row['Mã container']}')">Xong</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// ================= QUẢN LÝ LỆNH =================
async function loadQuanLyLenh() {
    showLoading(true);
    try {
        const res = await fetch(API_URL + "?type=QuanLyLenh");
        window.globalDataLenh = await res.json();
        renderTableQuanLyLenh(window.globalDataLenh);
    } catch(e) { console.error("Lỗi tải lệnh:", e); }
    showLoading(false);
}

function renderTableQuanLyLenh(data) {
    const dataRender = data || window.globalDataLenh || [];
    let html = "";
    dataRender.forEach((row, index) => {
        html += `<tr>
            <td>${index+1}</td>
            <td class="fw-bold">${row["Số Booking"] || ''}</td>
            <td>${row["Hãng tàu"] || ''}</td>
            <td>${row["Loại lệnh"] || ''}</td>
            <td><span class="badge bg-info">${row["Trạng thái"] || 'Chờ duyệt'}</span></td>
        </tr>`;
    });
    const target = document.getElementById('tbody-quanlylenh');
    if(target) target.innerHTML = html || '<tr><td colspan="5" class="text-center">Trống</td></tr>';
}
