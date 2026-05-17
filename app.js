const API_URL =
"https://script.google.com/macros/s/AKfycbz9M-dLvBOycjR_IhafjQ5uFozRP78zF3TZ2K66NnunEsKqXwWM4oLnDQyvpqbSF_Rt/exec";

let currentUser = null;
let dataNhap = [];
let dataCap = [];
let dataUsers = [];
let chartInstance = null;

document.getElementById('current-date').innerText =
new Date().toLocaleDateString('vi-VN');

const showLoading = (s) => {
    document.getElementById('loader').style.display =
        s ? 'flex' : 'none';
};

async function handleLogin(e) {

    e.preventDefault();

    const user =
        document.getElementById('username').value.trim();

    const pass =
        document.getElementById('password').value.trim();

    showLoading(true);

    try {

        const res =
            await fetch(API_URL + "?type=TaiKhoan");

        const users =
            await res.json();

        const found =
            users.find(u =>
                u.Username === user &&
                u.Password == pass
            );

        if(!found) {
            alert("Sai tài khoản!");
            showLoading(false);
            return;
        }

        currentUser = {
            name: found.HoTen,
            role: found.Role
        };

        document.getElementById('user-fullname').innerText =
            currentUser.name;

        document.getElementById('user-role').innerText =
            currentUser.role;

        document.getElementById('login-screen').style.display =
            'none';

        document.getElementById('app-screen').style.display =
            'block';

        await initDashboard();

    } catch(err) {

        console.error(err);
        alert("Lỗi kết nối API");

    }

    showLoading(false);
}

function switchPage(pageId, event) {

    document.querySelectorAll('.page')
        .forEach(p => p.classList.remove('active'));

    document.querySelectorAll('.nav-link')
        .forEach(p => p.classList.remove('active'));

    document.getElementById(pageId)
        .classList.add('active');

    event.currentTarget.classList.add('active');

    if(pageId === 'page-cont-nhap')
        loadData('ContNhap');

    if(pageId === 'page-cont-cap')
        loadData('ContCap');

    if(pageId === 'page-users')
        loadUsers();
}

async function initDashboard() {

    showLoading(true);

    try {

        const [resNhap, resCap] =
            await Promise.all([
                fetch(API_URL + "?type=ContNhap"),
                fetch(API_URL + "?type=ContCap")
            ]);

        dataNhap = await resNhap.json();
        dataCap = await resCap.json();

        drawChart();

    } catch(err) {

        console.error(err);

    }

    showLoading(false);
}

async function loadData(type) {

    showLoading(true);

    try {

        const res =
            await fetch(API_URL + "?type=" + type);

        const data =
            await res.json();

        if(type === 'ContNhap') {

            dataNhap = data;
            renderNhap();

        } else {

            dataCap = data;
            renderCap();

        }

    } catch(err) {

        console.error(err);

    }

    showLoading(false);
}

function renderNhap() {

    let html = "";

    dataNhap.forEach(row => {

        html += `
        <tr>
            <td>${row["Số Container"] || ''}</td>
            <td>${row["Size"] || ''}</td>
            <td>${row["Line"] || ''}</td>
            <td>${row["Bãi"] || ''}</td>
        </tr>
        `;
    });

    document.getElementById('tbody-nhap').innerHTML = html;
}

function renderCap() {

    let html = "";

    dataCap.forEach(row => {

        html += `
        <tr>
            <td>${row["Số Container"] || ''}</td>
            <td>${row["Size"] || ''}</td>
            <td>${row["Line"] || ''}</td>
            <td>${row["Giao"] || ''}</td>
        </tr>
        `;
    });

    document.getElementById('tbody-cap').innerHTML = html;
}

async function loadUsers() {

    showLoading(true);

    try {

        const res =
            await fetch(API_URL + "?type=TaiKhoan");

        dataUsers = await res.json();

        renderUsers();

    } catch(err) {

        console.error(err);

    }

    showLoading(false);
}

function renderUsers() {

    let html = "";

    dataUsers.forEach(row => {

        html += `
        <tr>
            <td>${row["Username"] || ''}</td>
            <td>${row["HoTen"] || ''}</td>
            <td>${row["Role"] || ''}</td>
        </tr>
        `;
    });

    document.getElementById('tbody-users').innerHTML =
        html;
}

function drawChart() {

    const lenNhap = dataNhap.length;
    const lenCap = dataCap.length;

    document.getElementById('dash-nhap').innerText =
        lenNhap;

    document.getElementById('dash-cap').innerText =
        lenCap;

    const ctx =
        document.getElementById('contChart');

    if(chartInstance)
        chartInstance.destroy();

    chartInstance = new Chart(ctx, {

        type: 'doughnut',

        data: {

            labels: [
                'Tồn bãi',
                'Đã cấp'
            ],

            datasets: [{
                data: [lenNhap, lenCap],
                backgroundColor: [
                    '#0d47a1',
                    '#28a745'
                ]
            }]
        },

        options: {
            responsive: true
        }
    });
}