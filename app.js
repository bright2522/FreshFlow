// App State
const state = {
    inventory: [
        { id: 1, name: 'ขนมปังฟาร์มเฮ้าส์', lot: 'B-772', expiry: '2026-06-26', qty: 45, status: 'red', slot: 'A1-01' },
        { id: 2, name: 'นมสดพาสเจอร์ไรส์ 1 ลิตร', lot: 'L-88392', expiry: '2026-07-05', qty: 50, status: 'green', slot: 'B2-04' },
        { id: 3, name: 'นมสดพาสเจอร์ไรส์ 1 ลิตร', lot: 'L-88395', expiry: '2026-06-25', qty: 20, status: 'red', slot: 'B2-04' },
        { id: 4, name: 'น้ำส้มคั้น 100%', lot: 'J-992', expiry: '2026-06-30', qty: 30, status: 'yellow', slot: 'C3-11' },
        { id: 5, name: 'แยมสตรอว์เบอร์รี', lot: 'J-110', expiry: '2027-01-10', qty: 150, status: 'green', slot: 'D1-02' }
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
const searchInput = document.getElementById('inventory-search');

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

    searchInput.addEventListener('input', () => {
        renderInventory(searchInput.value);
    });

    // Populate Datalist when scan name changes
    document.getElementById('scan-name').addEventListener('input', (e) => {
        updateLotOptions(e.target.value);
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

    // 1. Render Action Engine Recommendations
    const actionList = document.getElementById('dashboard-actions-list');
    actionList.innerHTML = '';
    
    const riskItems = state.inventory.filter(i => i.status !== 'green');
    
    const breadAtRisk = riskItems.find(i => i.name.includes('ขนมปัง') && i.status === 'red');
    if(breadAtRisk) {
        actionList.innerHTML += `
            <li class="action-item" style="background-color: #f5f3ff; border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; border: 1px solid #ddd6fe;">
                <div class="action-details">
                    <span class="dot dot-purple"></span>
                    <div>
                        <h4><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--purple-color)"></i> AI จับคู่สินค้า (Cross-Selling)</h4>
                        <p><strong>${breadAtRisk.name} (Lot ${breadAtRisk.lot})</strong> มีจำนวน ${breadAtRisk.qty} ชิ้น</p>
                        <span class="recommendation-text" style="color:var(--purple-color); background:#ede9fe;">
                            เสนอโปรโมชั่น: "ซื้อแยม 1 ขวด รับสิทธิ์ซื้อขนมปังลด 30%"
                        </span>
                        <div class="ai-reasoning">
                            <i class="fa-solid fa-lightbulb"></i> 
                            <span><strong>เหตุผล AI:</strong> ขนมปังล็อตนี้จะหมดอายุในอีกไม่ถึง 1 วัน เสี่ยงสูญเสีย 100% จึงเสนอจับคู่กับ "แยม" ซึ่งเป็นสินค้าขายดี เพื่อเร่งระบายออกอย่างรวดเร็ว</span>
                        </div>
                    </div>
                </div>
                <button class="btn btn-action" onclick="applyBundle('${breadAtRisk.name}', ${breadAtRisk.id})">สร้างโปรโมชั่น</button>
            </li>
        `;
    }

    riskItems.forEach(item => {
        if(item.name.includes('ขนมปัง')) return; 

        const actionText = item.status === 'red' ? 'ส่งบริจาค หรือ นำไปทำลาย' : 'จัดโปรโมชั่นลดราคาด่วน 20%';
        const btnText = item.status === 'red' ? 'ดำเนินการ' : 'ลดราคา 20%';
        const reasonText = item.status === 'red' ? `สินค้าอยู่ในช่วงวิกฤต (หมดอายุ ${item.expiry}) หากปล่อยไว้จะเน่าเสียและเปลืองพื้นที่จัดเก็บ (Slot ${item.slot})` : `อายุการเก็บรักษาน้อยกว่า 7 วัน การลดราคา 20% จะช่วยเพิ่มโอกาสขายออกก่อนถึงจุดวิกฤต 80%`;
        
        actionList.innerHTML += `
            <li class="action-item">
                <div class="action-details">
                    <span class="dot dot-${item.status}"></span>
                    <div>
                        <h4>${item.name} (ล็อต ${item.lot})</h4>
                        <p>จำนวน ${item.qty} ชิ้น | หมดอายุ: ${item.expiry}</p>
                        <span class="recommendation-text ${item.status === 'red' ? 'recommendation-warning' : ''}">แนะนำ: ${actionText}</span>
                        <div class="ai-reasoning">
                            <i class="fa-solid fa-robot"></i> 
                            <span><strong>เหตุผล AI:</strong> ${reasonText}</span>
                        </div>
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
                        <div class="ai-reasoning" style="margin-top:0;">
                            <i class="fa-solid fa-brain"></i> 
                            <span><strong>เหตุผล AI:</strong> ${pred.reason}</span>
                        </div>
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
    state.restockPredictions.splice(index, 1);
    renderDashboard();
    alert('ระบบได้ปรับยอดแผนการสั่งซื้อ (PO) ในรอบถัดไปอัตโนมัติ');
}

// Flat Table Design for Inventory
function renderInventory(searchQuery = '') {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';
    
    const lowerQuery = searchQuery.toLowerCase();
    
    // Sort inventory by Slot, then Name
    const sortedInventory = [...state.inventory].sort((a, b) => {
        if(a.slot !== b.slot) return a.slot.localeCompare(b.slot);
        return a.name.localeCompare(b.name);
    });

    const filtered = sortedInventory.filter(item => {
        return item.name.toLowerCase().includes(lowerQuery) || 
               item.lot.toLowerCase().includes(lowerQuery) ||
               (item.slot && item.slot.toLowerCase().includes(lowerQuery));
    });

    filtered.forEach(item => {
        let statusText = item.status === 'green' ? 'ปลอดภัย' : item.status === 'yellow' ? 'เสี่ยง' : 'วิกฤต';
        
        list.innerHTML += `
            <tr>
                <td><span class="slot-badge">${item.slot || 'ไม่ได้ระบุ'}</span></td>
                <td style="font-weight:600; color:var(--text-main);">${item.name}</td>
                <td><span style="color:var(--text-muted);">${item.lot}</span></td>
                <td style="font-weight:700; color:var(--primary-color);">${item.qty.toLocaleString()}</td>
                <td style="color:var(--text-muted); font-size:13px;">${item.expiry}</td>
                <td><span class="badge" style="background: var(--${item.status === 'green' ? 'success' : item.status === 'yellow' ? 'warning' : 'danger'}-color); padding: 4px 12px;">${statusText}</span></td>
                <td>
                    <button class="btn btn-outline" style="padding: 4px 10px; font-size:12px;" onclick="takeAction(${item.id}, 'นำสินค้าออก')"><i class="fa-solid fa-box-open"></i> นำออก</button>
                </td>
            </tr>
        `;
    });

    if(filtered.length === 0) {
        list.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px; color:var(--text-muted);">ไม่พบสินค้า "${searchQuery}" ในคลัง</td></tr>`;
    }
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
            text: `${actionText} - ${item.name} (Lot ${item.lot}) จำนวน ${item.qty} ชิ้น จากช่อง ${item.slot}`,
            date: new Date().toLocaleString('th-TH')
        });
        state.inventory.splice(itemIndex, 1); 
        renderDashboard();
        renderInventory(searchInput.value);
        alert('ดำเนินการสำเร็จ ระบบได้บันทึกประวัติและอัปเดตคลังเรียบร้อย');
    }
}

// --- CAMERA & AR SCANNER LOGIC ---
let videoStream = null;
let arAnimationId = null;
const videoEl = document.getElementById('camera-feed');
const captureBtn = document.getElementById('capture-btn');
const scanResults = document.getElementById('scan-results');
const cameraContainer = document.getElementById('camera-container');
const canvas = document.getElementById('snapshot-canvas');
const preview = document.getElementById('captured-image-preview');
const rescanBtn = document.getElementById('rescan-btn');
const saveForm = document.getElementById('save-item-form');
const arOverlay = document.getElementById('ar-overlay');

let currentARData = {};

async function startCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        videoEl.srcObject = videoStream;
        
        startARSimulation();
    } catch (err) {
        console.error("Error accessing camera:", err);
        videoEl.outerHTML = '<div style="color:white; display:flex; height:100%; align-items:center; justify-content:center; text-align:center; padding:20px;">ไม่สามารถเข้าถึงกล้องได้<br>(กำลังใช้ระบบจำลอง)</div>';
        startARSimulation(); 
    }
}

