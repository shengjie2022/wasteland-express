// ============================================================
// 废土快递 - UI控制器
// ============================================================

class UI {
    constructor(game) {
        this.game = game;
        this.currentPanel = 'menu';
        this.selectedRoute = -1;
        this.mapCanvas = null;
        this.mapCtx = null;
        this.pendingEvent = null;
        this.foundMod = null; // 搜索事件找到的零件

        // 地图缩放/平移状态
        this.mapZoom = 1.0;
        this.mapMinZoom = 0.4;
        this.mapMaxZoom = 3.0;
        this.mapPanX = 0;
        this.mapPanY = 0;
        this.mapDragging = false;
        this.mapDragStartX = 0;
        this.mapDragStartY = 0;
        this.mapPanStartX = 0;
        this.mapPanStartY = 0;
    }

    init() {
        this.mapCanvas = document.getElementById('map-canvas');
        this.mapCtx = this.mapCanvas?.getContext('2d');
        this.bindEvents();
        this.bindMapEvents();
        this.showPanel('menu');
    }

    // ========== 地图缩放/平移事件 ==========
    bindMapEvents() {
        const canvas = this.mapCanvas;
        if (!canvas) return;

        // 鼠标滚轮缩放
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const oldZoom = this.mapZoom;
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            this.mapZoom = Math.max(this.mapMinZoom, Math.min(this.mapMaxZoom, this.mapZoom * zoomDelta));

            // 以鼠标位置为中心缩放
            const zoomRatio = this.mapZoom / oldZoom;
            this.mapPanX = mouseX - (mouseX - this.mapPanX) * zoomRatio;
            this.mapPanY = mouseY - (mouseY - this.mapPanY) * zoomRatio;

            this.renderMap();
        }, { passive: false });

        // 鼠标拖拽平移
        canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            this.mapDragging = true;
            this.mapDragStartX = e.clientX;
            this.mapDragStartY = e.clientY;
            this.mapPanStartX = this.mapPanX;
            this.mapPanStartY = this.mapPanY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.mapDragging) return;
            this.mapPanX = this.mapPanStartX + (e.clientX - this.mapDragStartX);
            this.mapPanY = this.mapPanStartY + (e.clientY - this.mapDragStartY);
            this.renderMap();
        });

        window.addEventListener('mouseup', () => {
            this.mapDragging = false;
        });
    }

    // 缩放控制按钮
    mapZoomIn() {
        const canvas = this.mapCanvas;
        if (!canvas) return;
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const oldZoom = this.mapZoom;
        this.mapZoom = Math.min(this.mapMaxZoom, this.mapZoom * 1.25);
        const r = this.mapZoom / oldZoom;
        this.mapPanX = cx - (cx - this.mapPanX) * r;
        this.mapPanY = cy - (cy - this.mapPanY) * r;
        this.renderMap();
    }

    mapZoomOut() {
        const canvas = this.mapCanvas;
        if (!canvas) return;
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const oldZoom = this.mapZoom;
        this.mapZoom = Math.max(this.mapMinZoom, this.mapZoom * 0.8);
        const r = this.mapZoom / oldZoom;
        this.mapPanX = cx - (cx - this.mapPanX) * r;
        this.mapPanY = cy - (cy - this.mapPanY) * r;
        this.renderMap();
    }

    mapZoomReset() {
        this.mapZoom = 1.0;
        this.mapPanX = 0;
        this.mapPanY = 0;
        this.renderMap();
    }

    // ========== 面板管理 ==========
    showPanel(panelId) {
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById(`panel-${panelId}`);
        if (panel) {
            panel.classList.add('active');
            this.currentPanel = panelId;
        }

        // 更新导航栏激活状态
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeNav = document.getElementById(`nav-${panelId}`);
        if (activeNav) activeNav.classList.add('active');

        this.refresh();
    }

    refresh() {
        if (this.game.state === 'gameover') {
            this.showGameOver();
            return;
        }
        if (this.game.state === 'victory') {
            this.showVictory();
            return;
        }
        switch (this.currentPanel) {
            case 'menu': break;
            case 'town': this.renderTown(); break;
            case 'map': this.renderMap(); break;
            case 'vehicle': this.renderVehicle(); break;
            case 'trade': this.renderTrade(); break;
            case 'crew': this.renderCrew(); break;
            case 'travel': this.renderTravel(); break;
            case 'event': this.renderEvent(); break;
            case 'orders': this.renderOrders(); break;
            case 'achievements': this.renderAchievements(); break;
        }
        this.renderStatusBar();
        this.renderLog();
        this.checkAndShowAchievementNotifications();
    }

    // ========== 事件绑定 ==========
    bindEvents() {
        // 主菜单
        document.getElementById('btn-standard')?.addEventListener('click', () => {
            this.game.startGame('standard');
            this.showPanel('town');
        });
        document.getElementById('btn-speed')?.addEventListener('click', () => {
            this.game.startGame('speed');
            this.showPanel('town');
        });

        // 导航按钮
        document.getElementById('nav-town')?.addEventListener('click', () => {
            if (this.game.currentTown) this.showPanel('town');
        });
        document.getElementById('nav-map')?.addEventListener('click', () => this.showPanel('map'));
        document.getElementById('nav-vehicle')?.addEventListener('click', () => this.showPanel('vehicle'));
        document.getElementById('nav-trade')?.addEventListener('click', () => {
            if (this.game.currentTown) this.showPanel('trade');
        });
        document.getElementById('nav-crew')?.addEventListener('click', () => this.showPanel('crew'));
        document.getElementById('nav-orders')?.addEventListener('click', () => this.showPanel('orders'));
        document.getElementById('nav-achievements')?.addEventListener('click', () => this.showPanel('achievements'));
    }

    // ========== 状态栏 ==========
    renderStatusBar() {
        const g = this.game;
        const v = g.vehicle;
        if (!v) return;

        const stats = g.getVehicleStats();
        const bar = document.getElementById('status-bar');
        if (!bar) return;

        bar.innerHTML = `
            <div class="status-item" title="瓶盖（货币）">💰 ${g.money}</div>
            <div class="status-item" title="旧世界货币">🪙 ${g.oldWorldCurrency}</div>
            <div class="status-item ${v.fuel < 20 ? 'danger' : ''}" title="燃油">⛽ ${Math.round(v.fuel)}/${v.maxFuel}</div>
            <div class="status-item ${v.durability < 30 ? 'danger' : ''}" title="耐久">🛡️ ${v.durability}/${v.maxDurability}</div>
            <div class="status-item" title="货舱">📦 ${g.getUsedCargoSpace()}/${stats.cargoSpace}</div>
            <div class="status-item" title="回合">⏱️ 第${g.turn}回合</div>
            <div class="status-item" title="已完成订单">📋 ${g.completedOrders}/${g.requiredOrders}</div>
            ${g.currentTown ? `<div class="status-item location">📍 ${g.currentTown.name}</div>` : '<div class="status-item traveling">🚛 旅途中</div>'}
        `;
    }

    // ========== 日志 ==========
    renderLog() {
        const logDiv = document.getElementById('game-log');
        if (!logDiv) return;
        const recent = this.game.log.slice(-8);
        logDiv.innerHTML = recent.map(l =>
            `<div class="log-entry"><span class="log-turn">[${l.turn}]</span> ${l.message}</div>`
        ).join('');
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    // ========== 城镇界面 ==========
    renderTown() {
        const town = this.game.currentTown;
        if (!town) return;

        const content = document.getElementById('town-content');
        if (!content) return;

        const typeData = TOWN_TYPES[town.type];
        const completable = this.game.activeOrders.filter(o => o.toTown === town.id);

        content.innerHTML = `
            <div class="town-header">
                <h2 style="color: ${typeData.color}">${town.name}</h2>
                <span class="town-type" style="background: ${typeData.color}33; color: ${typeData.color}">${typeData.name}</span>
            </div>

            ${completable.length > 0 ? `
                <div class="notice success">
                    ✅ 有${completable.length}个订单可以在此完成！已自动交付。
                </div>
            ` : ''}

            <div class="town-actions">
                <button class="btn btn-primary" onclick="ui.showPanel('orders')">
                    📋 查看订单 <span class="badge">${this.game.availableOrders.length}</span>
                </button>
                <button class="btn btn-primary" onclick="ui.showPanel('trade')">
                    🏪 交易市场
                </button>
                <button class="btn btn-primary" onclick="ui.showPanel('vehicle')">
                    🔧 改装车辆 <span class="badge">${town.mods.length}</span>
                </button>
                <button class="btn btn-primary" onclick="ui.showPanel('crew')">
                    👥 管理乘员
                </button>
                <button class="btn btn-warning" onclick="ui.handleTavernRest()">
                    🍺 酒馆休息
                </button>
                <button class="btn btn-secondary" onclick="ui.handleRepair()">
                    🔧 修理车辆
                </button>
                <button class="btn btn-secondary" onclick="ui.handleRefuel()">
                    ⛽ 加满燃油
                </button>
                <button class="btn btn-accent" onclick="ui.showPanel('map')">
                    🗺️ 查看地图 / 出发
                </button>
            </div>

            <div class="town-crew-available">
                ${town.availableCrew.length > 0 ? `
                    <h3>可雇佣人员</h3>
                    ${town.availableCrew.map((c, i) => `
                        <div class="crew-card">
                            <span>${CREW_ROLES[c.role].icon} ${c.name} - ${CREW_ROLES[c.role].name} Lv.${c.level}</span>
                            <button class="btn btn-sm" onclick="ui.handleHireCrew(${i})">雇佣 (${c.hireCost}💰)</button>
                        </div>
                    `).join('')}
                ` : ''}
            </div>
        `;
    }

    // ========== 地图界面 ==========
    renderMap() {
        const canvas = this.mapCanvas;
        const ctx = this.mapCtx;
        if (!canvas || !ctx) return;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        const w = canvas.width;
        const h = canvas.height;
        const zoom = this.mapZoom;
        const panX = this.mapPanX;
        const panY = this.mapPanY;

        // 背景（全画布，不受变换影响）
        ctx.fillStyle = '#1a1a0e';
        ctx.fillRect(0, 0, w, h);

        // 应用缩放/平移变换
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        // 绘制网格（覆盖可见区域）
        const gridSize = 40;
        const visibleLeft = -panX / zoom;
        const visibleTop = -panY / zoom;
        const visibleRight = (w - panX) / zoom;
        const visibleBottom = (h - panY) / zoom;
        const gridStartX = Math.floor(visibleLeft / gridSize) * gridSize;
        const gridStartY = Math.floor(visibleTop / gridSize) * gridSize;

        ctx.strokeStyle = '#2a2a1e';
        ctx.lineWidth = 0.5;
        for (let x = gridStartX; x <= visibleRight; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, visibleTop); ctx.lineTo(x, visibleBottom); ctx.stroke();
        }
        for (let y = gridStartY; y <= visibleBottom; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(visibleLeft, y); ctx.lineTo(visibleRight, y); ctx.stroke();
        }

        const map = this.game.map;
        if (!map) { ctx.restore(); return; }

        // 地图内容居中偏移
        const baseOffX = (w / zoom - 900) / 2;
        const baseOffY = (h / zoom - 500) / 2;

        // 绘制路线
        for (const route of map.routes) {
            const from = map.towns[route.from];
            const to = map.towns[route.to];
            const fx = from.x + baseOffX, fy = from.y + baseOffY;
            const tx = to.x + baseOffX, ty = to.y + baseOffY;

            const danger = route.danger;
            const r = Math.round(100 + danger * 155);
            const g = Math.round(150 - danger * 100);
            ctx.strokeStyle = route.radiation > 0 ? `rgba(100, 255, 100, 0.4)` : `rgba(${r}, ${g}, 50, 0.5)`;
            ctx.lineWidth = 2;
            ctx.setLineDash(route.radiation > 0 ? [5, 5] : []);
            ctx.beginPath();
            ctx.moveTo(fx, fy);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.setLineDash([]);

            // 路线信息
            const mx = (fx + tx) / 2, my = (fy + ty) / 2;
            ctx.fillStyle = '#b0a880';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${route.distance}km ⛽${route.fuelCost}${route.radiation > 0 ? ' ☢' : ''}`, mx, my - 5);
        }

        // 绘制城镇
        for (const town of map.towns) {
            const x = town.x + baseOffX;
            const y = town.y + baseOffY;
            const typeData = TOWN_TYPES[town.type];
            const isCurrent = this.game.currentTown?.id === town.id;

            const nodeR = isCurrent ? 14 : 10;

            // 城镇圆点
            ctx.beginPath();
            ctx.arc(x, y, nodeR, 0, Math.PI * 2);
            ctx.fillStyle = isCurrent ? typeData.color : (town.visited ? typeData.color + '88' : '#555');
            ctx.fill();
            ctx.strokeStyle = isCurrent ? '#fff' : typeData.color;
            ctx.lineWidth = isCurrent ? 3 : 1.5;
            ctx.stroke();

            if (isCurrent) {
                ctx.beginPath();
                ctx.arc(x, y, 18, 0, Math.PI * 2);
                ctx.strokeStyle = '#fff4';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // 城镇名称
            ctx.fillStyle = isCurrent ? '#fff' : '#ccc';
            ctx.font = isCurrent ? 'bold 13px sans-serif' : '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(town.name, x, y - 18);

            // 类型标签
            ctx.fillStyle = typeData.color + '99';
            ctx.font = '9px sans-serif';
            ctx.fillText(typeData.name, x, y + 26);

            // 订单目标标记
            const hasOrder = this.game.activeOrders.some(o => o.toTown === town.id);
            if (hasOrder) {
                ctx.fillStyle = '#ff0';
                ctx.font = 'bold 16px sans-serif';
                ctx.fillText('📋', x + 16, y - 12);
            }
        }

        // 旅行中标记
        if (this.game.travelProgress) {
            const tp = this.game.travelProgress;
            const from = map.towns[tp.route.from === tp.targetId ?
                (tp.route.to === tp.targetId ? tp.route.from : tp.route.to) :
                tp.route.from];
            const to = map.towns[tp.targetId];
            const progress = tp.currentSegment / tp.totalSegments;
            const px = (from.x + (to.x - from.x) * progress) + baseOffX;
            const py = (from.y + (to.y - from.y) * progress) + baseOffY;

            ctx.fillStyle = '#ff0';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🚛', px, py + 7);
        }

        ctx.restore();

        // 更新缩放显示
        const zoomLabel = document.getElementById('zoom-label');
        if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)}%`;

        // 路线选择面板
        this.renderRoutePanel();
    }

    renderRoutePanel() {
        const panel = document.getElementById('route-panel');
        if (!panel) return;

        if (!this.game.currentTown) {
            panel.innerHTML = '<p class="dim">旅途中...</p>';
            return;
        }

        const routes = this.game.getAvailableRoutes();
        panel.innerHTML = `
            <h3>可选路线</h3>
            ${routes.map((r, i) => `
                <div class="route-card ${this.selectedRoute === i ? 'selected' : ''}"
                     onclick="ui.selectRoute(${i})">
                    <div class="route-dest">→ ${r.targetTown.name}
                        <span class="town-type-badge" style="background:${TOWN_TYPES[r.targetTown.type].color}33;color:${TOWN_TYPES[r.targetTown.type].color}">
                            ${TOWN_TYPES[r.targetTown.type].name}
                        </span>
                    </div>
                    <div class="route-stats">
                        <span>📏 ${r.distance}km</span>
                        <span class="${r.adjustedFuelCost > this.game.vehicle.fuel ? 'danger' : ''}">⛽ ${r.adjustedFuelCost}</span>
                        <span class="${r.danger > 0.5 ? 'danger' : ''}">⚠️ ${Math.round(r.danger * 100)}%</span>
                        ${r.radiation > 0 ? `<span class="radiation">☢️ ${r.radiation}</span>` : ''}
                    </div>
                </div>
            `).join('')}
            ${this.selectedRoute >= 0 ? `
                <button class="btn btn-accent btn-full" onclick="ui.handleDepart()">
                    🚛 出发！
                </button>
            ` : '<p class="dim">选择一条路线出发</p>'}
        `;
    }

    selectRoute(index) {
        this.selectedRoute = index;
        this.renderRoutePanel();
    }

    // ========== 旅行界面 ==========
    renderTravel() {
        const content = document.getElementById('travel-content');
        if (!content) return;

        const tp = this.game.travelProgress;
        if (!tp) {
            content.innerHTML = '<p>旅行已结束</p>';
            return;
        }

        const progress = Math.round((tp.currentSegment / tp.totalSegments) * 100);
        content.innerHTML = `
            <div class="travel-info">
                <h2>🚛 前往 ${tp.route.targetTown.name}</h2>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                    <span class="progress-text">${tp.currentSegment}/${tp.totalSegments}</span>
                </div>
                <div class="travel-stats">
                    <span>⛽ 剩余燃油: ${Math.round(this.game.vehicle.fuel)}</span>
                    <span>🛡️ 耐久: ${this.game.vehicle.durability}</span>
                </div>
                <button class="btn btn-accent btn-full" onclick="ui.handleAdvanceTravel()">
                    ▶️ 继续前进
                </button>
            </div>
        `;
    }

    // ========== 事件界面 ==========
    renderEvent() {
        const content = document.getElementById('event-content');
        if (!content || !this.pendingEvent) return;

        const event = this.pendingEvent;
        content.innerHTML = `
            <div class="event-card">
                <div class="event-icon">${event.icon}</div>
                <h2>${event.name}</h2>
                <p class="event-desc">${event.desc}</p>
                <div class="event-choices">
                    ${event.choices.map((c, i) => `
                        <button class="btn btn-choice" onclick="ui.handleEventChoice(${i})">
                            <span class="choice-text">${c.text}</span>
                            <span class="choice-desc">${c.desc}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ========== 车辆改装界面 ==========
    renderVehicle() {
        const content = document.getElementById('vehicle-content');
        if (!content) return;

        const v = this.game.vehicle;
        const stats = this.game.getVehicleStats();
        const slotNames = { cargo: '货舱', armor: '装甲', engine: '引擎', radar: '雷达', weapon: '武器' };

        content.innerHTML = `
            <div class="vehicle-info">
                <h2>🚛 ${v.name}</h2>
                <div class="stats-grid">
                    <div class="stat">速度 <span>${stats.speed}</span></div>
                    <div class="stat">护甲 <span>${stats.armor}</span></div>
                    <div class="stat">货舱 <span>${stats.cargoSpace}</span></div>
                    <div class="stat">战力 <span>${stats.combatBonus}</span></div>
                    <div class="stat">探测 <span>${stats.detection}</span></div>
                    <div class="stat">油效 <span>${stats.fuelEfficiency > 0 ? '+' : ''}${stats.fuelEfficiency}%</span></div>
                </div>

                ${this.game.activeSetBonuses.length > 0 ? `
                    <div class="set-bonuses">
                        <h3>套装效果</h3>
                        ${this.game.activeSetBonuses.map(b => `
                            <div class="set-bonus-item">✨ ${b.name}：${b.desc}</div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>

            <div class="mod-slots">
                <h3>改装槽位</h3>
                ${Object.entries(v.mods).map(([slot, modKey]) => {
                    const mod = modKey ? MODIFICATIONS[modKey] : null;
                    return `
                        <div class="mod-slot ${mod ? 'filled' : 'empty'}">
                            <div class="slot-header">
                                <span class="slot-name">${slotNames[slot]}</span>
                                ${mod ? `
                                    <span class="mod-rarity" style="color:${RARITY_COLORS[mod.rarity]}">[${RARITY_NAMES[mod.rarity]}]</span>
                                ` : ''}
                            </div>
                            ${mod ? `
                                <div class="mod-info">
                                    <span class="mod-name" style="color:${RARITY_COLORS[mod.rarity]}">${mod.name}</span>
                                    <span class="mod-set" style="color:${MOD_SETS[mod.set]?.color}">${MOD_SETS[mod.set]?.name}套装</span>
                                    <div class="mod-stats">
                                        ${Object.entries(mod.stats).map(([k, v]) =>
                                            `<span>${this.statName(k)}: ${v > 0 ? '+' : ''}${v}</span>`
                                        ).join('')}
                                    </div>
                                    <button class="btn btn-sm btn-danger" onclick="ui.handleUninstallMod('${slot}')">卸下</button>
                                </div>
                            ` : `
                                <div class="mod-empty">空槽位</div>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>

            ${this.game.currentTown ? `
                <div class="shop-mods">
                    <h3>可购买零件</h3>
                    ${this.game.currentTown.mods.length === 0 ? '<p class="dim">暂无零件出售</p>' :
                        this.game.currentTown.mods.map(modKey => {
                            const mod = MODIFICATIONS[modKey];
                            return `
                                <div class="shop-mod-card">
                                    <div class="mod-header">
                                        <span class="mod-name" style="color:${RARITY_COLORS[mod.rarity]}">${mod.name}</span>
                                        <span class="mod-rarity" style="color:${RARITY_COLORS[mod.rarity]}">[${RARITY_NAMES[mod.rarity]}]</span>
                                    </div>
                                    <div class="mod-details">
                                        <span>类型: ${slotNames[mod.type]}</span>
                                        <span class="mod-set" style="color:${MOD_SETS[mod.set]?.color}">${MOD_SETS[mod.set]?.name}</span>
                                    </div>
                                    <div class="mod-stats">
                                        ${Object.entries(mod.stats).map(([k, v]) =>
                                            `<span>${this.statName(k)}: ${v > 0 ? '+' : ''}${v}</span>`
                                        ).join('')}
                                    </div>
                                    <button class="btn btn-sm ${this.game.money >= mod.price ? 'btn-primary' : 'btn-disabled'}"
                                            onclick="ui.handleBuyMod('${modKey}')"
                                            ${this.game.money < mod.price ? 'disabled' : ''}>
                                        购买 ${mod.price}💰
                                    </button>
                                </div>
                            `;
                        }).join('')
                    }
                </div>
                ${this.foundMod ? `
                    <div class="found-mod">
                        <h3>拾取的零件</h3>
                        <div class="shop-mod-card">
                            <span class="mod-name" style="color:${RARITY_COLORS[MODIFICATIONS[this.foundMod].rarity]}">${MODIFICATIONS[this.foundMod].name}</span>
                            <button class="btn btn-sm btn-accent" onclick="ui.handleInstallFoundMod()">安装</button>
                        </div>
                    </div>
                ` : ''}
            ` : ''}
        `;
    }

    statName(key) {
        const names = {
            cargoSpace: '货舱', armor: '护甲', speed: '速度',
            combatBonus: '战力', detection: '探测', fuelEfficiency: '油效',
            eventWarning: '预警', lootBonus: '战利品'
        };
        return names[key] || key;
    }

    // ========== 交易界面 ==========
    renderTrade() {
        const content = document.getElementById('trade-content');
        if (!content) return;

        const town = this.game.currentTown;
        if (!town) return;

        const cargo = this.game.vehicle.cargo;
        const stats = this.game.getVehicleStats();
        const usedSpace = this.game.getUsedCargoSpace();

        content.innerHTML = `
            <h2>🏪 ${town.name} 市场</h2>
            <div class="trade-info">
                <span>💰 ${this.game.money} 瓶盖</span>
                <span>📦 ${usedSpace}/${stats.cargoSpace} 货舱</span>
            </div>

            <div class="trade-sections">
                <div class="trade-section">
                    <h3>可购买</h3>
                    ${Object.entries(town.goods).map(([key, good]) => `
                        <div class="trade-item">
                            <div class="item-info">
                                <span>${GOODS[key]?.icon} ${GOODS[key]?.name}</span>
                                <span class="stock">库存: ${good.stock}</span>
                            </div>
                            <div class="item-actions">
                                <span class="price buy-price">买 ${good.buyPrice}💰</span>
                                <button class="btn btn-xs" onclick="ui.handleBuy('${key}', 1)"
                                    ${good.stock <= 0 || this.game.money < good.buyPrice ? 'disabled' : ''}>+1</button>
                                <button class="btn btn-xs" onclick="ui.handleBuy('${key}', 5)"
                                    ${good.stock < 5 || this.game.money < good.buyPrice * 5 ? 'disabled' : ''}>+5</button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="trade-section">
                    <h3>你的货物</h3>
                    ${Object.keys(cargo).length === 0 ? '<p class="dim">货舱空空如也</p>' :
                        Object.entries(cargo).filter(([_, amt]) => amt > 0).map(([key, amount]) => {
                            const sellPrice = town.goods[key]?.sellPrice ||
                                Math.round(GOODS[key].basePrice * town.priceModifier * 0.5);
                            return `
                                <div class="trade-item">
                                    <div class="item-info">
                                        <span>${GOODS[key]?.icon} ${GOODS[key]?.name} ×${amount}</span>
                                    </div>
                                    <div class="item-actions">
                                        <span class="price sell-price">卖 ${sellPrice}💰</span>
                                        <button class="btn btn-xs btn-sell" onclick="ui.handleSell('${key}', 1)">-1</button>
                                        <button class="btn btn-xs btn-sell" onclick="ui.handleSell('${key}', ${amount})">全卖</button>
                                    </div>
                                </div>
                            `;
                        }).join('')
                    }
                </div>
            </div>
        `;
    }

    // ========== 乘员界面 ==========
    renderCrew() {
        const content = document.getElementById('crew-content');
        if (!content) return;

        content.innerHTML = `
            <h2>👥 乘员管理</h2>
            <div class="crew-list">
                ${this.game.crew.map(member => `
                    <div class="crew-member-card ${member.sick ? 'sick' : ''} ${member.health <= 0 ? 'dead' : ''}">
                        <div class="crew-header">
                            <span class="crew-icon">${CREW_ROLES[member.role].icon}</span>
                            <span class="crew-name">${member.name}</span>
                            <span class="crew-role">${CREW_ROLES[member.role].name} Lv.${member.level}</span>
                            ${member.sick ? '<span class="crew-status sick">🤢 生病</span>' : ''}
                        </div>
                        <div class="crew-bars">
                            <div class="bar-container" title="生命值">
                                <span class="bar-label">❤️</span>
                                <div class="bar">
                                    <div class="bar-fill health" style="width:${member.health}%"></div>
                                </div>
                                <span class="bar-value">${member.health}/${member.maxHealth}</span>
                            </div>
                            <div class="bar-container" title="理智值">
                                <span class="bar-label">🧠</span>
                                <div class="bar">
                                    <div class="bar-fill sanity" style="width:${member.sanity}%"></div>
                                </div>
                                <span class="bar-value">${member.sanity}/${member.maxSanity}</span>
                            </div>
                        </div>
                        <div class="crew-desc">${CREW_ROLES[member.role].desc}</div>
                        ${member.id !== 'crew_starter' ? `
                            <button class="btn btn-sm btn-danger" onclick="ui.handleFireCrew('${member.id}')">解雇</button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>

            ${this.game.currentTown?.availableCrew.length > 0 ? `
                <div class="hire-section">
                    <h3>可雇佣人员</h3>
                    ${this.game.currentTown.availableCrew.map((c, i) => `
                        <div class="crew-hire-card">
                            <span>${CREW_ROLES[c.role].icon} ${c.name} - ${CREW_ROLES[c.role].name} Lv.${c.level}</span>
                            <span>❤️${c.health} 🧠${c.sanity}</span>
                            <button class="btn btn-sm btn-primary"
                                    onclick="ui.handleHireCrew(${i})"
                                    ${this.game.money < c.hireCost || this.game.crew.length >= 4 ? 'disabled' : ''}>
                                雇佣 ${c.hireCost}💰
                            </button>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    // ========== 订单界面 ==========
    renderOrders() {
        const content = document.getElementById('orders-content');
        if (!content) return;

        content.innerHTML = `
            <h2>📋 订单</h2>

            <div class="orders-section">
                <h3>当前订单 (${this.game.activeOrders.length})</h3>
                ${this.game.activeOrders.length === 0 ? '<p class="dim">暂无进行中的订单</p>' :
                    this.game.activeOrders.map(order => `
                        <div class="order-card active">
                            <div class="order-header">
                                <span>${order.cargoIcon} ${order.cargoType} ×${order.amount}</span>
                                <span class="order-reward">💰 ${order.reward}</span>
                            </div>
                            <div class="order-route">
                                ${this.game.map.towns[order.fromTown].name} → ${this.game.map.towns[order.toTown].name}
                            </div>
                            <div class="order-deadline ${order.turnsLeft <= 2 ? 'urgent' : ''}">
                                ⏱️ 剩余 ${order.turnsLeft} 回合
                            </div>
                        </div>
                    `).join('')
                }
            </div>

            ${this.game.currentTown ? `
                <div class="orders-section">
                    <h3>可接取订单</h3>
                    ${this.game.availableOrders.length === 0 ? '<p class="dim">暂无可接取订单</p>' :
                        this.game.availableOrders.map(order => `
                            <div class="order-card available">
                                <div class="order-header">
                                    <span>${order.cargoIcon} ${order.cargoType} ×${order.amount}</span>
                                    <span class="order-reward">💰 ${order.reward}</span>
                                </div>
                                <div class="order-route">
                                    → ${this.game.map.towns[order.toTown].name}
                                </div>
                                <div class="order-info">
                                    <span>⏱️ 期限 ${order.deadline} 回合</span>
                                    <span class="${order.dangerMult > 1.3 ? 'danger' : ''}">
                                        ⚠️ 危险度 ×${order.dangerMult}
                                    </span>
                                </div>
                                <button class="btn btn-sm btn-accent" onclick="ui.handleAcceptOrder('${order.id}')">
                                    接取订单
                                </button>
                            </div>
                        `).join('')
                    }
                </div>
            ` : ''}
        `;
    }

    // ========== 成就界面 ==========
    renderAchievements() {
        const content = document.getElementById('achievements-content');
        if (!content) return;

        const progress = this.game.getAchievementProgress();
        const selectedCat = this._achievementCategory || 'all';

        content.innerHTML = `
            <div class="achievements-header">
                <h2>🏆 成就系统</h2>
                <div class="achievement-progress-bar">
                    <div class="achievement-progress-fill" style="width:${progress.pct}%"></div>
                    <span class="achievement-progress-text">${progress.unlocked}/${progress.total} (${progress.pct}%)</span>
                </div>
            </div>

            <div class="achievement-tabs">
                <button class="ach-tab ${selectedCat === 'all' ? 'active' : ''}"
                        onclick="ui.selectAchievementCategory('all')">全部</button>
                ${Object.entries(ACHIEVEMENT_CATEGORIES).map(([catId, cat]) => `
                    <button class="ach-tab ${selectedCat === catId ? 'active' : ''}"
                            onclick="ui.selectAchievementCategory('${catId}')">
                        ${cat.icon} ${cat.name}
                        <span class="ach-tab-count">${progress.categories[catId].unlocked}/${progress.categories[catId].total}</span>
                    </button>
                `).join('')}
            </div>

            <div class="achievements-grid">
                ${Object.entries(ACHIEVEMENTS)
                    .filter(([, a]) => selectedCat === 'all' || a.category === selectedCat)
                    .map(([id, a]) => {
                        const unlocked = !!this.game.achievements[id];
                        const isHidden = a.hidden && !unlocked;
                        return `
                            <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'} ${isHidden ? 'hidden-ach' : ''}">
                                <div class="ach-icon">${isHidden ? '❓' : a.icon}</div>
                                <div class="ach-info">
                                    <div class="ach-name">${isHidden ? '???' : a.name}</div>
                                    <div class="ach-desc">${isHidden ? '达成特殊条件解锁' : a.desc}</div>
                                    ${unlocked && a.reward ? `
                                        <div class="ach-reward">奖励: ${this.getRewardText(a.reward)}</div>
                                    ` : ''}
                                </div>
                                ${unlocked ? '<div class="ach-check">✅</div>' : ''}
                            </div>
                        `;
                    }).join('')}
            </div>
        `;
    }

    selectAchievementCategory(catId) {
        this._achievementCategory = catId;
        this.renderAchievements();
    }

    getRewardText(reward) {
        switch (reward.type) {
            case 'caps': return `${reward.value} 瓶盖`;
            case 'title': return `称号「${reward.value}」`;
            case 'unlock_mod': return `特殊零件：${SPECIAL_MODS[reward.value]?.name || reward.value}`;
            case 'unlock_vehicle': return `特殊载具：${SPECIAL_VEHICLES[reward.value]?.name || reward.value}`;
            default: return reward.value;
        }
    }

    checkAndShowAchievementNotifications() {
        const pending = this.game.popPendingAchievements();
        for (const ach of pending) {
            this.showAchievementNotification(ach);
        }
    }

    showAchievementNotification(achievement) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast toast-achievement';
        toast.innerHTML = `
            <div class="ach-toast-icon">${achievement.icon}</div>
            <div class="ach-toast-text">
                <div class="ach-toast-title">🏆 成就解锁</div>
                <div class="ach-toast-name">${achievement.name}</div>
                <div class="ach-toast-desc">${achievement.desc}</div>
            </div>
        `;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ========== 游戏结束/胜利 ==========
    showGameOver() {
        const content = document.getElementById('main-content');
        if (!content) return;

        content.innerHTML = `
            <div class="panel active" style="display:flex">
                <div class="gameover-screen">
                    <h1>💀 游戏结束</h1>
                    <p>${this.game.log[this.game.log.length - 1]?.message || '你的旅程结束了'}</p>
                    <div class="final-stats">
                        <h3>最终统计</h3>
                        <div>📏 行驶距离: ${Math.round(this.game.stats.distanceTraveled)} km</div>
                        <div>📋 完成订单: ${this.game.completedOrders}</div>
                        <div>⚔️ 战斗胜利: ${this.game.stats.combatsWon}</div>
                        <div>💰 总收入: ${this.game.stats.moneyEarned}</div>
                        <div>⏱️ 存活回合: ${this.game.turn}</div>
                        <div>🏆 解锁成就: ${Object.keys(this.game.achievements).length}/${Object.keys(ACHIEVEMENTS).length}</div>
                    </div>
                    <button class="btn btn-accent btn-full" onclick="location.reload()">
                        🔄 重新开始
                    </button>
                </div>
            </div>
        `;
    }

    showVictory() {
        const content = document.getElementById('main-content');
        if (!content) return;

        content.innerHTML = `
            <div class="panel active" style="display:flex">
                <div class="victory-screen">
                    <h1>🎉 任务完成！</h1>
                    <p>你成功完成了所有主要订单，成为废土上最可靠的快递员！</p>
                    <div class="final-stats">
                        <h3>最终统计</h3>
                        <div>📏 行驶距离: ${Math.round(this.game.stats.distanceTraveled)} km</div>
                        <div>📋 完成订单: ${this.game.completedOrders}</div>
                        <div>⚔️ 战斗胜利: ${this.game.stats.combatsWon}</div>
                        <div>💰 总收入: ${this.game.stats.moneyEarned}</div>
                        <div>⏱️ 总回合数: ${this.game.turn}</div>
                        <div>💰 最终资金: ${this.game.money}</div>
                        <div>🏆 解锁成就: ${Object.keys(this.game.achievements).length}/${Object.keys(ACHIEVEMENTS).length}</div>
                    </div>
                    <button class="btn btn-accent btn-full" onclick="location.reload()">
                        🔄 再来一局
                    </button>
                </div>
            </div>
        `;
    }

    // ========== 操作处理 ==========
    handleDepart() {
        if (this.selectedRoute < 0) return;
        const result = this.game.startTravel(this.selectedRoute);
        this.selectedRoute = -1;

        if (!result) return;
        if (result.error) {
            this.showToast(result.error, 'error');
            return;
        }

        this.handleTravelResult(result);
    }

    handleAdvanceTravel() {
        const result = this.game.advanceTravel();
        if (!result) return;
        this.handleTravelResult(result);
    }

    handleTravelResult(result) {
        switch (result.type) {
            case 'event':
                this.pendingEvent = result.event;
                this.showPanel('event');
                break;
            case 'arrive':
                this.showPanel('town');
                if (result.completedOrders?.length > 0) {
                    this.showToast(`完成${result.completedOrders.length}个订单！`, 'success');
                }
                break;
            case 'travel':
                this.showPanel('travel');
                break;
            case 'gameover':
                this.showGameOver();
                break;
        }
    }

    handleEventChoice(choiceIndex) {
        if (!this.pendingEvent) return;
        const results = this.game.resolveEvent(this.pendingEvent.key, choiceIndex);

        // 检查是否找到了零件
        const foundResult = results.find(r => r.foundMod);
        if (foundResult) {
            this.foundMod = foundResult.foundMod;
        }

        this.pendingEvent = null;

        // 显示结果
        const content = document.getElementById('event-content');
        if (content) {
            const resultHtml = results.filter(r => r.message).map(r => `
                <div class="event-result ${r.type}">${r.message}</div>
            `).join('');

            content.innerHTML = `
                <div class="event-card">
                    <h2>结果</h2>
                    ${resultHtml}
                    <button class="btn btn-accent btn-full" onclick="ui.continueAfterEvent()">
                        ▶️ 继续
                    </button>
                </div>
            `;
        }
    }

    continueAfterEvent() {
        if (this.game.state === 'gameover') {
            this.showGameOver();
            return;
        }
        if (this.game.state === 'victory') {
            this.showVictory();
            return;
        }

        if (this.game.travelProgress) {
            // 还在旅途中，检查是否到达
            const tp = this.game.travelProgress;
            if (tp.currentSegment >= tp.totalSegments) {
                const result = this.game.arriveAtTown(tp.targetId);
                this.handleTravelResult(result);
            } else {
                this.showPanel('travel');
            }
        } else {
            this.showPanel('town');
        }
    }

    handleBuy(goodKey, amount) {
        const result = this.game.buyGoods(goodKey, amount);
        if (result.success) {
            this.showToast(result.msg, 'success');
        } else {
            this.showToast(result.msg, 'error');
        }
        this.refresh();
    }

    handleSell(goodKey, amount) {
        const result = this.game.sellGoods(goodKey, amount);
        if (result.success) {
            this.showToast(result.msg, 'success');
        } else {
            this.showToast(result.msg, 'error');
        }
        this.refresh();
    }

    handleBuyMod(modKey) {
        const result = this.game.buyMod(modKey);
        if (result.success) {
            this.showToast(result.msg, 'success');
        } else {
            this.showToast(result.msg, 'error');
        }
        this.refresh();
    }

    handleUninstallMod(slot) {
        this.game.uninstallMod(slot);
        this.showToast('已卸下零件', 'success');
        this.refresh();
    }

    handleInstallFoundMod() {
        if (!this.foundMod) return;
        const mod = MODIFICATIONS[this.foundMod];
        this.game.installMod(mod.type, this.foundMod);
        this.foundMod = null;
        this.showToast('已安装拾取的零件', 'success');
        this.refresh();
    }

    handleAcceptOrder(orderId) {
        if (this.game.acceptOrder(orderId)) {
            this.showToast('订单已接取', 'success');
        }
        this.refresh();
    }

    handleTavernRest() {
        const result = this.game.restAtTavern();
        this.showToast(result.message, result.success ? 'success' : 'error');
        this.refresh();
    }

    handleRepair() {
        const result = this.game.repairVehicle();
        this.showToast(result.msg, result.success ? 'success' : 'error');
        this.refresh();
    }

    handleRefuel() {
        const result = this.game.refuel(999);
        this.showToast(result.msg, result.success ? 'success' : 'error');
        this.refresh();
    }

    handleHireCrew(index) {
        const town = this.game.currentTown;
        if (!town || !town.availableCrew[index]) return;
        if (this.game.hireCrew(town.availableCrew[index])) {
            town.availableCrew.splice(index, 1);
            this.showToast('雇佣成功', 'success');
        } else {
            this.showToast('无法雇佣（资金不足或队伍已满）', 'error');
        }
        this.refresh();
    }

    handleFireCrew(memberId) {
        if (this.game.fireCrew(memberId)) {
            this.showToast('已解雇', 'success');
        }
        this.refresh();
    }

    // ========== Toast提示 ==========
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
}

// ========== 全局初始化 ==========
let game, ui;

document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
    ui = new UI(game);
    ui.init();
});
