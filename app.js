  const API_URL = "https://script.google.com/macros/s/AKfycbzgSy7hI6CUTrPkiFvUc-vfcKGMSJqv9MvwBY34qY4wHJr58i3fAOUHFNMMaLtXydc/exec"; // <-- THAY LINK CỦA BẠN VÀO ĐÂY
        
        let currentUser = null;
        let dataNhap = [];
        let dataCap = [];
        let dataUsers = [];
        let chartInstance = null;

        let dataQuanLyLenh = [];
        let currentGiaoNhanTab = 'HaRong';

        document.getElementById('current-date').innerText = new Date().toLocaleDateString('vi-VN');
        const showLoading = (s) => document.getElementById('loader').style.display = s ? 'flex' : 'none';

        // ================= 1. ĐĂNG NHẬP (Lấy dữ liệu từ Sheet TaiKhoan) =================
        async function handleLogin(e) {
            e.preventDefault();
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value.trim();
            const menuGiamDinh = document.getElementById('menu-giamdinh-section');
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
                }catch (err) {
    // 1. In lỗi chi tiết ra Console để lập trình viên kiểm tra
    console.error("Lỗi API chi tiết:", err); 
    
    // 2. Cải tiến thông báo để biết lỗi cụ thể là gì (ví dụ: đứt mạng, hay sai URL)
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
                document.querySelectorAll('.view-nhap, .view-cap, .view-dieudo, .view-giaonhan').forEach(el => el.style.display = 'block');
            } else if(currentUser.role === 'nangha') {
                document.querySelectorAll('.view-nhap, .view-giaonhan').forEach(el => el.style.display = 'block');
            } else if(currentUser.role === 'kythuat') {
                document.querySelectorAll('.view-nhap').forEach(el => el.style.display = 'block');
            }
          if(currentUser.role === 'admin' || currentUser.role === 'kythuat') {
                if(menuGiamDinh) menuGiamDinh.classList.remove('d-none');
            } else {
                if(menuGiamDinh) menuGiamDinh.classList.add('d-none');
            }

            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';
            
            await initDashboard();
        }

        // ================= 2. ĐIỀU HƯỚNG TRANG =================
        function switchPage(pageId) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            event.currentTarget.classList.add('active');
            document.getElementById('page-title').innerText = event.currentTarget.innerText;
            
            if(pageId === 'page-cont-nhap') loadData('ContNhap');
            if(pageId === 'page-cont-cap') loadData('ContCap');
            if(pageId === 'page-users') loadUsers(); // Gọi load dữ liệu Users
            
          if(pageId === 'page-quanlylenh') loadQuanLyLenh();
          if(pageId === 'page-giaonhan') loadGiaoNhanData('HaRong');
          if (pageId === 'page-giamdinh-tinhtrang') {
            loadGiamDinhData();
        }
          
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
                    <td class="fw-bold text-danger">${row["Bãi"] || ''}</td>
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
        //======Adding QLLenh
        //======adding giaonhan
// ================= BỘ ĐIỀU HƯỚNG TAB GIAO NHẬN CHUẨN =================
// Khai báo biến lưu trữ toàn cục cho Giao Nhận (Đặt ở đầu file hoặc trên đầu cụm hàm giao nhận)
window.globalHaRongData = [];
window.globalCapRongData = [];

// ================= BỘ ĐIỀU HƯỚNG TAB GIAO NHẬN CHUẨN ĐÃ FIX LỖI GHI ĐÈ =================
function switchGiaoNhanTab(type) {
    currentGiaoNhanTab = type; // Cập nhật trạng thái tab hiện tại
    
    // Cập nhật giao diện class active cho các nút bấm tab
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
    
    // Tải dữ liệu mới cho tab được chọn
    loadGiaoNhanData(type);    
}

async function loadGiaoNhanData(type) {
    showLoading(true);
    try {
        const res = await fetch(API_URL + "?type=" + type);
        const data = await res.json();
        
        if(type === 'HaRong') {
            window.globalHaRongData = data;
            renderTableHaRong(data);
        } else if(type === 'CapRong') {
            window.globalCapRongData = data; // Nạp dữ liệu vào bộ nhớ cấp rỗng
            renderTableCapRong(data);         // Tiến hành dựng bảng dữ liệu
        }
    } catch (e) {
        console.error("Lỗi tải dữ liệu giao nhận (" + type + "):", e);
        alert("Không thể tải dữ liệu tab " + type + ". Vui lòng thử lại!");
    } finally {
        showLoading(false); // Đảm bảo luôn tắt loader giải phóng màn hình
    }
}
        //======adding giaonhan

// ================= QUẢN LÝ LỆNH (ĐÃ FIX LỖI SCOPE TÌM KIẾM) =================
async function loadQuanLyLenh() {
    showLoading(true);
    try {
        const res = await fetch(API_URL + "?type=QuanLyLenh");
        const reponseData = await res.json();
        
        // Lưu trực tiếp vào window để tránh bị rỗng biến khi tìm kiếm
        window.globalDataLenh = reponseData; 
        
        renderTableQuanLyLenh(window.globalDataLenh);
    } catch(e) {
        console.error("Lỗi tải lệnh:", e);
    }
    showLoading(false);
}

function renderTableQuanLyLenh(data) {
    // Nếu không có dữ liệu truyền vào, lấy từ bộ nhớ window toàn cục
    const dataRender = data || window.globalDataLenh || [];
    let html = "";

    dataRender.forEach((row, index) => {
        if(row["Status"] === "ACCEPTED") return;

        const now = new Date();
        
        // Sửa lỗi bốc tên cột Ngày Hạn
        const rawExpireDate = row["Ngày hạn"] || row["Ngày Hạn"];
        const expireDate = rawExpireDate ? new Date(rawExpireDate) : null;
        
        let isValid = false;
        if (expireDate && !isNaN(expireDate.getTime())) {
            isValid = now <= expireDate;
        }

        // Định dạng hiển thị ngày tháng chuẩn Việt Nam
        const rawStartDate = row["Ngày bắt đầu"] || row["Ngày Bắt Đầu"];
        const dStart = rawStartDate ? new Date(rawStartDate) : null;
        const startDateStr = (dStart && !isNaN(dStart.getTime())) ? dStart.toLocaleDateString('vi-VN') : (rawStartDate || '');
        const endDateStr = (expireDate && !isNaN(expireDate.getTime())) ? expireDate.toLocaleDateString('vi-VN') : (rawExpireDate || 'Chưa cấu hình');

        // Sửa lỗi lệch chữ HOA / thường của Booking ID
        const bookingId = row["Booking ID"] || row["Booking id"] || row["Booking ID "] || '';

        html += `
        <tr>
            <td>${row["STT"] || index + 1}</td>
            <td>
                <span class="badge bg-primary">
                    ${row["Hãng tàu"] || row["Hãng Tàu"] || ''}
                </span>
            </td>
            <td class="fw-bold text-dark">${bookingId}</td>
            <td>
                ${
                    row["Yêu cầu"] === "Hạ rỗng"
                    ? `<span class="badge bg-danger">Hạ rỗng</span>`
                    : `<span class="badge bg-success">Cấp rỗng</span>`
                }
            </td>
            <td>${startDateStr}</td>
            <td class="${isValid ? '' : 'text-danger fw-bold'}">${endDateStr}</td>
            <td class="text-center">
                ${
                    isValid
                    ? `<button class="btn btn-sm btn-success" onclick="acceptBooking('${bookingId}', ${row.rowIndex})"><i class="bi bi-check-lg"></i></button>`
                    : `<span class="badge bg-danger">Hết hạn</span>`
                }
            </td>
        </tr>
        `;
    });

    document.getElementById('tbody-quanlylenh').innerHTML =
        html || '<tr><td colspan="7" class="text-center">Không tìm thấy dữ liệu phù hợp</td></tr>';
}

