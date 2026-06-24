// App State
const state = {
    inventory: [
        { id: 1, name: 'ขนมปังฟาร์มเฮ้าส์', lot: 'B-772', expiry: '2026-06-26', qty: 45, status: 'red' },
        { id: 2, name: 'นมสดพาสเจอร์ไรส์ 1 ลิตร', lot: 'L-88392', expiry: '2026-07-05', qty: 50, status: 'green' },
        { id: 3, name: 'นมสดพาสเจอร์ไรส์ 1 ลิตร', lot: 'L-88395', expiry: '2026-06-25', qty: 20, status: 'red' },
        { id: 4, name: 'น้ำส้มคั้น 100%', lot: 'J-992', expiry: '2026-06-30', qty: 30, status: 'yellow' },
        { id: 5, name: 'แยมสตรอว์เบอร์รี', lot: 'J-110', expiry: '2027-01-10', qty: 150, status: 'green' }
    ],
    history: [
        { text: 'ส่งบริจาค โยเกิร์ต (Lot C-101) จำนวน 15 ชิ้น', date: new Date(Date.now() - 3600000).toLocaleString('th-TH') },
        { text: 'ลดราคา 20% นมสด (Lot L-88390) จำนวน 40 ชิ้น', date: new Date(Date.now() - 86400000).toLocaleString('th-TH') }
    ],
    restockPredictions: [
        { 
            name: 'นมสดพาสเจอร์ไรส์ 1 ลิตร', 
            currentOrder: 300, 
            recommendedOrder: 150, 
            reason: 'ประวัติการหมดอายุสูงในฤดูฝน (ยอดขายตกลง 40%) แนะนำให้ลดปริมาณการสั่งซื้อเพื่อป้องกันสินค้าเน่าเสีย'
        },
        { 
            name: 'น้ำส้มคั้น 100%', 
            currentOrder: 50, 
            recommendedOrder: 120, 
            reason: 'AI วิเคราะห์เทรนด์วันหยุดยาวสุดสัปดาห์หน้า คาดว่ายอดขายจะเติบโตขึ้น แนะนำให้เพิ่มยอดสั่งซื้อ 2.4 เท่า'
        }
    ]
};

// DOM Elements
const views = document.querySelectorAll('.view-section');
const navLinks = document.querySelectorAll('.nav-links li');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    if(localStorage.getItem('freshflow_logged_in') === 'true') {
        showMainApp();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        localStorage.setItem('freshflow_logged_in', 'true');
        const username = document.getElementById('username').value;
        document.getElementById('display-name').textContent = username;
        showMainApp();
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('freshflow_logged_in');
        document.getElementById('app-wrapper').classList.add('hidden');
        document.getElementById('login-view').classList.add('active');
        stopCamera();
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetView = link.getAttribute('data-view');
            switchView(targetView);
        });
    });

    initScannerLogic();
    renderDashboard();
    renderInventory();
    renderHistory();
}

function showMainApp() {
    document.getElementById('login-view').classList.remove('active');
    document.getElementById('app-wrapper').classList.remove('hidden');
    switchView('dashboard');
}

window.switchView = function(viewId) {
    navLinks.forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-links li[data-view="${viewId}"]`).classList.add('active');

    views.forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewId}-view`).classList.add('active');

    if(viewId === 'inbound') {
        startCamera();
        resetScannerUI();
    } else {
        stopCamera();
    }

    if(viewId === 'dashboard') renderDashboard();
    if(viewId === 'inventory') renderInventory();
    if(viewId === 'actions') renderHistory();
}

