  const API_URL = "https://script.google.com/macros/s/AKfycbwaMLkdxoX9rro7TQMm9R_-VYcAX_Qhi9aDaxX5Hwy6rDHOg-LDG7qFawlTRGjnL-bp/exec"; // <-- THAY LINK CỦA BẠN VÀO ĐÂY
        
        let currentUser = null;
        let dataNhap = [];
        let dataCap = [];
        let dataUsers = [];
        let chartInstance = null;

        let dataQuanLyLenh = [];

        document.getElementById('current-date').innerText = new Date().toLocaleDateString('vi-VN');
        const showLoading = (s) => document.getElementById('loader').style.display = s ? 'flex' : 'none';

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
                    alert("Lỗi kết nối API khi kiểm tra tài khoản!");
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
                document.querySelectorAll('.view-nhap, .view-cap, .view-dieudo').forEach(el => el.style.display = 'block');
            } else if(currentUser.role === 'nangha') {
                document.querySelectorAll('.view-nhap').forEach(el => el.style.display = 'block');
            } else if(currentUser.role === 'kythuat') {
                document.querySelectorAll('.view-nhap').forEach(el => el.style.display = 'block');
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
async function loadQuanLyLenh() {

    showLoading(true);

    try {

        const res = await fetch(API_URL + "?type=QuanLyLenh");

        dataQuanLyLenh = await res.json();

        renderTableQuanLyLenh();

    } catch(e) {

        console.error(e);

    }

    showLoading(false);
}

function renderTableQuanLyLenh(data = dataQuanLyLenh) {

    let html = "";

    data.forEach((row, index) => {

        if(row["Status"] === "ACCEPTED") return;

        const now = new Date();

        const expireDate = new Date(row["Ngày hạn"]);

        const isValid = now <= expireDate;

        html += `
        <tr>

            <td>${row["STT"] || index + 1}</td>

            <td>
                <span class="badge bg-primary">
                    ${row["Hãng tàu"] || ''}
                </span>
            </td>

            <td class="fw-bold text-dark">
                ${row["Booking ID"] || ''}
            </td>

            <td>

                ${
                    row["Yêu cầu"] === "Hạ rỗng"

                    ?

                    `<span class="badge bg-danger">
                        Hạ rỗng
                    </span>`

                    :

                    `<span class="badge bg-success">
                        Cấp rỗng
                    </span>`
                }

            </td>

            <td>
                ${row["Ngày bắt đầu"] || ''}
            </td>

            <td class="${isValid ? '' : 'text-danger fw-bold'}">
                ${row["Ngày hạn"] || ''}
            </td>

            <td class="text-center">

                ${
                    isValid

                    ?

                    `<button
                        class="btn btn-sm btn-success"
                        onclick="acceptBooking('${row["Booking ID"]}', ${row.rowIndex})"
                    >
                        <i class="bi bi-check-lg"></i>
                    </button>`

                    :

                    `<span class="badge bg-danger">
                        Hết hạn
                    </span>`
                }

            </td>

        </tr>
        `;
    });

    document.getElementById('tbody-quanlylenh').innerHTML =
        html ||
        '<tr><td colspan="7" class="text-center">Không có dữ liệu</td></tr>';
}

function searchBooking() {

    const keyword = document
        .getElementById('search-booking')
        .value
        .trim()
        .toLowerCase();

    const filtered = dataQuanLyLenh.filter(row => {

        return (
            row["Booking ID"] ||
            ''
        )
        .toLowerCase()
        .includes(keyword);

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