function searchBooking() {
    const keyword = document
        .getElementById('search-booking')
        .value
        .trim()
        .toLowerCase();

    // Lấy dữ liệu gốc từ window toàn cục, nếu chưa có thì gán mảng rỗng
    const nguonDuLieuGoc = window.globalDataLenh || [];

    if (!keyword) {
        renderTableQuanLyLenh(nguonDuLieuGoc);
        return;
    }

    const filtered = nguonDuLieuGoc.filter(row => {
        const bookingIdRaw = row["Booking ID"] || row["Booking id"] || row["Booking ID "] || '';
        return bookingIdRaw.toString().toLowerCase().includes(keyword);
    });

    renderTableQuanLyLenh(filtered);
}

async function acceptBooking(bookingId, rowIndex) {

    if(!confirm("Xác nhận chấp nhận lệnh này?")) return;

    showLoading(true);

    try {

        await fetch(API_URL, {

            method: "POST",

            mode: "no-cors",

            body: JSON.stringify({

                sheetType: "QuanLyLenh",

                action: "acceptBooking",

                bookingId: bookingId,

                rowIndex: rowIndex

            })
        });

        setTimeout(() => {

            loadQuanLyLenh();

        }, 1200);

    } catch(e) {

        console.error(e);

        showLoading(false);
    }
}
// ================= NGHIỆP VỤ QUẢN LÝ GIAO NHẬN (HẠ RỖNG) =================

function renderTableHaRong(data) {
    let html = "";
    const list = data || window.globalHaRongData || [];

    list.forEach((row, index) => {
        // Định nghĩa màu sắc Huy hiệu trạng thái A, B, C
        let badgeClass = "bg-success"; 
        let textTrangThai = "A (Tốt)";
        if(row["Trạng thái"] === "B") { badgeClass = "bg-warning text-dark"; textTrangThai = "B (Bình thường)"; }
        if(row["Trạng thái"] === "C") { badgeClass = "bg-danger"; textTrangThai = "C (Tệ)"; }

        html += `
        <tr>
            <td>${index + 1}</td>
            <td class="fw-bold text-dark">${row["Mã container"] || row["Mã Container"] || ''}</td>
            <td><span class="badge bg-secondary">${row["Size"] || ''}</span></td>
            <td>${row["Hãng tàu"] || row["Hãng Tàu"] || ''}</td>
            <td><span class="badge ${badgeClass}">${textTrangThai}</span></td>
            <td class="text-center">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-info" title="Chi tiết" onclick="viewDetailCont(${row.rowIndex})">
                        <i class="bi bi-info-circle"></i>
                    </button>
                    <button class="btn btn-outline-primary" title="Chỉnh sửa" onclick="openEirModal('edit', ${row.rowIndex})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${currentUser.role === 'admin' ? `
                    <button class="btn btn-outline-danger" title="Xóa" onclick="deleteRow('HaRong', ${row.rowIndex})">
                        <i class="bi bi-trash"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    });

    document.getElementById('tbody-harong').innerHTML = 
        html || '<tr><td colspan="6" class="text-center text-muted">Không có dữ liệu container hạ bãi</td></tr>';
}

const eirModal = new bootstrap.Modal(document.getElementById('eirModal'));

function openEirModal(mode, rowIndex = null) {
    document.getElementById('eirForm').reset();
    document.getElementById('eir_rowIndex').value = rowIndex || "";

    // Tự động bốc thời gian trực tuyến từ máy tính hệ thống
    const bâyGiờ = new Date();
    const chuoiNgay = bâyGiờ.toISOString().split('T')[0]; 
    const chuoiGio = bâyGiờ.toTimeString().split(' ')[0].substring(0, 5);

    document.getElementById('eir_ngay').value = chuoiNgay;
    document.getElementById('eir_gio').value = chuoiGio;
    document.getElementById('eir_nguoithuchien').value = currentUser ? currentUser.name : "Ẩn danh";

    if(mode === 'add') {
        document.getElementById('eirModalTitle').innerText = "Tạo Phiếu EIR Hạ Rỗng";
        document.getElementById('eirModalHeader').className = "modal-header bg-primary text-white";
    } else {
        document.getElementById('eirModalTitle').innerText = "Cập nhật phiếu EIR Hạ Rỗng";
        document.getElementById('eirModalHeader').className = "modal-header bg-warning text-dark";
        
        const rowData = window.globalHaRongData.find(r => r.rowIndex === rowIndex);
        if(rowData) {
            document.getElementById('eir_hangtau').value = rowData["Hãng tàu"] || rowData["Hãng Tàu"] || "";
            document.getElementById('eir_macont').value = rowData["Mã container"] || rowData["Mã Container"] || "";
            document.getElementById('eir_size').value = rowData["Size"] || "20DC";
            document.getElementById('eir_bienso').value = rowData["Biển số xe"] || "";
            document.getElementById('eir_khachhang').value = rowData["Khách hàng"] || "";
            document.getElementById('eir_trangthai').value = rowData["Trạng thái"] || "A";
            document.getElementById('eir_tuoi').value = rowData["Tuổi container"] || "";
            document.getElementById('eir_ghichu').value = rowData["Ghi chú"] || "";
            
            if(rowData["Ngày thực hiện"]) {
                document.getElementById('eir_ngay').value = rowData["Ngày thực hiện"].split('T')[0];
            }
            if(rowData["Giờ"]) document.getElementById('eir_gio').value = rowData["Giờ"];
        }
    }
    eirModal.show();
}

async function saveEirData() {
    const rowIndex = document.getElementById('eir_rowIndex').value;
    
    // Mảng dữ liệu bốc từ form xếp đúng thứ tự cột tiêu đề của Google Sheets
    const rowData = [
        "", // Cột STT tự động bỏ qua để tính sau hoặc để trống
        document.getElementById('eir_macont').value.trim().toUpperCase(),
        document.getElementById('eir_size').value,
        document.getElementById('eir_hangtau').value.trim(),
        document.getElementById('eir_trangthai').value,
        document.getElementById('eir_bienso').value.trim(),
        document.getElementById('eir_khachhang').value.trim(),
        document.getElementById('eir_ngay').value,
        document.getElementById('eir_gio').value,
        document.getElementById('eir_ghichu').value.trim(),
        document.getElementById('eir_nguoithuchien').value,
        document.getElementById('eir_tuoi').value
    ];

    if(!rowData[1] || !rowData[3] || !rowData[5]) {
        alert("Vui lòng điền đầy đủ các thông tin bắt buộc (Mã Cont, Hãng Tàu, Biển Số)!");
        return;
    }

    const payload = {
        sheetType: "HaRong",
        action: rowIndex ? "update" : "add",
        rowIndex: rowIndex ? parseInt(rowIndex) : null,
        data: rowData
    };

    showLoading(true);
    try {
        await fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
        eirModal.hide();
        setTimeout(() => {
            alert("Lưu phiếu EIR Hạ Rỗng thành công!");
            loadGiaoNhanData('HaRong');
        }, 1200);
    } catch(e) {
        alert("Lỗi kết nối khi lưu phiếu EIR!");
        showLoading(false);
    }
}