// --- RENDERING LOGIC ---
function renderDashboard() {
    let totalGreen = 0, totalYellow = 0, totalRed = 0, grandTotal = 0;
    
    state.inventory.forEach(item => {
        if(item.status === 'green') totalGreen += item.qty;
        if(item.status === 'yellow') totalYellow += item.qty;
        if(item.status === 'red') totalRed += item.qty;
        grandTotal += item.qty;
    });

    document.getElementById('stat-green').textContent = totalGreen.toLocaleString();
    document.getElementById('stat-yellow').textContent = totalYellow.toLocaleString();
    document.getElementById('stat-red').textContent = totalRed.toLocaleString();
    document.getElementById('stat-total').textContent = grandTotal.toLocaleString();

    // 1. Render Action Engine Recommendations (Including Bundling)
    const actionList = document.getElementById('dashboard-actions-list');
    actionList.innerHTML = '';
    
    const riskItems = state.inventory.filter(i => i.status !== 'green');
    
    // Add a custom bundling recommendation if Bread is red
    const breadAtRisk = riskItems.find(i => i.name.includes('ขนมปัง') && i.status === 'red');
    if(breadAtRisk) {
        actionList.innerHTML += `
            <li class="action-item" style="background-color: #f5f3ff; border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; border: 1px solid #ddd6fe;">
                <div class="action-details">
                    <span class="dot dot-purple"></span>
                    <div>
                        <h4><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--purple-color)"></i> AI จับคู่สินค้า (Cross-Selling)</h4>
                        <p><strong>${breadAtRisk.name} (Lot ${breadAtRisk.lot})</strong> ใกล้หมดอายุ มีจำนวน ${breadAtRisk.qty} ชิ้น</p>
                        <p>แยมสตรอว์เบอร์รีเป็นสินค้าขายดี อัตราหมุนเวียนสูง</p>
                        <span class="recommendation-text" style="color:var(--purple-color); background:#ede9fe;">
                            เสนอโปรโมชั่น: "ซื้อแยม 1 ขวด รับสิทธิ์ซื้อขนมปังลด 30%" หรือ "ซื้อ 2 แถม 1"
                        </span>
                    </div>
                </div>
                <button class="btn btn-action" onclick="applyBundle('${breadAtRisk.name}', ${breadAtRisk.id})">สร้างโปรโมชั่น</button>
            </li>
        `;
    }

    riskItems.forEach(item => {
        // Skip bread as we already rendered bundle for it above to avoid duplicate UI clutter
        if(item.name.includes('ขนมปัง')) return; 

        const actionText = item.status === 'red' ? 'ส่งบริจาค / Clearance Sale' : 'จัดโปรโมชั่นลดราคาด่วน';
        const btnText = item.status === 'red' ? 'ดำเนินการ' : 'ลดราคา 20%';
        actionList.innerHTML += `
            <li class="action-item">
                <div class="action-details">
                    <span class="dot dot-${item.status}"></span>
                    <div>
                        <h4>${item.name} (ล็อต ${item.lot})</h4>
                        <p>จำนวน ${item.qty} ชิ้น | หมดอายุ: ${item.expiry}</p>
                        <span class="recommendation-text ${item.status === 'red' ? 'recommendation-warning' : ''}">แนะนำ: ${actionText}</span>
                    </div>
                </div>
                <button class="btn btn-outline" onclick="takeAction(${item.id}, '${btnText}')">${btnText}</button>
            </li>
        `;
    });

    if(actionList.innerHTML === '') {
         actionList.innerHTML = '<li style="padding: 20px; text-align:center; color:#64748b;">ไม่มีสินค้าที่ต้องจัดการเร่งด่วน</li>';
    }

    // 2. Render Smart Restock Predictions
    const restockList = document.getElementById('dashboard-restock-list');
    restockList.innerHTML = '';

    state.restockPredictions.forEach((pred, index) => {
        const trendIcon = pred.recommendedOrder > pred.currentOrder ? '<i class="fa-solid fa-arrow-trend-up" style="color:var(--success-color);"></i>' : '<i class="fa-solid fa-arrow-trend-down" style="color:var(--danger-color);"></i>';
        restockList.innerHTML += `
            <li class="action-item">
                <div class="action-details">
                    <span class="dot dot-info"></span>
                    <div>
                        <h4>${pred.name}</h4>
                        <p style="margin-bottom: 8px;">ยอดสั่งซื้อเดิม: <strong>${pred.currentOrder}</strong> ชิ้น &rarr; ยอดสั่งซื้อแนะนำ: <strong>${pred.recommendedOrder}</strong> ชิ้น ${trendIcon}</p>
                        <span class="recommendation-text" style="background:#f1f5f9; color:var(--text-muted); font-weight:normal; font-size:12px;">
                            <i class="fa-solid fa-brain" style="color:var(--primary-color);"></i> เหตุผล: ${pred.reason}
                        </span>
                    </div>
                </div>
                <button class="btn btn-outline" onclick="applyRestock(${index})">ปรับยอดสั่งซื้อ</button>
            </li>
        `;
    });
}