function stopCamera() {
    stopARSimulation();
    if(videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
}

function startARSimulation() {
    if(arAnimationId) clearInterval(arAnimationId);
    
    const mockItems = ['ขนมปังฟาร์มเฮ้าส์', 'ซอสปรุงรส', 'น้ำแร่ธรรมชาติ', 'นมสดพาสเจอร์ไรส์ 1 ลิตร'];
    currentARData.name = mockItems[Math.floor(Math.random() * mockItems.length)];
    currentARData.lot = 'L-' + Math.floor(Math.random() * 100000);
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Math.floor(Math.random() * 35) - 5);
    currentARData.expiry = expiryDate.toISOString().split('T')[0];
    currentARData.qty = Math.floor(Math.random() * 50) + 10;

    arOverlay.innerHTML = '';
    
    arAnimationId = setInterval(() => {
        arOverlay.innerHTML = ''; 
        
        if(Math.random() > 0.1) {
            const el = document.createElement('div');
            el.className = 'ar-box product';
            el.style.top = (30 + Math.random() * 10) + '%';
            el.style.left = (20 + Math.random() * 40) + '%';
            el.innerHTML = `<i class="fa-solid fa-box"></i> ${currentARData.name}`;
            arOverlay.appendChild(el);
        }

        if(Math.random() > 0.2) {
            const el = document.createElement('div');
            el.className = 'ar-box lot';
            el.style.top = (50 + Math.random() * 15) + '%';
            el.style.left = (15 + Math.random() * 30) + '%';
            el.innerHTML = `<i class="fa-solid fa-barcode"></i> LOT: ${currentARData.lot}`;
            arOverlay.appendChild(el);
        }

        if(Math.random() > 0.1) {
            const el = document.createElement('div');
            el.className = 'ar-box expiry';
            el.style.top = (70 + Math.random() * 10) + '%';
            el.style.left = (40 + Math.random() * 30) + '%';
            el.innerHTML = `<i class="fa-solid fa-calendar-xmark"></i> EXP: ${currentARData.expiry}`;
            arOverlay.appendChild(el);
        }
    }, 800);
}

