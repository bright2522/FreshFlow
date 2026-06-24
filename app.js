// App State
const state = {
    inventory: [
        { id: 1, name: 'ขนมปังฟาร์มเฮ้าส์', lot: 'A1-01', expiry: '2026-06-26', qty: 45, status: 'red', slot: 'A1-01' },
        { id: 2, name: 'นมสดพาสเจอร์ไรส์ 1 ลิตร', lot: 'B2-04', expiry: '2026-07-05', qty: 50, status: 'green', slot: 'B2-04' },
        { id: 3, name: 'นมสดพาสเจอร์ไรส์ 1 ลิตร', lot: 'B2-04', expiry: '2026-06-25', qty: 20, status: 'red', slot: 'B2-04' },
        { id: 4, name: 'น้ำส้มคั้น 100%', lot: 'C3-11', expiry: '2026-06-30', qty: 30, status: 'yellow', slot: 'C3-11' },
        { id: 5, name: 'แยมสตรอว์เบอร์รี', lot: 'D1-02', expiry: '2027-01-10', qty: 150, status: 'green', slot: 'D1-02' }
    ],
    knownLots: [],
    profile: null,        // ข้อมูลร้าน (จากตอน Login)
    actions: [],          // บันทึกการดำเนินการแบบละเอียด
    chat: [],             // ประวัติแชทกับผู้ช่วย AI
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

// --- DISPOSITION KNOWLEDGE BASE (ใช้เป็นสมองของผู้ช่วย AI) ---
const DISPOSITION_INFO = {
    discount: {
        label: 'ลดราคา / ป้ายเหลือง',
        icon: 'fa-tags',
        color: 'var(--warning-color)',
        channel: 'หน้าร้าน + ระบบ POS (โซนสินค้าใกล้หมดอายุ)',
        steps: [
            'ตั้งราคาลด 20–50% ตามจำนวนวันที่เหลือก่อนหมดอายุ',
            'ติดป้าย "ใกล้หมดอายุ ลดพิเศษ" และอัปเดตราคาในระบบ POS',
            'ย้ายสินค้ามาวางโซนหน้าร้าน/จุดที่ลูกค้าเห็นง่าย',
            'ติดตามยอดทุกวัน ถ้าใกล้หมดอายุแล้วยังไม่ออก ให้เปลี่ยนไปบริจาคแทน'
        ]
    },
    bundle: {
        label: 'จับคู่โปรโมชั่น (Cross-sell)',
        icon: 'fa-wand-magic-sparkles',
        color: 'var(--purple-color)',
        channel: 'หน้าร้าน + ระบบ POS (โปรโมชั่นจับคู่)',
        steps: [
            'เลือกสินค้าขายดีมาจับคู่กับสินค้าที่ใกล้หมดอายุ',
            'ตั้งเงื่อนไข เช่น "ซื้อ A รับสิทธิ์ซื้อ B ลด 30%"',
            'ตั้งค่าโปรโมชั่นในระบบ POS และแจ้งพนักงานหน้าร้าน',
            'ติดตามอัตราการระบายของสินค้าที่จับคู่'
        ]
    },
    donate: {
        label: 'บริจาค',
        icon: 'fa-hand-holding-heart',
        color: 'var(--success-color)',
        channel: 'ธนาคารอาหาร เช่น SOS Thailand (Scholars of Sustenance), มูลนิธิ/วัด/ชุมชนใกล้เคียง',
        steps: [
            'คัดเฉพาะสินค้าที่ยัง "ปลอดภัยต่อการบริโภค" (ยังไม่หมดอายุ/ไม่เสียหาย)',
            'แพ็คแยกตามประเภทและจดบันทึกจำนวน + เลขล็อต',
            'ติดต่อองค์กรรับบริจาคเพื่อนัดวันรับของ',
            'ขอใบรับบริจาคไว้เป็นหลักฐาน (ใช้ลดหย่อนภาษีได้)'
        ]
    },
    return: {
        label: 'ส่งคืนผู้ผลิต / ตัวแทน',
        icon: 'fa-truck-ramp-box',
        color: 'var(--primary-color)',
        channel: 'ซัพพลายเออร์ที่รับสินค้าเข้ามา',
        steps: [
            'ตรวจสอบเงื่อนไขการรับคืน (บางเจ้ารับคืนสินค้าใกล้หมดอายุ)',
            'รวบรวมเอกสาร: เลขล็อต วันหมดอายุ จำนวน และใบรับสินค้า',
            'แจ้งตัวแทน/ฝ่ายขายเพื่อเปิดเรื่องขอคืนหรือเปลี่ยนสินค้า',
            'ขอใบลดหนี้ (credit note) หรือสินค้าทดแทน'
        ]
    },
    transfer: {
        label: 'โอนไปสาขา/จุดอื่น',
        icon: 'fa-arrows-turn-right',
        color: 'var(--primary-color)',
        channel: 'สาขาอื่นที่มีดีมานด์สูงกว่า',
        steps: [
            'เช็กว่าสาขา/จุดขายอื่นยังต้องการสินค้านี้และขายทันก่อนหมดอายุ',
            'จัดทำเอกสารโอนย้ายระบุล็อตและจำนวน',
            'จัดส่งโดยรักษาอุณหภูมิ/สภาพสินค้าให้เหมาะสม',
            'อัปเดตสต็อกทั้งสองฝั่งให้ตรงกัน'
        ]
    },
    dispose: {
        label: 'ทำลาย / ทิ้ง',
        icon: 'fa-trash-can',
        color: 'var(--danger-color)',
        channel: 'จุดทิ้งขยะตามประเภท (ขยะอินทรีย์ / ขยะอันตราย ตามชนิดสินค้า)',
        steps: [
            'ใช้กับสินค้าที่หมดอายุแล้วหรือไม่ปลอดภัยต่อการบริโภค/บริจาคเท่านั้น',
            'ถ่ายรูปสินค้าก่อนทิ้งเพื่อเป็นหลักฐานการตัดสต็อก',
            'แยกทิ้งตามประเภทขยะ (อาหาร = ขยะอินทรีย์, ยา/เคมี = ขยะอันตราย)',
            'บันทึกตัดจำหน่ายออกจากสต็อกในระบบ'
        ]
    }
};

// แนะนำวิธีดำเนินการที่เหมาะสมที่สุด โดยดูจากสถานะสินค้า + ข้อมูลร้าน
function recommendDisposition(item) {
    const p = state.profile || {};
    if (item.status === 'red') {
        const diffDays = Math.ceil((new Date(item.expiry) - new Date()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
            return { key: 'donate', reason: 'ใกล้หมดอายุมาก (ขายไม่ทันแล้ว) แต่ยังปลอดภัย จึงควรบริจาคเพื่อไม่ให้เสียเปล่า' };
        }
        return { key: 'dispose', reason: 'สินค้าหมดอายุแล้ว ไม่ปลอดภัยต่อการบริโภค ต้องตัดออกจากสต็อก' };
    }
    if (item.status === 'yellow') {
        if (p.traffic === 'high' || (p.dailySales && p.dailySales >= 50)) {
            return { key: 'discount', reason: 'ทำเลคนพลุกพล่าน/ยอดขายสูง มีโอกาสระบายทันด้วยการลดราคา' };
        }
        if (p.supplier && (p.supplier.includes('ตัวแทน') || p.supplier.includes('ผู้ผลิต'))) {
            return { key: 'return', reason: 'ยอดขายไม่สูงพอจะระบายทัน ลองส่งคืนซัพพลายเออร์ก่อนเพื่อลดความเสียหาย' };
        }
        return { key: 'discount', reason: 'ยังพอมีเวลา แนะนำลดราคาเพื่อเร่งระบายก่อนเข้าจุดวิกฤต' };
    }
    return { key: 'discount', reason: 'สินค้ายังปลอดภัย ยังไม่ต้องเร่งดำเนินการ' };
}

// --- PROFILE (ข้อมูลร้าน) ---
const TRAFFIC_LABEL = { high: 'พลุกพล่านมาก', medium: 'ปานกลาง', low: 'เงียบ/คนน้อย' };

function loadProfile() {
    try {
        return JSON.parse(localStorage.getItem('freshflow_profile') || 'null');
    } catch (e) {
        return null;
    }
}
function saveProfile(profile) {
    state.profile = profile;
    localStorage.setItem('freshflow_profile', JSON.stringify(profile));
}

// --- ACTIONS (บันทึกการดำเนินการ) ---
function loadActions() {
    try { state.actions = JSON.parse(localStorage.getItem('freshflow_actions') || '[]'); }
    catch (e) { state.actions = []; }
}
function persistActions() {
    localStorage.setItem('freshflow_actions', JSON.stringify(state.actions));
}

// --- CHAT (ผู้ช่วย AI) ---
function loadChat() {
    try { state.chat = JSON.parse(localStorage.getItem('freshflow_chat') || '[]'); }
    catch (e) { state.chat = []; }
}
function persistChat() {
    localStorage.setItem('freshflow_chat', JSON.stringify(state.chat));
}

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
    state.knownLots = loadKnownLots();
    state.profile = loadProfile();
    loadActions();
    loadChat();

    if(localStorage.getItem('freshflow_logged_in') === 'true') {
        enterApp();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        localStorage.setItem('freshflow_logged_in', 'true');
        const username = document.getElementById('username').value;
        document.getElementById('display-name').textContent = username;
        enterApp();
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('freshflow_logged_in');
        document.getElementById('app-wrapper').classList.add('hidden');
        document.getElementById('onboarding-view').classList.remove('active');
        document.getElementById('login-view').classList.add('active');
        closeChat();
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

    initScannerLogic();
    initEditModal();
    initOnboarding();
    initActionModal();
    initChat();
    renderDashboard();
    renderInventory();
    renderHistory();
}

// เข้าแอป: ถ้ายังไม่เคยกรอกข้อมูลร้าน ให้ไปหน้า onboarding ก่อน
function enterApp() {
    document.getElementById('login-view').classList.remove('active');
    if (!state.profile) {
        showOnboarding();
    } else {
        showMainApp();
    }
}

function showMainApp() {
    document.getElementById('login-view').classList.remove('active');
    document.getElementById('onboarding-view').classList.remove('active');
    document.getElementById('app-wrapper').classList.remove('hidden');
    switchView('dashboard');
}

// --- ONBOARDING (กรอกข้อมูลร้านตอนเข้าใช้ครั้งแรก) ---
function showOnboarding() {
    // เติมค่าเดิมถ้ามี (กรณีเปิดมาแก้ไข)
    const p = state.profile;
    if (p) {
        const t = document.querySelector(`input[name="ob-traffic"][value="${p.traffic}"]`);
        if (t) t.checked = true;
        document.getElementById('ob-sales').value = p.dailySales || '';
        document.getElementById('ob-supplier').value = p.supplier || '';
    }
    document.getElementById('app-wrapper').classList.add('hidden');
    document.getElementById('onboarding-view').classList.add('active');
}

function initOnboarding() {
    const form = document.getElementById('onboarding-form');
    if (!form) return;

    // ปุ่มเลือกทำเล (radio cards)
    form.querySelectorAll('.choice-card').forEach(card => {
        card.addEventListener('click', () => {
            const input = card.querySelector('input');
            if (input) input.checked = true;
            form.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const trafficEl = form.querySelector('input[name="ob-traffic"]:checked');
        const traffic = trafficEl ? trafficEl.value : 'medium';
        const dailySales = parseInt(document.getElementById('ob-sales').value, 10) || 0;
        const supplier = document.getElementById('ob-supplier').value;

        saveProfile({ traffic, dailySales, supplier });
        showMainApp();
        renderDashboard();
    });
}

// เปิดหน้าแก้ไขข้อมูลร้านอีกครั้ง (จากปุ่มตั้งค่าบน header)
window.openShopSettings = function() {
    showOnboarding();
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
                <button class="btn btn-outline" onclick="openActionModal(${item.id})">${btnText}</button>
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
        const lotValue = item.slot || item.lot || 'ไม่ได้ระบุ';
        
        list.innerHTML += `
            <tr>
                <td><span class="slot-badge">${lotValue}</span></td>
                <td style="font-weight:600; color:var(--text-main);">${item.name}</td>
                <td style="font-weight:700; color:var(--primary-color);">${item.qty.toLocaleString()}</td>
                <td style="color:var(--text-muted); font-size:13px;">${item.expiry}</td>
                <td><span class="badge" style="background: var(--${item.status === 'green' ? 'success' : item.status === 'yellow' ? 'warning' : 'danger'}-color); padding: 4px 12px;">${statusText}</span></td>
                <td style="white-space:nowrap;">
                    <button class="btn btn-primary" style="padding: 5px 12px; font-size:12px; margin-right:6px;" onclick="openActionModal(${item.id})"><i class="fa-solid fa-bolt"></i> ดำเนินการ</button>
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size:12px;" onclick="openEditModal(${item.id})"><i class="fa-solid fa-pen"></i> แก้ไข</button>
                </td>
            </tr>
        `;
    });

    if(filtered.length === 0) {
        list.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color:var(--text-muted);">ไม่พบสินค้า "${searchQuery}" ในคลัง</td></tr>`;
    }
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    const hasActions = state.actions.length > 0;
    const hasHistory = state.history.length > 0;

    if (!hasActions && !hasHistory) {
        list.innerHTML = '<li style="text-align:center; padding:30px; color:var(--text-muted);">ยังไม่มีรายการดำเนินการ</li>';
        return;
    }

    // 1) บันทึกการดำเนินการแบบละเอียด (มีสถานะ + ถาม AI ได้)
    state.actions.forEach(act => {
        const info = DISPOSITION_INFO[act.disposition] || {};
        const done = act.status === 'done';
        const statusPill = done
            ? '<span class="op-pill op-done"><i class="fa-solid fa-circle-check"></i> เสร็จสิ้น</span>'
            : '<span class="op-pill op-pending"><i class="fa-solid fa-hourglass-half"></i> รอดำเนินการ</span>';

        list.innerHTML += `
            <li class="op-card">
                <div class="op-card-top">
                    <div class="op-icon" style="background:${hexTint(info.color)}; color:${info.color || 'var(--primary-color)'};">
                        <i class="fa-solid ${info.icon || 'fa-bolt'}"></i>
                    </div>
                    <div style="flex:1;">
                        <h4>${info.label || 'ดำเนินการ'} · ${act.productName}</h4>
                        <p class="op-meta">ล็อต ${act.lot} · ${act.qty} ชิ้น · ${act.createdAt}</p>
                    </div>
                    ${statusPill}
                </div>
                <div class="op-channel"><i class="fa-solid fa-location-arrow"></i> ส่งไปที่: <strong>${info.channel || '-'}</strong></div>
                <div class="op-card-actions">
                    <button class="btn btn-action" onclick="askAboutAction('${act.id}')"><i class="fa-solid fa-comments"></i> ถาม AI</button>
                    ${done ? '' : `<button class="btn btn-outline" style="padding:6px 14px; font-size:13px;" onclick="markActionDone('${act.id}')"><i class="fa-solid fa-check"></i> ทำเสร็จแล้ว</button>`}
                </div>
            </li>
        `;
    });

    // 2) ประวัติย่อแบบเดิม
    state.history.forEach(h => {
        list.innerHTML += `
            <li class="history-item">
                <div class="action-details">
                    <span class="dot dot-success"></span>
                    <div>
                        <h4 style="font-weight:500;">${h.text}</h4>
                        <p>${h.date}</p>
                    </div>
                </div>
            </li>
        `;
    });
}

// แปลงสี var(--x) เป็นพื้นหลังจางๆ (ใช้ค่าคงที่ map)
function hexTint(color) {
    const map = {
        'var(--warning-color)': '#fef3c7',
        'var(--purple-color)': '#ede9fe',
        'var(--success-color)': '#d1fae5',
        'var(--primary-color)': '#dbeafe',
        'var(--danger-color)': '#fee2e2'
    };
    return map[color] || '#dbeafe';
}

window.markActionDone = function(actionId) {
    const act = state.actions.find(a => a.id === actionId);
    if (act) {
        act.status = 'done';
        persistActions();
        renderHistory();
    }
}

// --- EDIT INVENTORY ITEM ---
let editingItemId = null;

function computeStatus(expiry) {
    const diffDays = Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'red';
    if (diffDays <= 7) return 'yellow';
    return 'green';
}

window.openEditModal = function(id) {
    const item = state.inventory.find(i => i.id === id);
    if (!item) return;
    editingItemId = id;

    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-lot').value = item.slot || item.lot || '';
    document.getElementById('edit-expiry').value = item.expiry;
    document.getElementById('edit-qty').value = item.qty;

    renderLotChips('edit-lot-chips-container', 'edit-lot');

    document.getElementById('edit-modal').classList.remove('hidden');
}

window.closeEditModal = function() {
    editingItemId = null;
    document.getElementById('edit-modal').classList.add('hidden');
}

function initEditModal() {
    const form = document.getElementById('edit-item-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const item = state.inventory.find(i => i.id === editingItemId);
        if (!item) return;

        const name = document.getElementById('edit-name').value.trim();
        const lot = document.getElementById('edit-lot').value.trim();
        const expiry = document.getElementById('edit-expiry').value;
        const qty = parseInt(document.getElementById('edit-qty').value, 10);

        if (!name || !lot || !expiry || isNaN(qty) || qty < 1) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        item.name = name;
        item.lot = lot;
        item.slot = lot; // ล็อต และ ช่องจัดเก็บ เป็นอันเดียวกัน
        item.expiry = expiry;
        item.qty = qty;
        item.status = computeStatus(expiry);

        saveKnownLot(lot);

        state.history.unshift({
            text: `แก้ไขข้อมูล: ${name} (ล็อต ${lot}) คงเหลือ ${qty} ชิ้น หมดอายุ ${expiry}`,
            date: new Date().toLocaleString('th-TH')
        });

        closeEditModal();
        renderDashboard();
        renderInventory(searchInput.value);
    });

    // Close when clicking the dark backdrop
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') closeEditModal();
    });
}