window.applyBundle = function(itemName, id) {
    state.history.unshift({
        text: `สร้างโปรโมชั่นจับคู่: ซื้อแยม รับสิทธิ์ซื้อ ${itemName} ลด 30%`,
        date: new Date().toLocaleString('th-TH')
    });
    const itemIndex = state.inventory.findIndex(i => i.id === id);
    if(itemIndex > -1) state.inventory.splice(itemIndex, 1);
    
    renderDashboard();
    renderInventory();
    alert('ระบบได้เชื่อมต่อกับจุดขาย (POS) เพื่อเริ่มโปรโมชั่นจับคู่สินค้านี้เรียบร้อยแล้ว');
}

window.applyRestock = function(index) {
    const pred = state.restockPredictions[index];
    state.history.unshift({
        text: `อนุมัติ AI ปรับยอดสั่งซื้อ ${pred.name} จาก ${pred.currentOrder} เป็น ${pred.recommendedOrder} ชิ้น`,
        date: new Date().toLocaleString('th-TH')
    });
    // Remove prediction after applied
    state.restockPredictions.splice(index, 1);
    renderDashboard();
    alert('ระบบได้ปรับยอดแผนการสั่งซื้อ (PO) ในรอบถัดไปอัตโนมัติ');
}

function renderInventory() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';
    
    const grouped = {};
    state.inventory.forEach(item => {
        if(!grouped[item.name]) {
            grouped[item.name] = { name: item.name, totalQty: 0, lots: [] };
        }
        grouped[item.name].totalQty += item.qty;
        grouped[item.name].lots.push(item);
    });

    Object.values(grouped).forEach((group, index) => {
        let worstStatus = 'green';
        if(group.lots.some(l => l.status === 'yellow')) worstStatus = 'yellow';
        if(group.lots.some(l => l.status === 'red')) worstStatus = 'red';

        let statusText = 'ปลอดภัย';
        if(worstStatus === 'yellow') statusText = 'เสี่ยง';
        if(worstStatus === 'red') statusText = 'วิกฤต';
        
        const groupId = `group-${index}`;

        list.innerHTML += `
            <tr style="background-color: #fafafa; border-top: 2px solid var(--border-color);">
                <td style="font-weight:600; color:var(--text-main);">${group.name}</td>
                <td style="font-weight:700; color:var(--primary-color); font-size:16px;">${group.totalQty.toLocaleString()} ชิ้น</td>
                <td><span class="badge" style="background: var(--${worstStatus === 'green' ? 'success' : worstStatus === 'yellow' ? 'warning' : 'danger'}-color);">${statusText}</span></td>
                <td>
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size:12px; margin-right: 8px;" onclick="toggleLots('${groupId}')"><i class="fa-solid fa-list"></i> ดูย่อยลอต</button>
                    <button class="btn btn-primary" style="padding: 6px 12px; font-size:12px;" onclick="switchView('inbound')"><i class="fa-solid fa-plus"></i> เติม</button>
                </td>
            </tr>
        `;

        group.lots.forEach(lot => {
            let lotStatusText = lot.status === 'green' ? 'ปลอดภัย' : lot.status === 'yellow' ? 'เสี่ยง' : 'วิกฤต';
            list.innerHTML += `
                <tr class="lot-row ${groupId}" style="display:none; background: #ffffff;">
                    <td style="padding-left: 32px; font-size:13px; color:var(--text-muted);">↳ Lot: ${lot.lot}</td>
                    <td style="font-size:13px; color:var(--text-muted);">${lot.qty} ชิ้น</td>
                    <td style="font-size:13px; color:var(--text-muted);">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background: var(--${lot.status === 'green' ? 'success' : lot.status === 'yellow' ? 'warning' : 'danger'}-color); margin-right:4px;"></span>
                        หมดอายุ: ${lot.expiry}
                    </td>
                    <td></td>
                </tr>
            `;
        });
    });

    if(Object.keys(grouped).length === 0) {
        list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">ไม่มีสินค้าในคลัง</td></tr>';
    }
}

window.toggleLots = function(groupId) {
    const rows = document.querySelectorAll(`.${groupId}`);
    rows.forEach(row => {
        row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    });
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    if(state.history.length === 0) {
        list.innerHTML = '<li style="text-align:center; padding:20px;">ไม่มีประวัติการดำเนินการ</li>';
        return;
    }
    state.history.forEach(h => {
        list.innerHTML += `
            <li class="history-item">
                <div class="action-details">
                    <span class="dot dot-success"></span>
                    <div>
                        <h4>${h.text}</h4>
                        <p>${h.date}</p>
                    </div>
                </div>
            </li>
        `;
    });
}