function stopARSimulation() {
    if(arAnimationId) clearInterval(arAnimationId);
    if(arOverlay) arOverlay.innerHTML = '';
}

function updateLotOptions(productName) {
    const container = document.getElementById('lot-chips-container');
    container.innerHTML = '';
    
    // Find distinct lots for this product name (with extra info)
    const matchingItems = state.inventory.filter(
        item => item.name.toLowerCase() === productName.toLowerCase()
    );
    
    // Deduplicate by lot
    const seenLots = new Set();
    const uniqueLotItems = matchingItems.filter(item => {
        if (seenLots.has(item.lot)) return false;
        seenLots.add(item.lot);
        return true;
    });
    
    if (uniqueLotItems.length === 0) return;
    
    // Add label
    const label = document.createElement('span');
    label.className = 'lot-chips-label';
    label.textContent = 'ล็อตเดิมที่มีอยู่ (กดเพื่อเลือก):';
    container.appendChild(label);
    
    uniqueLotItems.forEach(item => {
        const chip = document.createElement('span');
        chip.className = 'lot-chip';
        chip.innerHTML = `<i class="fa-solid fa-tag"></i> ${item.lot} (${item.qty} ชิ้น | Slot ${item.slot})`;
        chip.addEventListener('click', () => {
            // Fill lot, expiry, and slot from existing item
            document.getElementById('scan-lot').value = item.lot;
            document.getElementById('scan-expiry').value = item.expiry;
            document.getElementById('scan-slot').value = item.slot;
            
            // Highlight selected chip
            container.querySelectorAll('.lot-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
        });
        container.appendChild(chip);
    });
}

function resetScannerUI() {
    cameraContainer.classList.remove('hidden');
    scanResults.classList.add('hidden');
    captureBtn.disabled = false;
    captureBtn.innerHTML = '<i class="fa-solid fa-camera"></i> จับภาพข้อมูล';
    saveForm.reset();
    document.getElementById('scan-qty').value = "10";
    
    startARSimulation(); 
}

function initScannerLogic() {
    captureBtn.addEventListener('click', async () => {
        stopARSimulation();
        
        captureBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังเริ่มระบบ AI วิเคราะห์ภาพ...';
        captureBtn.disabled = true;

        if(videoEl && videoStream) {
            canvas.width = videoEl.videoWidth || 400;
            canvas.height = videoEl.videoHeight || 300;
            canvas.getContext('2d').drawImage(videoEl, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg');
            preview.style.backgroundImage = `url(${dataUrl})`;
            
            try {
                // Real OCR using Tesseract.js
                const result = await Tesseract.recognize(
                    canvas,
                    'tha+eng',
                    { 
                        logger: m => {
                            if(m.status === 'recognizing text') {
                                captureBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI กำลังอ่านข้อความ ' + Math.round(m.progress * 100) + '%';
                            } else {
                                captureBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดโมเดลภาษา...';
                            }
                        }
                    }
                );
                
                const text = result.data.text;
                let detectedName = "";
                let detectedLot = currentARData.lot; 
                
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
                
                if (lines.length > 0) {
                    const nameLines = lines.filter(l => !/lot|exp|mfd|bbd|[0-9]{3,}/i.test(l));
                    if (nameLines.length > 0) {
                        detectedName = nameLines[0]; 
                    } else {
                        detectedName = lines[0]; 
                    }
                }
                
                if (!detectedName || detectedName.length < 2) {
                    detectedName = "ไม่สามารถอ่านชื่อได้ (พิมพ์เอง)"; 
                }

                const lotMatch = text.match(/LOT\s*[:\-]?\s*([A-Z0-9]+)/i);
                if (lotMatch) detectedLot = lotMatch[1];
                
                cameraContainer.classList.add('hidden');
                scanResults.classList.remove('hidden');
                
                document.getElementById('scan-name').value = detectedName;
                document.getElementById('scan-lot').value = detectedLot;
                document.getElementById('scan-expiry').value = currentARData.expiry; 
                document.getElementById('scan-qty').value = currentARData.qty;
                
                // Populate lot datalist based on detected name
                updateLotOptions(detectedName);
                
                preview.innerHTML = `
                    <div class="preview-ar-overlay">
                        <div class="ar-box product" style="top: 30%; left: 10%; max-width:80%; word-break:break-all;"><i class="fa-solid fa-box"></i> ${detectedName}</div>
                        <div class="ar-box lot" style="top: 50%; left: 20%;"><i class="fa-solid fa-barcode"></i> LOT: ${detectedLot}</div>
                        <div class="ar-box expiry" style="top: 70%; left: 45%;"><i class="fa-solid fa-calendar-xmark"></i> EXP: ${currentARData.expiry}</div>
                    </div>
                `;
                
            } catch (err) {
                console.error(err);
                alert("เกิดข้อผิดพลาดในการอ่านข้อความด้วย AI จะกลับไปใช้ข้อมูลจำลอง");
                cameraContainer.classList.add('hidden');
                scanResults.classList.remove('hidden');
                document.getElementById('scan-name').value = currentARData.name;
                document.getElementById('scan-lot').value = currentARData.lot;
                document.getElementById('scan-expiry').value = currentARData.expiry;
                document.getElementById('scan-qty').value = currentARData.qty;
                updateLotOptions(currentARData.name);
            }
        } else {
            preview.style.backgroundColor = '#ccc';
        }
    });

    rescanBtn.addEventListener('click', () => {
        preview.innerHTML = ''; 
        resetScannerUI();
    });

    saveForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('scan-name').value;
        const lot = document.getElementById('scan-lot').value;
        const expiry = document.getElementById('scan-expiry').value;
        const qty = parseInt(document.getElementById('scan-qty').value, 10);
        const slot = document.getElementById('scan-slot').value;
        
        const diffTime = new Date(expiry) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status = 'green';
        if(diffDays <= 0) status = 'red';
        else if (diffDays <= 7) status = 'yellow';

        // Check if same lot and slot already exists
        const existingItemIndex = state.inventory.findIndex(i => i.name === name && i.lot === lot && i.slot === slot && i.expiry === expiry);
        
        if (existingItemIndex > -1) {
            // Update existing
            state.inventory[existingItemIndex].qty += qty;
            state.inventory[existingItemIndex].status = status;
        } else {
            // Add new
            state.inventory.push({
                id: Date.now(),
                name,
                lot,
                expiry,
                qty,
                status,
                slot
            });
        }
        
        state.history.unshift({
            text: `เติมสต็อก: ${name} (Lot ${lot}) จำนวน ${qty} ชิ้น เก็บไว้ที่ช่อง ${slot}`,
            date: new Date().toLocaleString('th-TH')
        });

        alert(`นำ ${name} เข้าสู่ช่องเก็บ ${slot} เรียบร้อยแล้ว!`);
        saveForm.reset();
        preview.innerHTML = '';
        switchView('inventory');
    });
}