// ===================== ACTION (DISPOSITION) MODAL =====================
let actionItemId = null;

window.openActionModal = function(id) {
    const item = state.inventory.find(i => i.id === id);
    if (!item) return;
    actionItemId = id;

    const rec = recommendDisposition(item);
    const recInfo = DISPOSITION_INFO[rec.key];

    // หัวข้อสินค้า
    const statusText = item.status === 'green' ? 'ปลอดภัย' : item.status === 'yellow' ? 'เสี่ยง' : 'วิกฤต';
    document.getElementById('action-item-summary').innerHTML = `
        <div class="ai-summary-name">${item.name}</div>
        <div class="ai-summary-meta">ล็อต ${item.slot || item.lot} · คงเหลือ ${item.qty} ชิ้น · หมดอายุ ${item.expiry} · สถานะ ${statusText}</div>
    `;

    // คำแนะนำของ AI
    document.getElementById('action-ai-rec').innerHTML = `
        <i class="fa-solid fa-robot"></i>
        <div>
            <strong>AI แนะนำ:</strong> ${recInfo.label}<br>
            <span style="color:var(--text-muted);">${rec.reason}</span>
        </div>
    `;

    // ตัวเลือกวิธีดำเนินการ (เลือกค่าแนะนำไว้ก่อน)
    const optWrap = document.getElementById('action-options');
    optWrap.innerHTML = '';
    Object.keys(DISPOSITION_INFO).forEach(key => {
        const info = DISPOSITION_INFO[key];
        const checked = key === rec.key ? 'checked' : '';
        const selCls = key === rec.key ? 'selected' : '';
        optWrap.innerHTML += `
            <label class="disp-option ${selCls}" data-key="${key}">
                <input type="radio" name="disp" value="${key}" ${checked} />
                <span class="disp-icon" style="color:${info.color};"><i class="fa-solid ${info.icon}"></i></span>
                <span class="disp-label">${info.label}</span>
            </label>
        `;
    });
    optWrap.querySelectorAll('.disp-option').forEach(opt => {
        opt.addEventListener('click', () => {
            optWrap.querySelectorAll('.disp-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            opt.querySelector('input').checked = true;
        });
    });

    document.getElementById('action-qty').value = item.qty;
    document.getElementById('action-qty').max = item.qty;

    document.getElementById('action-modal').classList.remove('hidden');
}

window.closeActionModal = function() {
    actionItemId = null;
    document.getElementById('action-modal').classList.add('hidden');
}

function initActionModal() {
    const form = document.getElementById('action-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const item = state.inventory.find(i => i.id === actionItemId);
        if (!item) return;

        const dispEl = form.querySelector('input[name="disp"]:checked');
        const disposition = dispEl ? dispEl.value : 'discount';
        let qty = parseInt(document.getElementById('action-qty').value, 10) || item.qty;
        qty = Math.min(Math.max(qty, 1), item.qty);

        const info = DISPOSITION_INFO[disposition];

        // บันทึกการดำเนินการลงระบบ
        const record = {
            id: 'act_' + Date.now(),
            itemId: item.id,
            productName: item.name,
            lot: item.slot || item.lot,
            qty,
            disposition,
            channel: info.channel,
            steps: info.steps,
            status: 'pending',
            createdAt: new Date().toLocaleString('th-TH')
        };
        state.actions.unshift(record);
        persistActions();

        // ตัดสต็อก
        if (qty >= item.qty) {
            state.inventory = state.inventory.filter(i => i.id !== item.id);
        } else {
            item.qty -= qty;
            item.status = computeStatus(item.expiry);
        }

        // ประวัติย่อ
        state.history.unshift({
            text: `${info.label}: ${record.productName} (ล็อต ${record.lot}) จำนวน ${qty} ชิ้น`,
            date: new Date().toLocaleString('th-TH')
        });

        closeActionModal();
        renderDashboard();
        renderInventory(searchInput.value);
        renderHistory();

        // ข้อความยืนยัน + ชวนถาม AI ต่อ
        pushAssistant(`บันทึกการดำเนินการเรียบร้อย ✅\n\n**${info.label} – ${record.productName}** (${qty} ชิ้น)\n📍 ส่งไปที่: ${info.channel}\n\nอยากให้ช่วยอธิบายขั้นตอนการดำเนินการไหมครับ? พิมพ์ถามได้เลย เช่น "${record.productName} ทำยังไง"`);
        openChat();
    });

    document.getElementById('action-modal').addEventListener('click', (e) => {
        if (e.target.id === 'action-modal') closeActionModal();
    });
}