window.takeAction = function(id, actionText) {
    const itemIndex = state.inventory.findIndex(i => i.id === id);
    if(itemIndex > -1) {
        const item = state.inventory[itemIndex];
        state.history.unshift({
            text: `${actionText} - ${item.name} (Lot ${item.lot}) จำนวน ${item.qty} ชิ้น`,
            date: new Date().toLocaleString('th-TH')
        });
        state.inventory.splice(itemIndex, 1); 
        renderDashboard();
        renderInventory();
        alert('ดำเนินการสำเร็จ ระบบได้บันทึกประวัติและนำออกจากคลังเรียบร้อย');
    }
}

// --- CAMERA & SCANNER LOGIC ---
let videoStream = null;
const videoEl = document.getElementById('camera-feed');
const captureBtn = document.getElementById('capture-btn');
const scanResults = document.getElementById('scan-results');
const cameraContainer = document.getElementById('camera-container');
const canvas = document.getElementById('snapshot-canvas');
const preview = document.getElementById('captured-image-preview');
const rescanBtn = document.getElementById('rescan-btn');
const saveForm = document.getElementById('save-item-form');

async function startCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        videoEl.srcObject = videoStream;
    } catch (err) {
        console.error("Error accessing camera:", err);
        videoEl.outerHTML = '<div style="color:white; display:flex; height:100%; align-items:center; justify-content:center; text-align:center; padding:20px;">ไม่สามารถเข้าถึงกล้องได้<br>(กำลังใช้ระบบจำลอง)</div>';
    }
}

function stopCamera() {
    if(videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
}

function resetScannerUI() {
    cameraContainer.classList.remove('hidden');
    scanResults.classList.add('hidden');
    captureBtn.disabled = false;
    captureBtn.innerHTML = '<i class="fa-solid fa-camera"></i> ถ่ายรูป / สแกน';
    saveForm.reset();
    document.getElementById('scan-qty').value = "10";
}

function initScannerLogic() {
    captureBtn.addEventListener('click', () => {
        captureBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังให้ AI วิเคราะห์...';
        captureBtn.disabled = true;

        if(videoEl && videoStream) {
            canvas.width = videoEl.videoWidth || 400;
            canvas.height = videoEl.videoHeight || 300;
            canvas.getContext('2d').drawImage(videoEl, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg');
            preview.style.backgroundImage = `url(${dataUrl})`;
        } else {
            preview.style.backgroundColor = '#ccc';
        }

        setTimeout(() => {
            cameraContainer.classList.add('hidden');
            scanResults.classList.remove('hidden');
            
            const mockItems = ['ขนมปังฟาร์มเฮ้าส์', 'ซอสปรุงรส', 'น้ำแร่ธรรมชาติ', 'นมสดพาสเจอร์ไรส์ 1 ลิตร', 'โยเกิร์ตรสธรรมชาติ'];
            const randomItem = mockItems[Math.floor(Math.random() * mockItems.length)];
            const randomLot = 'L-' + Math.floor(Math.random() * 100000);
            
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + Math.floor(Math.random() * 35) - 5);
            
            document.getElementById('scan-name').value = randomItem;
            document.getElementById('scan-lot').value = randomLot;
            document.getElementById('scan-expiry').value = expiryDate.toISOString().split('T')[0];
            document.getElementById('scan-qty').value = Math.floor(Math.random() * 50) + 10;
        }, 1500);
    });

    rescanBtn.addEventListener('click', resetScannerUI);

    saveForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('scan-name').value;
        const lot = document.getElementById('scan-lot').value;
        const expiry = document.getElementById('scan-expiry').value;
        const qty = parseInt(document.getElementById('scan-qty').value, 10);
        
        const diffTime = new Date(expiry) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status = 'green';
        if(diffDays <= 0) status = 'red';
        else if (diffDays <= 7) status = 'yellow';

        state.inventory.push({
            id: Date.now(),
            name,
            lot,
            expiry,
            qty,
            status
        });
        
        state.history.unshift({
            text: `เติมของ / รับเข้า: ${name} (Lot ${lot}) จำนวน ${qty} ชิ้น`,
            date: new Date().toLocaleString('th-TH')
        });

        alert(`เติมสต็อก ${name} จำนวน ${qty} ชิ้น เรียบร้อยแล้ว!`);
        saveForm.reset();
        switchView('inventory');
    });
}