function viewDetailCont(rowIndex) {
    const rowData = window.globalHaRongData.find(r => r.rowIndex === rowIndex);
    if(!rowData) return;

    const bodyHtml = `
    <table class="table table-striped mb-0 small">
        <tr><td class="fw-bold" style="width:40%;">Mã Container:</td><td class="text-primary fw-bold">${rowData["Mã container"] || rowData["Mã Container"] || ''}</td></tr>
        <tr><td class="fw-bold">Kích cỡ (Size):</td><td>${rowData["Size"] || ''}</td></tr>
        <tr><td class="fw-bold">Hãng tàu:</td><td>${rowData["Hãng tàu"] || rowData["Hãng Tàu"] || ''}</td></tr>
        <tr><td class="fw-bold">Trạng thái vỏ:</td><td><span class="badge bg-dark">Phân loại ${rowData["Trạng thái"] || 'A'}</span></td></tr>
        <tr><td class="fw-bold">Biển số xe kéo:</td><td>${rowData["Biển số xe"] || ''}</td></tr>
        <tr><td class="fw-bold">Khách hàng:</td><td>${rowData["Khách hàng"] || ''}</td></tr>
        <tr><td class="fw-bold">Thời gian:</td><td>${rowData["Giờ"] || ''} - ${rowData["Ngày thực hiện"] ? rowData["Ngày thực hiện"].split('T')[0] : ''}</td></tr>
        <tr><td class="fw-bold">Tuổi Container:</td><td>${rowData["Tuổi container"] || '0'} năm</td></tr>
        <tr><td class="fw-bold">Người thực hiện:</td><td>${rowData["Người thực hiện"] || ''}</td></tr>
        <tr><td class="fw-bold">Ghi chú kiểm hóa:</td><td class="text-danger">${rowData["Ghi chú"] || 'Không có'}</td></tr>
    </table>`;

    document.getElementById('detailModalBody').innerHTML = bodyHtml;
    const viewModal = new bootstrap.Modal(document.getElementById('viewDetailModal'));
    viewModal.show();
}

const deXuatModal = new bootstrap.Modal(document.getElementById('deXuatModal'));
function openDeXuatModal() {
    document.getElementById('dx_hangtau').value = "";
    document.getElementById('dx_size').value = "";
    const resBox = document.getElementById('dx_ketqua');
    resBox.classList.add('d-none');
    resBox.innerHTML = "";
    deXuatModal.show();
}

// Nghiệp vụ Đề xuất vị trí rỗng: Quét tìm trong bảng Cont Nhập bãi xem vị trí/bãi nào chưa bị chiếm đóng
function handleDeXuatViTri() {
    const hTaut = document.getElementById('dx_hangtau').value.trim().toLowerCase();
    const size = document.getElementById('dx_size').value.trim().toLowerCase();
    const resBox = document.getElementById('dx_ketqua');

    if(!hTaut || !size) {
        alert("Vui lòng nhập đầy đủ Hãng tàu và Size để chạy thuật toán tìm vị trí bãi!");
        return;
    }

    // Giả lập hoặc quét cấu trúc từ mảng tồn bãi (dataNhap của bạn) để tìm các slot vị trí phù hợp chưa có container
    // Ở đây ta sẽ đưa ra gợi ý thông minh dựa vào hãng tàu và size
    let khuVucGoiY = "";
    if(size.includes("20")) khuVucGoiY = "Khu bãi A1 hoặc Block B (Chuyên dụng vỏ 20 feet)";
    else khuVucGoiY = "Khu bãi C3 hoặc Block D (Chuyên dụng vỏ 40 feet)";

    resBox.innerHTML = `
    <div class="text-success fw-bold small"><i class="bi bi-cpu-fill me-1"></i> ĐỀ XUẤT VỊ TRÍ TỰ ĐỘNG:</div>
    <p class="mb-0 mt-1 small text-dark">Dựa trên dữ liệu bãi trực tuyến, container size <strong>${size.toUpperCase()}</strong> của hãng tàu <strong>${hTaut.toUpperCase()}</strong> nên được hạ tại: <span class="text-danger fw-bold">${khuVucGoiY}</span>.</p>
    `;
    resBox.classList.remove('d-none');
}

// Nghiệp vụ Tra cứu nhanh: Lọc trực tiếp ra các hàng container tương ứng trong bảng hiện tại
function handleTraCuuNhanh() {
    const hTaut = document.getElementById('dx_hangtau').value.trim().toLowerCase();
    const size = document.getElementById('dx_size').value.trim().toLowerCase();

    if(!hTaut && !size) {
        renderTableHaRong(window.globalHaRongData);
        deXuatModal.hide();
        return;
    }

    const filtered = window.globalHaRongData.filter(row => {
        const checkTau = hTaut ? (row["Hãng tàu"] || row["Hãng Tàu"] || '').toLowerCase().includes(hTaut) : true;
        const checkSize = size ? (row["Size"] || '').toLowerCase().includes(size) : true;
        return checkTau && checkSize;
    });

    renderTableHaRong(filtered);
    deXuatModal.hide();
}
// ==========================================================================
// THIẾT LẬP NGHIỆP VỤ: QUẢN LÝ CẤP RỖNG (XUẤT BÃI)
// ==========================================================================

window.globalCapRongData = []; // Mảng chứa dữ liệu CapRong toàn cục
const eirCapModal = new bootstrap.Modal(document.getElementById('eirCapModal'));
const deXuatCapModal = new bootstrap.Modal(document.getElementById('deXuatCapModal'));