// ===================== ผู้ช่วย AI (CHAT) =====================
function initChat() {
    const fab = document.getElementById('chat-fab');
    const closeBtn = document.getElementById('chat-close');
    const form = document.getElementById('chat-form');
    if (!fab) return;

    fab.addEventListener('click', openChat);
    closeBtn.addEventListener('click', closeChat);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;
        pushUser(text);
        input.value = '';
        // ตอบกลับ (หน่วงเล็กน้อยให้เหมือนกำลังคิด)
        setTimeout(() => pushAssistant(getAssistantReply(text)), 350);
    });

    // ทักทายครั้งแรก
    if (state.chat.length === 0) {
        state.chat.push({
            role: 'assistant',
            text: 'สวัสดีครับ ผมเป็นผู้ช่วย FreshFlow 🤖\nถามผมได้เลยเรื่องการจัดการสินค้า เช่น\n• "วันนี้มีอะไรต้องจัดการบ้าง"\n• "ขนมปังต้องส่งไปที่ไหน"\n• "บริจาคทำยังไง"'
        });
        persistChat();
    }
}

window.openChat = function() {
    document.getElementById('chat-panel').classList.remove('hidden');
    document.getElementById('chat-fab').classList.add('hidden');
    renderChat();
}
window.closeChat = function() {
    const panel = document.getElementById('chat-panel');
    if (panel) panel.classList.add('hidden');
    const fab = document.getElementById('chat-fab');
    if (fab) fab.classList.remove('hidden');
}