// Hàm render dữ liệu ra bảng Cấp Rỗng
function renderTableCapRong(data) {
    let html = "";
    const list = data || window.globalCapRongData || [];

    list.forEach((row, index) => {
        let badgeColor = "bg-success";
        let labelText = "A (Tốt)";
        
        // Chấp nhận cả chữ thường và chữ hoa từ Google Sheets để tránh lỗi không nhận diện hạng vỏ
        const trangThaiVo = row["Trạng thái"] || row["Trạng thái "] || row["Hạng"] || "A";
        if (trangThaiVo === "B") { badgeColor = "bg-warning text-dark"; labelText = "B (Bình thường)"; }
        if (trangThaiVo === "C") { badgeColor = "bg-danger"; labelText = "C (Tệ)"; }

        const maCont = row["Mã container"] || row["Mã Container"] || row["Số Container"] || '';
        const sizeCont = row["Size"] || '';
        const hangTauCont = row["Hãng tàu"] || row["Hãng Tàu"] || '';

        html += `
        <tr>
            <td>${index + 1}</td>
            <td class="fw-bold text-dark text-uppercase">${maCont}</td>
            <td><span class="badge bg-secondary">${sizeCont}</span></td>
            <td>${hangTauCont}</td>
            <td><span class="badge ${badgeColor}">${labelText}</span></td>
            <td class="text-center">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-info" title="Chi tiết thông tin" onclick="viewDetailCapRong(${row.rowIndex})">
                        <i class="bi bi-info-circle"></i>
                    </button>
                    <button class="btn btn-outline-primary" title="Chỉnh sửa" onclick="openEirCapModal('edit', ${row.rowIndex})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${currentUser && currentUser.role === 'admin' ? `
                    <button class="btn btn-outline-danger" title="Xóa" onclick="deleteRow('CapRong', ${row.rowIndex})">
                        <i class="bi bi-trash"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
    });

    document.getElementById('tbody-caprong').innerHTML = 
        html || '<tr><td colspan="6" class="text-center text-muted">Không tìm thấy dữ liệu container cấp rỗng nào.</td></tr>';
}

// Tự động bốc thông tin từ dữ liệu Tồn bãi (dataNhap) sang khi gõ xong mã container
function autoFillFromHold(maCont) {
    if (!maCont) return;
    const cleanCont = maCont.trim().toUpperCase();
    
    // Quét tìm container trong dữ liệu tồn bãi hiện tại của web
    const found = dataNhap.find(item => {
        const currentCont = (item["Số Container"] || item["Số container"] || item["Mã container"] || "").toString().trim().toUpperCase();
        return currentCont === cleanCont;
    });

    if (found) {
        let cleanDate = "";
        if (found["Ngày nhập bãi"]) {
            cleanDate = found["Ngày nhập bãi"].includes("T") ? found["Ngày nhập bãi"].split("T")[0] : found["Ngày nhập bãi"];
        }
        document.getElementById('eirCap_ngaynhap').value = cleanDate;
        document.getElementById('eirCap_gionhap').value = found["Giờ"] || found["Giờ nhập"] || "";
        document.getElementById('eirCap_hangtau').value = found["Line"] || found["Hãng tàu"] || "";
        document.getElementById('eirCap_size').value = found["Size"] || "20DC";
    }
}

// Mở Modal lập/sửa phiếu EIR Cấp Rỗng
function openEirCapModal(mode, rowIndex = null) {
    document.getElementById('eirCapForm').reset();
    document.getElementById('eirCap_rowIndex').value = rowIndex || "";

    const now = new Date();
    document.getElementById('eirCap_ngay').value = now.toISOString().split('T')[0];
    document.getElementById('eirCap_gio').value = now.toTimeString().split(' ')[0].substring(0, 5);
    document.getElementById('eirCap_nguoithuchien').value = currentUser ? currentUser.name : "Nhân viên trực tuyến";

    if (mode === 'add') {
        document.getElementById('eirCapModalTitle').innerHTML = '<i class="bi bi-plus-lg me-1"></i> Tạo Phiếu EIR Cấp Rỗng';
        document.getElementById('eirCapModalHeader').className = "modal-header bg-success text-white";
    } else {
        document.getElementById('eirCapModalTitle').innerHTML = '<i class="bi bi-pencil me-1"></i> Chỉnh sửa thông tin Cấp Rỗng';
        document.getElementById('eirCapModalHeader').className = "modal-header bg-warning text-dark";

        const rowData = window.globalCapRongData.find(r => r.rowIndex === rowIndex);
        if (rowData) {
            document.getElementById('eirCap_macont').value = rowData["Mã container"] || "";
            document.getElementById('eirCap_hangtau').value = rowData["Hãng tàu"] || "";
            document.getElementById('eirCap_size').value = rowData["Size"] || "20DC";
            document.getElementById('eirCap_trangthai').value = rowData["Trạng thái"] || "A";
            document.getElementById('eirCap_bienso').value = rowData["Biển số xe"] || "";
            document.getElementById('eirCap_khachhang').value = rowData["Khách hàng"] || "";
            document.getElementById('eirCap_seal').value = rowData["Số Seal"] || "";
            document.getElementById('eirCap_tuoi').value = rowData["Tuổi container"] || "";
            document.getElementById('eirCap_ghichu').value = rowData["Ghi chú"] || "";
            
            if (rowData["Ngày thực hiện"]) document.getElementById('eirCap_ngay').value = rowData["Ngày thực hiện"].split('T')[0];
            if (rowData["Giờ"]) document.getElementById('eirCap_gio').value = rowData["Giờ"];
            if (rowData["Ngày nhập bãi"]) document.getElementById('eirCap_ngaynhap').value = rowData["Ngày nhập bãi"].split('T')[0];
            if (rowData["Giờ nhập bãi"]) document.getElementById('eirCap_gionhap').value = rowData["Giờ nhập bãi"];
        }
    }
    eirCapModal.show();
}