function pushUser(text) {
    state.chat.push({ role: 'user', text });
    persistChat();
    renderChat();
}
function pushAssistant(text) {
    state.chat.push({ role: 'assistant', text });
    persistChat();
    renderChat();
}

function renderChat() {
    const box = document.getElementById('chat-messages');
    if (!box) return;
    box.innerHTML = '';
    state.chat.forEach(m => {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + (m.role === 'user' ? 'chat-user' : 'chat-bot');
        // แปลง \n เป็น <br> และ **bold**
        const html = m.text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        bubble.innerHTML = html;
        box.appendChild(bubble);
    });
    box.scrollTop = box.scrollHeight;
}

// กดปุ่ม "ถาม AI" จากการ์ดการดำเนินการ
window.askAboutAction = function(actionId) {
    const act = state.actions.find(a => a.id === actionId);
    if (!act) return;
    openChat();
    pushUser(`${act.productName} ดำเนินการยังไง`);
    setTimeout(() => pushAssistant(getAssistantReply(`${act.productName} ดำเนินการยังไง`)), 350);
}

// --- สมองของผู้ช่วย: ตอบจากข้อมูลจริงในระบบ ---
function getAssistantReply(rawText) {
    const text = rawText.toLowerCase();

    const askWhere = /(ที่ไหน|ส่งไป|ส่งที่|บริจาคที่|ติดต่อ|เอาไปไหน|ไปที่ไหน)/.test(text);
    const askHow = /(ยังไง|อย่างไร|ขั้นตอน|ทำไง|วิธี|ดำเนินการ|จัดการยังไง)/.test(text);
    const askSummary = /(อะไรบ้าง|มีอะไร|สรุป|วันนี้|ต้องจัดการ|เร่งด่วน|ภาพรวม)/.test(text);

    // หา "สินค้า" ที่ถูกพูดถึง (จาก action ที่บันทึก หรือจากคลัง)
    const matchedAction = state.actions.find(a => text.includes(a.productName.toLowerCase().slice(0, 4)));
    const matchedItem = state.inventory.find(i => text.includes(i.name.toLowerCase().slice(0, 4)));

    // ตรวจว่าพูดถึงวิธีดำเนินการตรงๆ ไหม (บริจาค/ทิ้ง/ลดราคา/คืน/โอน)
    let dispKey = null;
    if (/บริจาค/.test(text)) dispKey = 'donate';
    else if (/ทิ้ง|ทำลาย/.test(text)) dispKey = 'dispose';
    else if (/ลดราคา|ป้ายเหลือง/.test(text)) dispKey = 'discount';
    else if (/คืน|ผู้ผลิต|ซัพ|ตัวแทน/.test(text)) dispKey = 'return';
    else if (/โอน|สาขา/.test(text)) dispKey = 'transfer';
    else if (/จับคู่|โปรโมชั่น|โปร/.test(text)) dispKey = 'bundle';

    // 1) สรุปงานที่ต้องทำ
    if (askSummary && !matchedAction && !matchedItem && !dispKey) {
        return summaryReply();
    }

    // 2) ถามถึงสินค้าที่ "ดำเนินการไปแล้ว"
    if (matchedAction) {
        const info = DISPOSITION_INFO[matchedAction.disposition];
        if (askWhere) {
            return `**${matchedAction.productName}** (ล็อต ${matchedAction.lot}) คุณเลือกวิธี "${info.label}" ไว้\n\n📍 ส่งไปที่: **${info.channel}**`;
        }
        // default = ขั้นตอน
        return `วิธีดำเนินการ "${info.label}" สำหรับ **${matchedAction.productName}** (${matchedAction.qty} ชิ้น):\n\n${info.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}\n\n📍 ส่งไปที่: ${info.channel}`;
    }

    // 3) ถามถึงสินค้าที่ยังอยู่ในคลัง (ยังไม่ดำเนินการ)
    if (matchedItem) {
        const rec = recommendDisposition(matchedItem);
        const info = DISPOSITION_INFO[rec.key];
        if (askWhere) {
            return `**${matchedItem.name}** ยังไม่ได้บันทึกการดำเนินการ\n\nAI แนะนำให้ "${info.label}" → ส่งไปที่ **${info.channel}**\n(${rec.reason})\n\nถ้าตัดสินใจแล้ว กดปุ่ม "ดำเนินการ" ที่หน้าคลังสินค้าได้เลยครับ`;
        }
        return `**${matchedItem.name}** (คงเหลือ ${matchedItem.qty} ชิ้น, หมดอายุ ${matchedItem.expiry})\n\nAI แนะนำ: **${info.label}**\nเหตุผล: ${rec.reason}\n\nขั้นตอน:\n${info.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}`;
    }

    // 4) ถามถึงวิธีดำเนินการแบบทั่วไป (ไม่ระบุสินค้า)
    if (dispKey) {
        const info = DISPOSITION_INFO[dispKey];
        if (askWhere) {
            return `วิธี "${info.label}" → ส่งไปที่ **${info.channel}**`;
        }
        return `ขั้นตอนการ "${info.label}":\n\n${info.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}\n\n📍 ส่งไปที่: ${info.channel}`;
    }

    // 5) ตอบเริ่มต้น
    if (askSummary) return summaryReply();
    return `ผมช่วยเรื่องการจัดการสินค้าใกล้หมดอายุได้ครับ ลองถามแบบนี้ดู:\n• "วันนี้มีอะไรต้องจัดการบ้าง"\n• "${(state.inventory[0] && state.inventory[0].name) || 'ขนมปัง'} ต้องส่งไปที่ไหน"\n• "บริจาคทำยังไง"`;
}