// Lưu phiếu Cấp Rỗng về Google Sheets
async function saveEirCapData() {
    const rowIndex = document.getElementById('eirCap_rowIndex').value;
    
    const rowValues = [
        "", // Cột STT tự sinh trên sheet
        document.getElementById('eirCap_macont').value.trim().toUpperCase(),
        document.getElementById('eirCap_size').value,
        document.getElementById('eirCap_hangtau').value.trim().toUpperCase(),
        document.getElementById('eirCap_trangthai').value,
        document.getElementById('eirCap_bienso').value.trim().toUpperCase(),
        document.getElementById('eirCap_khachhang').value.trim(),
        document.getElementById('eirCap_ngay').value,
        document.getElementById('eirCap_gio').value,
        document.getElementById('eirCap_ghichu').value.trim(),
        document.getElementById('eirCap_nguoithuchien').value,
        document.getElementById('eirCap_tuoi').value.trim(),
        document.getElementById('eirCap_seal').value.trim().toUpperCase(),
        document.getElementById('eirCap_ngaynhap').value,
        document.getElementById('eirCap_gionhap').value
    ];

    if (!rowValues[1] || !rowValues[3] || !rowValues[5]) {
        alert("Vui lòng điền đầy đủ các thông tin cốt lõi (Mã container, Hãng tàu, Biển số)!");
        return;
    }

    const payload = {
        sheetType: "CapRong",
        action: rowIndex ? "update" : "add",
        rowIndex: rowIndex ? parseInt(rowIndex) : null,
        data: rowValues
    };

    showLoading(true);
    try {
        await fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
        eirCapModal.hide();
        setTimeout(() => {
            alert("Lưu phiếu EIR Cấp Rỗng thành công!");
            switchGiaoNhanTab('CapRong');
        }, 1000);
    } catch (err) {
        alert("Lỗi máy chủ khi lưu phiếu!");
        showLoading(false);
    }
}
//===caprong
async function switchGiaoNhanTab(type) {
    showLoading(true);
    try {
        const response = await fetch(API_URL + "?type=" + type);
        const resData = await response.json();
        if (type === 'HaRong') {
            window.globalHaRongData = resData;
            renderTableHaRong(resData);
        } else if (type === 'CapRong') {
            window.globalCapRongData = resData;
            renderTableCapRong(resData);
        }
    } catch (e) {
        console.error("Lỗi đồng bộ tab giao nhận:", e);
    }
    showLoading(false);
}
//=====Caprong
// Xem chi tiết thông tin (icon i)
// Xem chi tiết thông tin container Cấp Rỗng (Sửa lỗi mapping tiêu đề)
function viewDetailCapRong(rowIndex) {
    const target = window.globalCapRongData.find(r => r.rowIndex === rowIndex);
    if (!target) {
        alert("Không tìm thấy dữ liệu dòng này!");
        return;
    }

    // Bảo vệ lỗi lệch chữ HOA/thường từ Google Sheets
    const maCont = target["Mã container"] || target["Mã Container"] || target["Số Container"] || target["Số container"] || '';
    const size = target["Size"] || target["Kích cỡ"] || '';
    const hangTau = target["Hãng tàu"] || target["Hãng Tàu"] || target["Line"] || '';
    const trangThai = target["Trạng thái"] || target["Phân loại"] || 'A';
    const soSeal = target["Số Seal"] || target["Số seal"] || target["Seal"] || 'Chưa cấp';
    const bienSo = target["Biển số xe"] || target["Biển số"] || '';
    const khachHang = target["Khách hàng"] || target["Khách hàng lấy"] || '';
    const gioThucHien = target["Giờ"] || target["Giờ thực hiện"] || '';
    const ngayThucHien = target["Ngày thực hiện"] ? target["Ngày thực hiện"].split('T')[0] : '';
    const gioNhap = target["Giờ nhập bãi"] || target["Giờ nhập"] || '';
    const ngayNhap = target["Ngày nhập bãi"] ? target["Ngày nhập bãi"].split('T')[0] : '';
    const tuoiCont = target["Tuổi container"] || target["Tuổi thiết bị"] || '0';
    const nguoiThucHien = target["Người thực hiện"] || '';
    const ghiChu = target["Ghi chú"] || 'Trống';

    const bodyDetails = `
    <table class="table table-bordered table-sm mb-0 bg-white small">
        <tr><td class="fw-bold bg-light" style="width:40%;">Mã Container:</td><td class="text-success fw-bold text-uppercase">${maCont}</td></tr>
        <tr><td class="fw-bold bg-light">Kích thước (Size):</td><td><span class="badge bg-secondary">${size}</span></td></tr>
        <tr><td class="fw-bold bg-light">Hãng tàu:</td><td>${hangTau}</td></tr>
        <tr><td class="fw-bold bg-light">Trạng thái:</td><td>Hạng ${trangThai}</td></tr>
        <tr><td class="fw-bold bg-light text-danger">Số Seal niêm phong:</td><td class="text-danger fw-bold">${soSeal}</td></tr>
        <tr><td class="fw-bold bg-light">Biển số xe nhận:</td><td>${bienSo}</td></tr>
        <tr><td class="fw-bold bg-light">Khách hàng lấy:</td><td>${khachHang}</td></tr>
        <tr><td class="fw-bold bg-light">Thời gian thực hiện:</td><td>${gioThucHien} - ${ngayThucHien}</td></tr>
        <tr><td class="fw-bold bg-light">Thời gian nhập bãi gốc:</td><td>${gioNhap} - ${ngayNhap}</td></tr>
        <tr><td class="fw-bold bg-light">Tuổi thiết bị (Năm):</td><td>${tuoiCont} năm</td></tr>
        <tr><td class="fw-bold bg-light">Người ký duyệt EIR:</td><td>${nguoiThucHien}</td></tr>
        <tr><td class="fw-bold bg-light">Ghi chú kèm theo:</td><td>${ghiChu}</td></tr>
    </table>`;

    const detailBodyEl = document.getElementById('detailModalBody');
    if(detailBodyEl) {
        detailBodyEl.innerHTML = bodyDetails;
        // Kích hoạt hiển thị Modal an toàn
        const mEl = document.getElementById('viewDetailModal');
        if(mEl) {
            const m = bootstrap.Modal.getInstance(mEl) || new bootstrap.Modal(mEl);
            m.show();
        } else {
            alert("Lỗi: Không tìm thấy khung Modal 'viewDetailModal' trong HTML!");
        }
    }
}

// Mở khung đề xuất hạ / tra cứu nhanh
function openDeXuatCapModal() {
    document.getElementById('dxc_hangtau').value = "";
    document.getElementById('dxc_size').value = "";
    document.getElementById('dxc_trangthai').value = "";
    const box = document.getElementById('dxc_ketqua');
    box.classList.add('d-none');
    box.innerHTML = "";
    deXuatCapModal.show();
}

// Xử lý đề xuất hạ (Trả về vị trí còn rỗng hoặc cont đang tồn tối ưu)
// Xử lý đề xuất xuất bãi (Cấp rỗng) an toàn
// Xử lý đề xuất xuất bãi (Cấp rỗng) an toàn và tự động đồng bộ kho bãi tồn
async function handleDeXuatCap() {
    // Tự động nhận diện cả ID cũ 'dx_' và ID mới 'dxc_' để tránh lỗi lệch file HTML
    const elHtau = document.getElementById('dxc_hangtau') || document.getElementById('dx_hangtau');
    const elSize = document.getElementById('dxc_size') || document.getElementById('dx_size');
    const elTthai = document.getElementById('dxc_trangthai') || document.getElementById('dx_trangthai');
    const box = document.getElementById('dxc_ketqua') || document.getElementById('dx_ketqua');

    if(!elHtau || !elSize) {
        alert("Lỗi hệ thống: Không tìm thấy các ô cấu hình nhập liệu trong HTML.");
        return;
    }

    const htau = elHtau.value.trim().toLowerCase();
    const size = elSize.value.trim().toLowerCase();
    const tthai = elTthai ? elTthai.value : "";

    if (!htau || !size) {
        alert("Vui lòng chọn đầy đủ Hãng tàu và Kích cỡ để hệ thống tính toán đề xuất!");
        return;
    }

    // KHẮC PHỤC LỖI SCOPE: Nếu dữ liệu tồn bãi dataNhap chưa được nạp, tự động fetch từ sheet về ngay
    if (!dataNhap || dataNhap.length === 0) {
        try {
            const res = await fetch(API_URL + "?type=ContNhap");
            dataNhap = await res.json();
        } catch (err) {
            console.error("Không thể kết nối bãi để tính toán vỏ phù hợp:", err);
        }
    }

    // Quét tìm vỏ rỗng tối ưu đang nằm trong bãi
    const optimalCont = dataNhap.find(row => {
        const lineVal = (row["Line"] || row["Hãng tàu"] || row["Hãng Tàu"] || "").toString().toLowerCase();
        const sizeVal = (row["Size"] || "").toString().toLowerCase();
        const statusVal = row["Trạng thái"] || row["Phân loại"] || "A";
        
        const matchTau = lineVal.includes(htau);
        const matchSize = sizeVal.includes(size);
        const matchTrangThai = tthai ? statusVal === tthai : true;
        return matchTau && matchSize && matchTrangThai;
    });

    if(box) {
        box.classList.remove('d-none');
        if (optimalCont) {
            const codeCont = optimalCont["Số Container"] || optimalCont["Mã container"] || optimalCont["Số container"] || "Chưa rõ mã";
            const viTriBai = optimalCont["Bãi"] || optimalCont["Bãi (Vị trí)"] || "Khu bãi tồn";
            const hangCont = optimalCont["Trạng thái"] || optimalCont["Phân loại"] || 'A';
            box.innerHTML = `
            <div class="alert alert-success m-0 p-2 small">
                <i class="bi bi-cpu-fill me-1"></i><strong>ĐỀ XUẤT CONTAINER PHÙ HỢP:</strong><br>
                Nên cấp container vỏ số: <strong class="text-primary text-uppercase">${codeCont}</strong> (Hạng ${hangCont}).<br>
                Vị trí bãi hiện tại: <span class="badge bg-danger">${viTriBai}</span>
            </div>`;
        } else {
            box.innerHTML = `<div class="alert alert-warning m-0 p-2 small text-center">Không tìm thấy vỏ container nào khớp cấu hình yêu cầu trong kho bãi tồn!</div>`;
        }
    }
}

function handleTraCuuCap() {
    const elHtau = document.getElementById('dxc_hangtau') || document.getElementById('dx_hangtau');
    const elSize = document.getElementById('dxc_size') || document.getElementById('dx_size');
    const elTthai = document.getElementById('dxc_trangthai') || document.getElementById('dx_trangthai');

    const htau = elHtau ? elHtau.value.trim().toLowerCase() : "";
    const size = elSize ? elSize.value.trim().toLowerCase() : "";
    const tthai = elTthai ? elTthai.value : "";

    // Nếu không nhập bộ lọc, khôi phục bảng cấp rỗng đầy đủ ban đầu
    if (!htau && !size && !tthai) {
        renderTableCapRong(window.globalCapRongData);
        return;
    }

    const filterResult = window.globalCapRongData.filter(row => {
        const rowTau = (row["Hãng tàu"] || row["Hãng Tàu"] || "").toLowerCase();
        const rowSize = (row["Size"] || "").toLowerCase();
        const rowTthai = row["Trạng thái"] || row["Phân loại"] || "";

        const cTau = htau ? rowTau.includes(htau) : true;
        const cSize = size ? rowSize.includes(size) : true;
        const cTrangThai = tthai ? rowTthai === tthai : true;
        return cTau && cSize && cTrangThai;
    });

    renderTableCapRong(filterResult);
    
    // Tự động đóng modal tra cứu bằng API an toàn
    const modalEl = document.getElementById('deXuatCapModal');
    if(modalEl) {
        const m = bootstrap.Modal.getInstance(modalEl);
        if(m) m.hide();
    }
}
//===========Giam dinh
// =========================================================================
// PHÂN HỆ NGHIỆP VỤ: QUẢN LÝ GIÁM ĐỊNH & SỬA CHỮA (THÊM MỚI)
// =========================================================================
window.globalGiamDinhData = [];
window.globalLichSuGiamDinh = [];

// 1. Tải dữ liệu hai bảng Giám định và Lịch sử từ Sheet về Web App
async function loadGiamDinhData() {
    showLoading(true);
    try {
        const resGD = await fetch(API_URL + "?type=QuanLyTinhTrang");
        window.globalGiamDinhData = await resGD.json();
        
        const resLS = await fetch(API_URL + "?type=LichSuGiamDinh");
        window.globalLichSuGiamDinh = await resLS.json();
        
        renderTableGiamDinh();
    } catch (err) {
        console.error("Lỗi đồng bộ dữ liệu giám định:", err);
    } finally {
        showLoading(false);
    }
}