function summaryReply() {
    const risk = state.inventory.filter(i => i.status !== 'green');
    const pending = state.actions.filter(a => a.status === 'pending');

    let msg = '';
    if (risk.length === 0) {
        msg += 'ตอนนี้ไม่มีสินค้าที่เสี่ยง/วิกฤตในคลังครับ 👍\n';
    } else {
        msg += `มีสินค้าที่ต้องจัดการ ${risk.length} รายการ:\n`;
        risk.slice(0, 6).forEach(i => {
            const rec = recommendDisposition(i);
            msg += `• ${i.name} (${i.qty} ชิ้น, หมดอายุ ${i.expiry}) → แนะนำ ${DISPOSITION_INFO[rec.key].label}\n`;
        });
    }
    if (pending.length > 0) {
        msg += `\nยังมีงานที่บันทึกไว้แต่ยังไม่เสร็จ ${pending.length} รายการ (ดูได้ที่แท็บ "ประวัติ")`;
    }
    return msg.trim();
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

// --- KNOWN LOTS (saved in the system & reusable) ---
function loadKnownLots() {
    let stored = [];
    try {
        stored = JSON.parse(localStorage.getItem('freshflow_lots') || '[]');
    } catch (e) {
        stored = [];
    }
    const fromInventory = state.inventory
        .map(i => i.slot || i.lot)
        .filter(Boolean);
    // Merge & dedupe, keep order stable
    return [...new Set([...stored, ...fromInventory])];
}

function saveKnownLot(lot) {
    if (!lot) return;
    if (!state.knownLots.includes(lot)) {
        state.knownLots.push(lot);
    }
    localStorage.setItem('freshflow_lots', JSON.stringify(state.knownLots));
}

// Show ALL saved lots as clickable chips (independent of product)
function renderLotChips(containerId = 'lot-chips-container', inputId = 'scan-lot') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const lots = [...state.knownLots].sort((a, b) => a.localeCompare(b));
    if (lots.length === 0) return;

    const label = document.createElement('span');
    label.className = 'lot-chips-label';
    label.textContent = 'ล็อตที่เคยใช้ (กดเพื่อเลือก):';
    container.appendChild(label);

    lots.forEach(lot => {
        const occupants = state.inventory.filter(i => (i.slot || i.lot) === lot);
        const totalQty = occupants.reduce((s, i) => s + i.qty, 0);
        const info = occupants.length
            ? ` · ${occupants.length} รายการ (${totalQty} ชิ้น)`
            : ' · ว่าง';

        const chip = document.createElement('span');
        chip.className = 'lot-chip';
        chip.innerHTML = `<i class="fa-solid fa-warehouse"></i> ${lot}<small style="opacity:.65; font-weight:400;">${info}</small>`;
        chip.addEventListener('click', () => {
            const input = document.getElementById(inputId);
            if (input) input.value = lot;
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
                renderLotChips();
                
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
                renderLotChips();
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
        const lot = document.getElementById('scan-lot').value.trim();
        const expiry = document.getElementById('scan-expiry').value;
        const qty = parseInt(document.getElementById('scan-qty').value, 10);
        const slot = lot; // ล็อต และ ช่องจัดเก็บ เป็นอันเดียวกัน
        
        const diffTime = new Date(expiry) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status = 'green';
        if(diffDays <= 0) status = 'red';
        else if (diffDays <= 7) status = 'yellow';

        // Save the lot so it can be reused next time
        saveKnownLot(lot);

        // Merge if same product + lot + expiry already in this lot
        const existingItemIndex = state.inventory.findIndex(i => i.name === name && i.lot === lot && i.expiry === expiry);
        
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
            text: `เติมสต็อก: ${name} (ล็อต ${lot}) จำนวน ${qty} ชิ้น`,
            date: new Date().toLocaleString('th-TH')
        });

        alert(`นำ ${name} เข้าล็อต ${lot} เรียบร้อยแล้ว!`);
        saveForm.reset();
        preview.innerHTML = '';
        switchView('inventory');
    });
}