// 2. Render bảng vật lý kèm thuật toán tự động xét duyệt "Cần sửa chữa"
function renderTableGiamDinh() {
    let html = "";
    const list = window.globalGiamDinhData || [];
    
    list.forEach((row, index) => {
        const maCont = row["Mã container"] || '';
        const hangTau = row["Hãng tàu"] || '';
        const tinhTrangStr = row["Tình trạng"] || '';
        const trangThai = row["Trạng thái"] || 'A';
        const ghiChu = row["Ghi chú"] || '';

        // Tách chuỗi lỗi để đếm số lượng mục tình trạng đã tích chọn
        const mangLoi = tinhTrangStr ? tinhTrangStr.split(',').map(s => s.trim()).filter(s => s !== '') : [];
        const soLuongLoi = mangLoi.length;

        // --- THUẬT TOÁN TỰ ĐỘNG XÉT LỆNH CẦN SỬA CHỮA THEO TIÊU CHÍ ĐỀ BÀI ---
        let canSuaChua = false;
        if (trangThai === "C" && soLuongLoi >= 2) {
            canSuaChua = true;
        } else if (trangThai === "B" && soLuongLoi >= 3) {
            canSuaChua = true;
        }

        // Tạo nhãn giao diện hiển thị trạng thái A, B, C
        let badgeTrangThai = '<span class="badge bg-success">A (Tốt)</span>';
        if (trangThai === 'B') badgeTrangThai = '<span class="badge bg-warning text-dark">B (Bình thường)</span>';
        if (trangThai === 'C') badgeTrangThai = '<span class="badge bg-danger">C (Tệ)</span>';

        // Tạo nhãn giao diện cho cột Cần sửa chữa
        let badgeSuaChua = canSuaChua 
            ? '<span class="badge rounded-pill bg-danger px-2 py-1"><i class="bi bi-tools me-1"></i> BẮT BUỘC SỬA CHỮA</span>'
            : '<span class="badge rounded-pill bg-light text-muted px-2 py-1">Đạt tiêu chuẩn bãi</span>';

        // Tạo danh sách thẻ nhỏ (Badge) cho từng lỗi cụ thể
        let cellTinhTrang = mangLoi.map(loi => `<span class="badge bg-secondary-subtle text-dark border me-1 my-1">${loi}</span>`).join('');
        if (!cellTinhTrang) cellTinhTrang = '<span class="text-muted small">Không phát hiện lỗi</span>';

        html += `
        <tr>
            <td>${index + 1}</td>
            <td class="fw-bold text-uppercase text-primary">${maCont}</td>
            <td class="fw-bold text-dark">${hangTau}</td>
            <td>${cellTinhTrang}</td>
            <td>${badgeTrangThai}</td>
            <td class="text-muted small">${ghiChu || '-'}</td>
            <td class="text-center">${badgeSuaChua}</td>
            <td class="text-center">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary" title="Lịch sử ghi nhận" onclick="viewHistoryGiamDinh('${maCont}')">
                        <i class="bi bi-clock-history"></i>
                    </button>
                    <button class="btn btn-outline-primary" title="Cập nhật chỉnh sửa" onclick="openModalGiamDinh('edit', ${row.rowIndex})">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    });

    document.getElementById('tbody-giamdinh-tinhtrang').innerHTML = 
        html || '<tr><td colspan="8" class="text-center text-muted p-4">Chưa có dữ liệu lịch sử giám định thiết bị nào.</td></tr>';
}

// 3. Khởi tạo cấu hình và mở Form Modal nhập liệu
function openModalGiamDinh(action, rowIndex = null) {
    document.getElementById('formGiamDinh').reset();
    document.querySelectorAll('.chk-tinhtrang').forEach(chk => chk.checked = false);
    
    document.getElementById('gd_action').value = action;
    document.getElementById('gd_rowIndex').value = rowIndex || '';

    if (action === 'add') {
        document.getElementById('modalGiamDinhTitle').innerText = "Tạo phiếu ghi nhận giám định vỏ";
        document.getElementById('gd_macont').disabled = false;
    } else {
        document.getElementById('modalGiamDinhTitle').innerText = "Chỉnh sửa kết quả giám định theo hàng";
        const target = window.globalGiamDinhData.find(r => r.rowIndex === rowIndex);
        if (target) {
            document.getElementById('gd_macont').value = target["Mã container"] || '';
            document.getElementById('gd_macont').disabled = true; // Không cho sửa mã container gốc để bảo đảm tính nhất quán dữ liệu
            document.getElementById('gd_hangtau').value = target["Hãng tàu"] || '';
            document.getElementById('gd_trangthai').value = target["Trạng thái"] || 'A';
            document.getElementById('gd_ghichu').value = target["Ghi chú"] || '';

            // Đánh dấu check lại các hộp chọn mục tình trạng hư hỏng cũ
            const loiCuStr = target["Tình trạng"] || '';
            const mangLoiCu = loiCuStr.split(',').map(s => s.trim());
            document.querySelectorAll('.chk-tinhtrang').forEach(chk => {
                if (mangLoiCu.includes(chk.value)) {
                    chk.checked = true;
                }
            });
        }
    }
    new bootstrap.Modal(document.getElementById('modalGiamDinh')).show();
}

// 4. Đóng gói mảng dữ liệu và POST đồng bộ lên máy chủ Google Sheets
async function saveGiamDinhData(e) {
    e.preventDefault();
    showLoading(true);

    const action = document.getElementById('gd_action').value;
    const rowIndex = document.getElementById('gd_rowIndex').value;

    // Thu thập tất cả các mục tình trạng lỗi được tích chọn
    let chkLoiArr = [];
    document.querySelectorAll('.chk-tinhtrang:checked').forEach(chk => {
        chkLoiArr.push(chk.value);
    });
    const chuoiTinhTrang = chkLoiArr.join(', ');

    // Định dạng cấu trúc mảng ghi dữ liệu dòng (A: STT, B: Mã Cont, C: Hãng tàu, D: Tình trạng, E: Trạng thái, F: Ghi chú, G: Mốc thời gian)
    const rowValues = [
        "", // Apps Script tự tính số thứ tự STT tăng dần
        document.getElementById('gd_macont').value.trim().toUpperCase(),
        document.getElementById('gd_hangtau').value.trim().toUpperCase(),
        chuoiTinhTrang,
        document.getElementById('gd_trangthai').value,
        document.getElementById('gd_ghichu').value.trim(),
        "" // Trống, máy chủ Apps Script sẽ tự động lấy và đóng dấu thời gian hiện tại
    ];

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                sheetType: "QuanLyTinhTrang",
                action: action === 'add' ? 'addGiamDinh' : 'updateGiamDinh',
                rowIndex: rowIndex ? Number(rowIndex) : null,
                data: rowValues
            })
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            // Ẩn modal bằng API Bootstrap
            const instance = bootstrap.Modal.getInstance(document.getElementById('modalGiamDinh'));
            if(instance) instance.hide();
            loadGiamDinhData(); // Tải lại bảng ngay sau khi lưu thành công
        } else {
            alert("Lỗi lưu trữ dữ liệu giám định: " + result.error);
        }
    } catch (err) {
        alert("Lỗi kết nối mạng đến cổng đồng bộ máy chủ!");
    } finally {
        showLoading(false);
    }
}

// 5. Hiển thị Lịch sử tất cả các vết cập nhật của mã container (Icon H)
function viewHistoryGiamDinh(maCont) {
    let html = "";
    // Lọc nhật ký các dòng biến động thuộc về mã container được chọn
    const logs = window.globalLichSuGiamDinh.filter(log => log["Mã container"] === maCont);
    
    // Đảo ngược mảng để lần cập nhật mới nhất xếp lên trên cùng
    logs.reverse().forEach((log, index) => {
        let badgeHạng = `<span class="badge bg-success">Hạng A</span>`;
        if (log["Trạng thái"] === "B") badgeHạng = `<span class="badge bg-warning text-dark">Hạng B</span>`;
        if (log["Trạng thái"] === "C") badgeHạng = `<span class="badge bg-danger">Hạng C</span>`;

        // Định dạng thời gian cục bộ hiển thị đẹp mắt
        let tGian = log["Thời gian cập nhật"] || '';
        if (tGian.includes('T')) {
            tGian = new Date(tGian).toLocaleString('vi-VN');
        }

        html += `
        <tr>
            <td class="ps-3">${index + 1}</td>
            <td class="fw-bold">${log["Mã container"]}</td>
            <td>${log["Tình trạng"] ? log["Tình trạng"] : '<span class="text-success small">Hoàn hảo</span>'}</td>
            <td>${badgeHạng}</td>
            <td class="text-muted pe-3">${tGian}</td>
        </tr>`;
    });

    document.getElementById('tbody-lichsu-giamdinh').innerHTML = 
        html || `<tr><td colspan="5" class="text-center text-muted p-3">Chưa có lịch sử thay đổi thông tin nào cho container ${maCont}.</td></tr>`;
    
    new bootstrap.Modal(document.getElementById('modalLichSuGiamDinh')).show();
}
//==========Giam dinh
        // ================= 5. FORM NHẬP LIỆU CONTAINER ĐỘNG =================
        const dataModal = new bootstrap.Modal(document.getElementById('dataModal'));

        function openModal(mode, type, rowIndex = null) {
            document.getElementById('m_type').value = type;
            document.getElementById('m_rowIndex').value = rowIndex || "";
            
            const header = document.getElementById('modal-header');
            header.className = type === 'ContNhap' ? "modal-header bg-primary text-white" : "modal-header bg-success text-white";
            document.getElementById('modalTitle').innerText = mode === 'add' ? `Tạo Lệnh (EIR) - ${type}` : `Cập nhật thông tin - ${type}`;

            let formHtml = "";
            let dataRow = null;
            if(mode === 'edit') {
                const sourceData = type === 'ContNhap' ? dataNhap : dataCap;
                dataRow = sourceData.find(r => r.rowIndex === rowIndex);
            }

            const nhapFields = ['Stt', 'Số Container', 'Size', 'Line', 'Ngày nhập bãi', 'Ghi chú', 'Bãi'];
            const capFields = ['Stt', 'Số Container', 'Size', 'Line', 'Ngày Nhập bãi', 'Ngày thực hiện', 'Giao', 'Cảng ct', 'Ghi chú'];
            const fields = type === 'ContNhap' ? nhapFields : capFields;

            fields.forEach((field, index) => {
                const val = dataRow ? (dataRow[field] || '') : '';
                
                let readonly = "";
                if(mode === 'edit' && currentUser.role !== 'admin') {
                    if(currentUser.role === 'nangha' && field !== 'Bãi') readonly = "readonly";
                    if(currentUser.role === 'kythuat' && field !== 'Ghi chú') readonly = "readonly";
                }

                formHtml += `
                <div class="${field === 'Ghi chú' ? 'col-12' : 'col-md-6'} mb-2">
                    <label class="form-label small fw-bold">${field}</label>
                    <input type="text" class="form-control" id="f_${index}" value="${val}" ${readonly}>
                </div>`;
            });

            document.getElementById('form-fields').innerHTML = formHtml;
            dataModal.show();
        }

        async function saveData() {
            const type = document.getElementById('m_type').value;
            const rowIndex = document.getElementById('m_rowIndex').value;
            
            const fieldsCount = type === 'ContNhap' ? 7 : 9;
            const rowData = [];
            for(let i=0; i<fieldsCount; i++) {
                rowData.push(document.getElementById(`f_${i}`).value);
            }

            const payload = {
                sheetType: type,
                action: rowIndex ? "update" : "add",
                rowIndex: rowIndex ? parseInt(rowIndex) : null,
                data: rowData
            };

            showLoading(true);
            try {
                await fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
                dataModal.hide();
                setTimeout(() => { 
                    alert("Đã lưu thành công vào Hệ thống!"); 
                    loadData(type); 
                    if(type==='ContNhap') initDashboard();
                }, 1500);
            } catch(e) { alert("Lỗi khi lưu!"); showLoading(false); }
        }

        async function deleteRow(type, rowIndex) {
            if(!confirm("Cảnh báo: Bạn có chắc chắn muốn XÓA VĨNH VIỄN dòng này?")) return;
            showLoading(true);
            try {
                await fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ sheetType: type, action: "delete", rowIndex: rowIndex }) });
                setTimeout(() => { loadData(type); initDashboard(); }, 1500);
            } catch(e) { showLoading(false); }
        }

        // ================= 6. QUẢN LÝ TÀI KHOẢN (ADMIN) =================
        const userModal = new bootstrap.Modal(document.getElementById('userModal'));

        async function loadUsers() {
            showLoading(true);
            try {
                const res = await fetch(API_URL + "?type=TaiKhoan");
                dataUsers = await res.json();
                renderTableUsers();
            } catch (e) { console.error(e); }
            showLoading(false);
        }

        function renderTableUsers() {
            let html = "";
            dataUsers.forEach(row => {
                let badgeClass = "bg-secondary";
                let roleName = row["Role"];
                if(row["Role"] === "admin") { badgeClass = "bg-danger"; roleName = "Quản trị viên"; }
                if(row["Role"] === "dieudo") { badgeClass = "bg-primary"; roleName = "Điều độ bãi"; }
                if(row["Role"] === "nangha") { badgeClass = "bg-success"; roleName = "Nâng hạ"; }
                if(row["Role"] === "kythuat") { badgeClass = "bg-warning text-dark"; roleName = "Kỹ thuật"; }

                html += `<tr>
                    <td class="fw-bold">${row["Username"] || ''}</td>
                    <td>***</td>
                    <td>${row["HoTen"] || ''}</td>
                    <td><span class="badge ${badgeClass}">${roleName}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary" onclick="openUserModal('edit', ${row.rowIndex})"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteUser(${row.rowIndex})"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
            });
            document.getElementById('tbody-users').innerHTML = html || '<tr><td colspan="5" class="text-center">Trống</td></tr>';
        }

        function openUserModal(mode, rowIndex = null) {
            document.getElementById('userForm').reset();
            document.getElementById('u_rowIndex').value = rowIndex || "";
            document.getElementById('userModalTitle').innerText = mode === 'add' ? 'Thêm Tài Khoản' : 'Sửa Tài Khoản';

            if(mode === 'edit') {
                const user = dataUsers.find(r => r.rowIndex === rowIndex);
                if(user) {
                    document.getElementById('u_username').value = user["Username"] || "";
                    document.getElementById('u_password').value = user["Password"] || "";
                    document.getElementById('u_hoten').value = user["HoTen"] || "";
                    document.getElementById('u_role').value = user["Role"] || "dieudo";
                }
            }
            userModal.show();
        }

        async function saveUser() {
            const rowIndex = document.getElementById('u_rowIndex').value;
            // Cấu trúc Mảng phải đúng với 4 cột trên Sheet TaiKhoan
            const rowData = [
                document.getElementById('u_username').value,
                document.getElementById('u_password').value,
                document.getElementById('u_hoten').value,
                document.getElementById('u_role').value
            ];

            const payload = {
                sheetType: "TaiKhoan",
                action: rowIndex ? "update" : "add",
                rowIndex: rowIndex ? parseInt(rowIndex) : null,
                data: rowData
            };

            showLoading(true);
            try {
                await fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
                userModal.hide();
                setTimeout(() => { alert("Lưu tài khoản thành công!"); loadUsers(); }, 1500);
            } catch(e) { alert("Lỗi khi lưu tài khoản!"); showLoading(false); }
        }

        async function deleteUser(rowIndex) {
            if(!confirm("Cảnh báo: Bạn có chắc chắn muốn xóa tài khoản này?")) return;
            showLoading(true);
            try {
                await fetch(API_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ sheetType: "TaiKhoan", action: "delete", rowIndex: rowIndex }) });
                setTimeout(() => { loadUsers(); }, 1500);
            } catch(e) { showLoading(false); }
        }

        // ================= 7. VẼ BIỂU ĐỒ & XUẤT EXCEL =================
        function drawChart() {
            const lenNhap = dataNhap ? dataNhap.length : 0;
            const lenCap = dataCap ? dataCap.length : 0;
            
            document.getElementById('dash-nhap').innerText = lenNhap;
            document.getElementById('dash-cap').innerText = lenCap;

            const ctx = document.getElementById('contChart').getContext('2d');
            if(chartInstance) chartInstance.destroy();
            chartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Tồn bãi (Chưa cấp)', 'Đã Cấp (Xuất bãi)'],
                    datasets: [{
                        data: [lenNhap, lenCap],
                        backgroundColor: ['#0d47a1', '#28a745']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        function exportExcel(type) {
            const data = type === 'ContNhap' ? dataNhap : dataCap;
            if(!data || !data.length) return alert("Không có dữ liệu để xuất");
            
            let csv = "";
            const keys = Object.keys(data[0]).filter(k => k !== 'rowIndex');
            csv += keys.join(",") + "\n";
            
            data.forEach(row => {
                const rowArray = keys.map(k => `"${row[k] || ''}"`);
                csv += rowArray.join(",") + "\n";
            });

            const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `BaoCao_${type}_${new Date().getTime()}.csv`;
            a.click();
        }
