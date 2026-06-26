// ============================================================
// 废土快递 - UI控制器 v3.0
// 新增：派系面板、任务面板、收藏册面板、零点碎片、羁绊显示、货物质量
// ============================================================

class UI {
    constructor(game) {
        this.game = game;
        this.currentPanel = 'menu';
        this.selectedRoute = -1;
        this.mapCanvas = null;
        this.mapCtx = null;
        this.pendingEvent = null;
        this.foundMod = null;
        this.pendingTactic = 0; // 战斗战术: 0=全力, 1=防守, 2=精准
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
        // v3.0
        this.selectedFaction = null;
        this.selectedMission = null;
        this.pendingStory = null;
    }

    init() {
        this.mapCanvas = document.getElementById('map-canvas');
        this.mapCtx = this.mapCanvas?.getContext('2d');
        this.bindEvents();
        this.bindMapEvents();
        // 检查存档
        if (this.game.hasSave()) {
            this.showSaveLoadMenu();
        } else {
            this.showPanel('menu');
        }
    }

    showSaveLoadMenu() {
        const content = document.getElementById('main-content');
        if (!content) return;
        content.innerHTML = `
            <div class="panel active" style="display:flex;align-items:center;justify-content:center">
                <div class="menu-screen" style="max-width:400px">
                    <h1>🚛 废土快递</h1>
                    <p class="dim">Wasteland Express</p>
                    <div class="save-load-menu">
                        <button class="btn btn-accent btn-full" onclick="ui.handleContinue()">
                            ▶️ 继续游戏
                        </button>
                        <button class="btn btn-primary btn-full" onclick="ui.showPanel('menu')">
                            🆕 新游戏
                        </button>
                        <button class="btn btn-danger btn-full" onclick="ui.handleDeleteSave()">
                            🗑️ 删除存档
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    handleContinue() {
        if (this.game.loadGame()) {
            audio._init();
            audio.click();
            if (this.game.state === 'gameover') {
                this.showGameOver();
            } else if (this.game.state === 'victory') {
                this.showVictory();
            } else {
                this.showPanel('town');
            }
        } else {
            this.showPanel('menu');
        }
    }

    handleDeleteSave() {
        if (confirm('确定删除存档？此操作不可恢复。')) {
            this.game.deleteSave();
            audio.click();
            this.showPanel('menu');
        }
    }

    // ========== 地图缩放/平移事件 ==========
    bindMapEvents() {
        const canvas = this.mapCanvas;
        if (!canvas) return;
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const oldZoom = this.mapZoom;
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            this.mapZoom = Math.max(this.mapMinZoom, Math.min(this.mapMaxZoom, this.mapZoom * zoomDelta));
            const zoomRatio = this.mapZoom / oldZoom;
            this.mapPanX = mouseX - (mouseX - this.mapPanX) * zoomRatio;
            this.mapPanY = mouseY - (mouseY - this.mapPanY) * zoomRatio;
            this.renderMap();
        }, { passive: false });

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

        window.addEventListener('mouseup', () => { this.mapDragging = false; });
    }

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
        if (panel) { panel.classList.add('active'); this.currentPanel = panelId; }
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeNav = document.getElementById(`nav-${panelId}`);
        if (activeNav) activeNav.classList.add('active');
        this.refresh();
    }

    refresh() {
        if (this.game.state === 'gameover') { this.showGameOver(); return; }
        if (this.game.state === 'victory') { this.showVictory(); return; }
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
            // v3.0
            case 'factions': this.renderFactions(); break;
            case 'missions': this.renderMissions(); break;
            case 'fragments': this.renderFragments(); break;
            case 'collectibles': this.renderCollectibles(); break;
        }
        this.renderStatusBar();
        this.renderLog();
        this.checkAndShowAchievementNotifications();
        // v3.0: 检查剧情事件
        this._checkStoryEvents();
    }

    // v3.0: 检查乘员剧情事件
    _checkStoryEvents() {
        if (this.currentPanel !== 'town') return;
        const stories = this.game.getAvailableCrewStories();
        if (stories.length > 0 && !this._storyModalOpen) {
            const { member, storyData, node } = stories[0];
            this._storyModalOpen = true;
            this.pendingStory = { member, storyData, node };
            this.showStoryModal();
        }
    }

    showStoryModal() {
        const { member, storyData, node } = this.pendingStory;
        const content = document.getElementById('story-content');
        if (!content) return;
        content.innerHTML = `
            <div class="story-modal">
                <div class="story-header">
                    <span class="story-icon">${storyData.icon}</span>
                    <span class="story-title">${member.name}：${storyData.title}</span>
                </div>
                <div class="story-text">${node.text}</div>
                <div class="story-choices">
                    ${node.choices.map((c, i) => `
                        <button class="btn btn-choice" onclick="ui.handleStoryChoice(${i})">${c.text}</button>
                    `).join('')}
                </div>
            </div>
        `;
        this.showPanel('story');
    }

    handleStoryChoice(choiceIndex) {
        if (!this.pendingStory) return;
        const { member, storyData } = this.pendingStory;
        this.game.advanceCrewStory(member.id, storyData.id, choiceIndex);
        this.pendingStory = null;
        this._storyModalOpen = false;
        this.showPanel('town');
        this.showToast('剧情已更新', 'success');
    }

    // ========== 事件绑定 ==========
    bindEvents() {
        document.getElementById('btn-standard')?.addEventListener('click', () => {
            this.game.startGame('standard');
            this.showPanel('town');
        });
        document.getElementById('btn-speed')?.addEventListener('click', () => {
            this.game.startGame('speed');
            this.showPanel('town');
        });
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
        // v3.0 导航
        document.getElementById('nav-factions')?.addEventListener('click', () => this.showPanel('factions'));
        document.getElementById('nav-missions')?.addEventListener('click', () => this.showPanel('missions'));
        document.getElementById('nav-fragments')?.addEventListener('click', () => this.showPanel('fragments'));
        document.getElementById('nav-collectibles')?.addEventListener('click', () => this.showPanel('collectibles'));
    }

    // ========== 状态栏（v3.0 增强） ==========
    renderStatusBar() {
        const g = this.game;
        const v = g.vehicle;
        if (!v) return;
        const stats = g.getVehicleStats();
        const bar = document.getElementById('status-bar');
        if (!bar) return;
        // v3.0: 派系声望显示
        const repHtml = Object.entries(g.getAllFactionRep()).map(([fid, rep]) => {
            const faction = FACTIONS[fid];
            const level = FACTION_REP_LEVELS.find(l => l.level === rep) || FACTION_REP_LEVELS[2];
            return `<span class="faction-rep-badge" title="${faction.name}：${level.name}" style="background:${faction.bgColor};color:${faction.color}">${faction.icon}</span>`;
        }).join('');
        // v3.0: 零点碎片显示
        const fragHtml = g.zeroFragments.length > 0
            ? `<span class="zero-frag-badge" title="零点碎片 ${g.zeroFragments.length}/7">🔮 ${g.zeroFragments.length}</span>`
            : '';
        bar.innerHTML = `
            <div class="status-item" title="瓶盖（货币）">💰 ${g.money}</div>
            <div class="status-item" title="旧世界货币">🪙 ${g.oldWorldCurrency}</div>
            <div class="status-item ${v.fuel < 20 ? 'danger' : ''}" title="燃油">⛽ ${Math.round(v.fuel)}/${v.maxFuel}</div>
            <div class="status-item ${v.durability < 30 ? 'danger' : ''}" title="耐久">🛡️ ${v.durability}/${v.maxDurability}</div>
            <div class="status-item" title="货舱">📦 ${g.getUsedCargoSpace()}/${stats.cargoSpace}</div>
            <div class="status-item" title="回合">⏱️ 第${g.turn}回合</div>
            <div class="status-item" title="已完成订单">📋 ${g.completedOrders}/${g.requiredOrders}</div>
            ${fragHtml}
            <div class="faction-rep-bar" title="派系声望">${repHtml}</div>
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
            ${completable.length > 0 ? `<div class="notice success">✅ 有${completable.length}个订单可以在此完成！已自动交付。</div>` : ''}
            ${this.game.zeroFragments.length >= 7 ? `<div class="notice" style="background:#44ff8822;color:#44ff88;border:1px solid #44ff88">⚡ 零点设施入口已显现！前往「🔮碎片」查看</div>` : ''}
            <div class="town-actions">
                <button class="btn btn-primary" onclick="ui.showPanel('orders')">📋 查看订单 <span class="badge">${this.game.availableOrders.length}</span></button>
                <button class="btn btn-primary" onclick="ui.showPanel('trade')">🏪 交易市场</button>
                <button class="btn btn-primary" onclick="ui.showPanel('vehicle')">🔧 改装车辆 <span class="badge">${town.mods.length}</span></button>
                <button class="btn btn-primary" onclick="ui.showPanel('crew')">👥 管理乘员</button>
                <button class="btn btn-warning" onclick="ui.handleTavernRest()">🍺 酒馆休息</button>
                <button class="btn btn-secondary" onclick="ui.handleRepair()">🔧 修理车辆</button>
                <button class="btn btn-secondary" onclick="ui.handleRefuel()">⛽ 加满燃油</button>
                <button class="btn btn-accent" onclick="ui.handleSave()">💾 存档</button>
                <button class="btn btn-accent" onclick="ui.showPanel('map')">🗺️ 查看地图 / 出发</button>
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

    handleSave() {
        if (this.game.saveGame()) {
            this.showToast('游戏已保存', 'success');
        } else {
            this.showToast('保存失败', 'error');
        }
    }

    // ========== 地图界面 ==========
    renderMap() {
        const canvas = this.mapCanvas;
        const ctx = this.mapCtx;
        if (!canvas || !ctx) return;
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const w = canvas.width, h = canvas.height;
        const zoom = this.mapZoom, panX = this.mapPanX, panY = this.mapPanY;
        ctx.fillStyle = '#1a1a0e';
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);
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
        const scaleX = w / 900;
        const scaleY = h / 500;
        const baseOffX = (w / zoom - w) / 2;
        const baseOffY = (h / zoom - h) / 2;

        // 绘制路线
        for (const route of map.routes) {
            const from = map.towns[route.from];
            const to = map.towns[route.to];
            const fx = from.x * scaleX + baseOffX, fy = from.y * scaleY + baseOffY;
            const tx = to.x * scaleX + baseOffX, ty = to.y * scaleY + baseOffY;
            const danger = route.danger;
            const r = Math.round(100 + danger * 155);
            const g2 = Math.round(150 - danger * 100);
            ctx.strokeStyle = route.radiation > 0 ? `rgba(100, 255, 100, 0.4)` : `rgba(${r}, ${g2}, 50, 0.5)`;
            ctx.lineWidth = route.radiation > 0 ? 3 : 2;
            ctx.setLineDash(route.radiation > 0 ? [5, 5] : []);
            ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
            ctx.setLineDash([]);
            const mx = (fx + tx) / 2, my = (fy + ty) / 2;
            ctx.fillStyle = '#b0a880';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${route.distance}km ⛽${route.fuelCost}${route.radiation > 0 ? ' ☢' : ''}`, mx, my - 5);
        }

        // 绘制城镇
        for (const town of map.towns) {
            const x = town.x * scaleX + baseOffX, y = town.y * scaleY + baseOffY;
            const typeData = TOWN_TYPES[town.type];
            const isCurrent = this.game.currentTown?.id === town.id;
            const nodeR = isCurrent ? 14 : 10;
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
            ctx.fillStyle = isCurrent ? '#fff' : '#ccc';
            ctx.font = isCurrent ? 'bold 13px sans-serif' : '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(town.name, x, y - 18);
            ctx.fillStyle = typeData.color + '99';
            ctx.font = '9px sans-serif';
            ctx.fillText(typeData.name, x, y + 26);
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
                (tp.route.to === tp.targetId ? tp.route.from : tp.route.to) : tp.route.from];
            const to = map.towns[tp.targetId];
            const progress = tp.currentSegment / tp.totalSegments;
            const px = (from.x + (to.x - from.x) * progress) * scaleX + baseOffX;
            const py = (from.y + (to.y - from.y) * progress) * scaleY + baseOffY;
            ctx.fillStyle = '#ff0';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🚛', px, py + 7);
        }

        ctx.restore();

        const zoomLabel = document.getElementById('zoom-label');
        if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
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
            ${routes.map((r, i) => {
                const dangerClass = r.danger > 0.5 ? 'danger' : (r.danger > 0.3 ? 'warning' : '');
                const radiationLabel = r.radiation > 0 ? `<span class="radiation">☢️ 辐射${r.radiation}</span>` : '';
                return `
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
                        <span class="${dangerClass}">⚠️ ${Math.round(r.danger * 100)}%</span>
                        ${radiationLabel}
                    </div>
                    <div class="route-events">
                        <span class="dim" title="预计遭遇次数">⚠️ 预计遭遇~${r.expectedEvents}次</span>
                    </div>
                </div>
            `}).join('')}
            ${this.selectedRoute >= 0 ? `
                <button class="btn btn-accent btn-full" onclick="ui.handleDepart()">
                    🚛 出发！
                </button>
            ` : '<p class="dim">选择一条路线出发</p>'}
        `;
    }

    selectRoute(index) {
        this.selectedRoute = index;
        audio.click();
        this.renderRoutePanel();
    }

    // ========== 旅行界面 ==========
    renderTravel() {
        const content = document.getElementById('travel-content');
        if (!content) return;
        const tp = this.game.travelProgress;
        if (!tp) { content.innerHTML = '<p>旅行已结束</p>'; return; }
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

        // 强盗事件特殊UI：战术选择
        if (event.key === 'bandit') {
            content.innerHTML = `
                <div class="event-card">
                    <div class="event-icon">${event.icon}</div>
                    <h2>${event.name}</h2>
                    <p class="event-desc">${event.desc}</p>
                    <div class="tactic-info">
                        <h4>🎯 选择战术</h4>
                        <div class="tactic-grid">
                            <button class="btn btn-choice tactic-btn ${this.pendingTactic === 0 ? 'active' : ''}" onclick="ui.selectTactic(0)">
                                <span class="tactic-name">⚔️ 全力攻击</span>
                                <span class="tactic-desc">伤害+50%，受伤+50%，高风险高回报</span>
                            </button>
                            <button class="btn btn-choice tactic-btn ${this.pendingTactic === 1 ? 'active' : ''}" onclick="ui.selectTactic(1)">
                                <span class="tactic-name">🛡️ 防守</span>
                                <span class="tactic-desc">伤害-30%，受伤-60%，稳定胜率+15%</span>
                            </button>
                            <button class="btn btn-choice tactic-btn ${this.pendingTactic === 2 ? 'active' : ''}" onclick="ui.selectTactic(2)">
                                <span class="tactic-name">🎯 精准打击</span>
                                <span class="tactic-desc">随机波动大，胜利时敌方损失更多</span>
                            </button>
                        </div>
                    </div>
                    <div class="event-choices">
                        <button class="btn btn-danger" onclick="ui.handleEventChoice(0)">⚔️ 战斗（当前：${['全力攻击','防守','精准打击'][this.pendingTactic]}）</button>
                        <button class="btn btn-warning" onclick="ui.handleEventChoice(1)">💰 贿赂</button>
                        <button class="btn btn-secondary" onclick="ui.handleEventChoice(2)">🏃 逃跑</button>
                    </div>
                </div>
            `;
            return;
        }

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

    selectTactic(tactic) {
        this.pendingTactic = tactic;
        audio.click();
        this.renderEvent();
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
                                ${mod ? `<span class="mod-rarity" style="color:${RARITY_COLORS[mod.rarity]}">[${RARITY_NAMES[mod.rarity]}]</span>` : ''}
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
                            ` : `<div class="mod-empty">空槽位</div>`}
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
            ` : '<p class="dim">📍 到达城镇后可在当地商店购买零件</p>'}
            ${this.game.currentTown ? `
                <div class="found-mod">
                    <h3>拾取的零件</h3>
                    <div class="shop-mod-card">
                        <span class="mod-name" style="color:${RARITY_COLORS[MODIFICATIONS[this.foundMod].rarity]}">${MODIFICATIONS[this.foundMod].name}</span>
                        <button class="btn btn-sm btn-accent" onclick="ui.handleInstallFoundMod()">安装</button>
                    </div>
                </div>
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

    // ========== 交易界面（v3.0 增强：货物质量+派系折扣） ==========
    renderTrade() {
        const content = document.getElementById('trade-content');
        if (!content) return;
        const town = this.game.currentTown;
        if (!town) {
            content.innerHTML = '<p class="dim">旅途中无法交易，请先到达一个城镇。</p>';
            return;
        }
        const cargo = this.game.vehicle.cargo;
        const stats = this.game.getVehicleStats();
        const usedSpace = this.game.getUsedCargoSpace();
        const factionId = town.faction || this.game._getTownFaction(town);
        const repLevel = this.game._getRepLevel(factionId);

        content.innerHTML = `
            <h2>🏪 ${town.name} 市场</h2>
            <div class="trade-info">
                <span>💰 ${this.game.money} 瓶盖</span>
                <span>📦 ${usedSpace}/${stats.cargoSpace} 货舱</span>
                ${factionId ? `<span class="faction-discount" style="color:${FACTIONS[factionId]?.color}">${FACTIONS[factionId]?.icon} ${FACTIONS[factionId]?.shortName} ${repLevel.priceMult < 1 ? `折扣-${Math.round((1-repLevel.priceMult)*100)}%` : '正常'}</span>` : ''}
            </div>
            <div class="trade-sections">
                <div class="trade-section">
                    <h3>可购买</h3>
                    ${Object.entries(town.goods).map(([key, good]) => {
                        const lastBuy = this.game.getLastBuyPrice(town.id, key);
                        const lastBuyInfo = lastBuy ? `<span class="last-buy">上次购入: ${lastBuy.cost}💰</span>` : '';
                        const displayPrice = Math.round(good.buyPrice * repLevel.priceMult);
                        const discountNote = repLevel.priceMult < 1 ? `<span class="discount-badge">-${Math.round((1-repLevel.priceMult)*100)}%</span>` : '';
                        return `
                        <div class="trade-item">
                            <div class="item-info">
                                <span>${GOODS[key]?.icon} ${GOODS[key]?.name}</span>
                                <span class="stock">库存: ${good.stock}</span>
                                ${lastBuyInfo}
                            </div>
                            <div class="item-actions">
                                <span class="price buy-price">买 ${displayPrice}💰${discountNote}</span>
                                <button class="btn btn-xs" onclick="ui.handleBuy('${key}', 1)"
                                    ${good.stock <= 0 || this.game.money < displayPrice ? 'disabled' : ''}>+1</button>
                                <button class="btn btn-xs" onclick="ui.handleBuy('${key}', 5)"
                                    ${good.stock < 5 || this.game.money < displayPrice * 5 ? 'disabled' : ''}>+5</button>
                            </div>
                        </div>
                    `}).join('')}
                </div>
                <div class="trade-section">
                    <h3>你的货物</h3>
                    ${Object.keys(cargo).length === 0 ? '<p class="dim">货舱空空如也</p>' :
                        Object.entries(cargo).filter(([_, data]) => {
                            const amt = typeof data === 'object' ? data.amount : data;
                            return amt > 0;
                        }).map(([key, data]) => {
                            const amount = typeof data === 'object' ? data.amount : data;
                            const qualityData = typeof data === 'object' ? data : null;
                            const sellPrice = town.goods[key]?.sellPrice ||
                                Math.round(GOODS[key].basePrice * town.priceModifier * 0.5);
                            const lastBuy = this.game.getLastBuyPrice(town.id, key);
                            const profitInfo = lastBuy ? `<span class="trade-profit ${(sellPrice * amount - lastBuy.cost) > 0 ? 'profit' : 'loss'}">预期${sellPrice * amount - lastBuy.cost > 0 ? '+' : ''}${sellPrice * amount - lastBuy.cost}💰</span>` : '';
                            const qualityBadge = qualityData ? `<span class="quality-badge" style="color:${this.game._getQualityLevel(qualityData.quality).color}">${this.game._getQualityLevel(qualityData.quality).icon} ${this.game._getQualityLevel(qualityData.quality).name}</span>` : '';
                            return `
                                <div class="trade-item">
                                    <div class="item-info">
                                        <span>${GOODS[key]?.icon} ${GOODS[key]?.name} ×${amount}</span>
                                        ${qualityBadge}
                                        ${profitInfo}
                                    </div>
                                    <div class="item-actions">
                                        <span class="price sell-price">卖 ${Math.round(sellPrice * repLevel.priceMult)}💰</span>
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

    // ========== 乘员界面（v3.0 增强：羁绊显示） ==========
    renderCrew() {
        const content = document.getElementById('crew-content');
        if (!content) return;
        content.innerHTML = `
            <h2>👥 乘员管理</h2>
            <div class="crew-list">
                ${this.game.crew.map(member => {
                    const expNeeded = this.game.getExpNeeded(member.level);
                    const expPct = Math.round((member.exp / expNeeded) * 100);
                    const bondData = this.game.getCrewBond(member.id);
                    const storyData = CREW_STORIES[member.role];
                    const maxBondLevel = Math.max(0, ...Object.values(bondData.bonds || {}));
                    const bondStage = this.game.getBondStage(maxBondLevel);
                    const hasStory = storyData && member.id !== 'crew_starter';
                    return `
                    <div class="crew-member-card ${member.sick ? 'sick' : ''} ${member.health <= 0 ? 'dead' : ''}">
                        <div class="crew-header">
                            <span class="crew-icon">${CREW_ROLES[member.role].icon}</span>
                            <span class="crew-name">${member.name}</span>
                            <span class="crew-role">${CREW_ROLES[member.role].name} Lv.${member.level}</span>
                            ${member.sick ? '<span class="crew-status sick">🤢 生病</span>' : ''}
                            ${maxBondLevel >= 1 ? `<span class="bond-badge" style="color:${bondStage.color}" title="羁绊：${bondStage.name}">💫 ${bondStage.name}</span>` : ''}
                            ${hasStory ? `<span class="story-available" title="${storyData.title}">📖</span>` : ''}
                        </div>
                        <div class="crew-bars">
                            <div class="bar-container" title="生命值">
                                <span class="bar-label">❤️</span>
                                <div class="bar"><div class="bar-fill health" style="width:${member.health}%"></div></div>
                                <span class="bar-value">${member.health}/${member.maxHealth}</span>
                            </div>
                            <div class="bar-container" title="理智值">
                                <span class="bar-label">🧠</span>
                                <div class="bar"><div class="bar-fill sanity" style="width:${member.sanity}%"></div></div>
                                <span class="bar-value">${member.sanity}/${member.maxSanity}</span>
                            </div>
                            <div class="bar-container exp-bar" title="经验值">
                                <span class="bar-label">⭐</span>
                                <div class="bar"><div class="bar-fill exp-fill" style="width:${expPct}%"></div></div>
                                <span class="bar-value">${member.exp}/${expNeeded}</span>
                            </div>
                        </div>
                        ${maxBondLevel >= 1 ? `
                            <div class="crew-bonds">
                                <span class="dim">羁绊等级：</span>
                                ${BOND_STAGES.slice(1).map((s, i) =>
                                    `<span class="bond-level ${maxBondLevel > i ? 'active' : ''}" style="color:${s.color}">${s.name}</span>`
                                ).join(' → ')}
                                <span class="bond-desc dim">${bondStage.desc}</span>
                            </div>
                        ` : ''}
                        <div class="crew-desc">${CREW_ROLES[member.role].desc}</div>
                        ${member.id !== 'crew_starter' ? `
                            <button class="btn btn-sm btn-danger" onclick="ui.handleFireCrew('${member.id}')">解雇</button>
                        ` : ''}
                    </div>
                `}).join('')}
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
                                    ${unlocked && a.reward ? `<div class="ach-reward">奖励: ${this.getRewardText(a.reward)}</div>` : ''}
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
        for (const ach of pending) this.showAchievementNotification(ach);
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

    // ========== 派系面板（v3.0） ==========
    renderFactions() {
        const content = document.getElementById('factions-content');
        if (!content) return;
        const allRep = this.game.getAllFactionRep();
        content.innerHTML = `
            <h2>🏛️ 废土派系</h2>
            <div class="factions-grid">
                ${Object.entries(FACTIONS).map(([fid, faction]) => {
                    const rep = allRep[fid] ?? 0;
                    const level = FACTION_REP_LEVELS.find(l => l.level === rep) || FACTION_REP_LEVELS[2];
                    const completed = this.game.completedMissions[fid]?.size || 0;
                    const total = FACTION_MISSIONS[fid]?.length || 0;
                    const missions = this.game.getAvailableMissions(fid);
                    return `
                    <div class="faction-card" style="border-color:${faction.color}22;background:${faction.bgColor}">
                        <div class="faction-header" style="color:${faction.color}">
                            <span class="faction-icon">${faction.icon}</span>
                            <span class="faction-name">${faction.name}</span>
                        </div>
                        <div class="faction-rep-display">
                            <span class="faction-rep-label">声望：</span>
                            <span class="faction-rep-level" style="color:${level.color}">${level.name}</span>
                            <span class="faction-rep-value">(${rep > 0 ? '+' : ''}${rep})</span>
                        </div>
                        <div class="faction-effects">
                            <span>价格：${level.priceMult < 1 ? `<span class="success">-${Math.round((1-level.priceMult)*100)}%</span>` : level.priceMult > 1 ? `<span class="danger">+${Math.round((level.priceMult-1)*100)}%</span>` : '正常'}</span>
                            <span>通行：${level.canTrade ? '✅ 可交易' : '❌ 禁止'}</span>
                        </div>
                        <div class="faction-desc">${faction.desc}</div>
                        <div class="faction-goals">🎯 ${faction.goals}</div>
                        <div class="faction-missions">
                            <span class="dim">任务链：${completed}/${total} 完成</span>
                            ${missions.length > 0 ? `<button class="btn btn-sm btn-accent" onclick="ui.showPanel('missions');ui.selectFactionMission('${fid}')">查看任务</button>` : ''}
                        </div>
                    </div>
                `}).join('')}
            </div>
            <div class="faction-relations">
                <h3>🤝 派系关系</h3>
                <div class="relations-note">派系关系影响你的行为对他方的影响程度。</div>
            </div>
        `;
    }

    // ========== 任务面板（v3.0） ==========
    renderMissions() {
        const content = document.getElementById('missions-content');
        if (!content) return;
        const selectedFid = this.selectedFaction || Object.keys(FACTIONS)[0];
        const faction = FACTIONS[selectedFid];
        const missions = this.game.getAvailableMissions(selectedFid);
        const currentNodes = this.game.getCurrentMissionNode(selectedFid);
        content.innerHTML = `
            <h2>📜 ${faction.icon} ${faction.name} 任务</h2>
            <div class="faction-tabs">
                ${Object.entries(FACTIONS).map(([fid, f]) => `
                    <button class="ach-tab ${selectedFid === fid ? 'active' : ''}"
                            onclick="ui.selectFactionMission('${fid}')"
                            style="border-color:${f.color}">
                        ${f.icon} ${f.shortName}
                    </button>
                `).join('')}
            </div>
            <div class="missions-list">
                ${Object.keys(currentNodes).length > 0 ? `
                    <h3>进行中</h3>
                    ${Object.entries(currentNodes).map(([mid, node]) => `
                        <div class="mission-card active">
                            <div class="mission-header">
                                <span class="mission-name">${node.missionName}</span>
                                <span class="mission-progress">进度 ${node.progress}</span>
                            </div>
                            <div class="mission-node">
                                <span class="mission-node-desc">${node.desc}</span>
                                ${node.flavor ? `<div class="mission-flavor">"${node.flavor}"</div>` : ''}
                                ${node.action ? `<span class="mission-action-badge">${this.getMissionActionLabel(node.action)}</span>` : ''}
                                ${node.reward?.factionMod ? `<span class="reward-badge">🎁 派系改装</span>` : ''}
                                ${node.reward?.zeroFragment ? `<span class="reward-badge fragment">🔮 零点碎片</span>` : ''}
                                <div class="mission-actions">
                                    ${this.getMissionActionButton(node, selectedFid, mid)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                ` : ''}
                <h3>可接取任务</h3>
                ${missions.filter(m => m.currentNode === 0).length === 0 ? '<p class="dim">暂无可接取任务（完成进行中或全部完成）</p>' :
                    missions.filter(m => m.currentNode === 0).map(m => `
                        <div class="mission-card available">
                            <div class="mission-header">
                                <span class="mission-name">${m.name}</span>
                            </div>
                            <div class="mission-desc">${m.desc}</div>
                            <button class="btn btn-primary btn-sm" onclick="ui.startMission('${selectedFid}','${m.id}')">
                                接取任务
                            </button>
                        </div>
                    `).join('')
                }
            </div>
        `;
    }

    selectFactionMission(factionId) {
        this.selectedFaction = factionId;
        this.renderMissions();
    }

    getMissionActionLabel(action) {
        const labels = { travel: '🗺️ 探索旅行', deliver: '📦 货物运送', combat: '⚔️ 战斗', explore: '🔍 废墟探索', escort: '🤝 护送', stealth: '🌫️ 潜行', event: '🎭 事件', radiation: '☢️ 辐射考验', build: '🏗️ 建设', story: '📖 剧情', choice: '⚖️ 抉择', condition: '📋 条件', finale: '⚡ 终局' };
        return labels[action] || action;
    }

    getMissionActionButton(node, factionId, missionId) {
        const action = node.action;
        if (action === 'story' || action === 'choice' || action === 'finale') {
            return `<button class="btn btn-accent btn-sm" onclick="ui.advanceMission('${factionId}','${missionId}')">执行</button>`;
        }
        if (action === 'condition') {
            const canComplete = this.game.zeroFragments.length >= 5;
            return canComplete
                ? `<button class="btn btn-accent btn-sm" onclick="ui.advanceMission('${factionId}','${missionId}')">前往零点</button>`
                : `<span class="dim">需要收集至少5块零点碎片（当前${this.game.zeroFragments.length}块）</span>`;
        }
        if (this.game.currentTown) {
            return `<button class="btn btn-primary btn-sm" onclick="ui.startMissionTravel('${factionId}','${missionId}')">前往目标</button>`;
        }
        return `<span class="dim">前往${node.targetType || '目的地'}类型的城镇</span>`;
    }

    startMission(factionId, missionId) {
        this.game.startMission(factionId, missionId);
        this.selectedFaction = factionId;
        this.renderMissions();
    }

    advanceMission(factionId, missionId) {
        this.game.advanceMission(factionId, missionId);
        this.selectedFaction = factionId;
        this.renderMissions();
        this.checkAndShowAchievementNotifications();
    }

    startMissionTravel(factionId, missionId) {
        // 切换到地图并高亮目标
        this.showPanel('map');
        this.showToast('请选择路线前往任务目标区域', 'info');
    }

    // ========== 零点碎片面板（v3.0） ==========
    renderFragments() {
        const content = document.getElementById('fragments-content');
        if (!content) return;
        const collected = new Set(this.game.zeroFragments);
        content.innerHTML = `
            <h2>🔮 零点碎片</h2>
            <div class="fragments-progress">
                <span class="fragments-count">已收集 ${collected.size}/7</span>
                <div class="fragments-progress-bar">
                    <div class="fragments-progress-fill" style="width:${(collected.size/7)*100}%"></div>
                </div>
            </div>
            ${collected.size >= 7 ? `
                <div class="zero-ending-notice">
                    <span>⚡ 所有碎片已收集！零点设施入口已显现。</span>
                    <button class="btn btn-accent" onclick="ui.triggerTrueEnding()">进入零点</button>
                </div>
            ` : `<p class="dim">收集全部7块碎片以解开大寂静的真相...</p>`}
            <div class="fragments-grid">
                ${ZERO_FRAGMENTS.map(f => {
                    const isCollected = collected.has(f.id);
                    return `
                    <div class="fragment-card ${isCollected ? 'collected' : 'locked'}">
                        <div class="fragment-icon">${isCollected ? '🔮' : '❓'}</div>
                        <div class="fragment-index">#${f.index}</div>
                        <div class="fragment-name">${isCollected ? f.name : '???'}</div>
                        ${isCollected ? `
                            <div class="fragment-hint">📍 ${f.locationHint}</div>
                            <div class="fragment-lore">${f.lore.replace(/\n/g, '<br>')}</div>
                        ` : '<div class="fragment-lore dim">继续探索以发现...</div>'}
                    </div>
                `}).join('')}
            </div>
        `;
    }

    triggerTrueEnding() {
        this.game.triggerEnding('zero_seeker');
        this.showVictory();
    }

    // ========== 收藏册面板（v3.0 修正版） ==========
    renderCollectibles() {
        const content = document.getElementById('collectibles-content');
        if (!content) return;
        const collected = new Set(this.game.collectibles);
        const showCategory = this._collCat || 'all';
        const allItems = [
            ...COLLECTIBLES.old_world_records.map(i => ({ ...i, _cat: 'records' })),
            ...COLLECTIBLES.faction_badges.map(i => ({ ...i, _cat: 'badges' })),
            ...COLLECTIBLES.special_items.map(i => ({ ...i, _cat: 'items' }))
        ];
        const filtered = showCategory === 'all' ? allItems : allItems.filter(i => i._cat === showCategory);
        const total = allItems.length;
        content.innerHTML = `
            <h2>🗃️ 收藏册</h2>
            <div class="collectibles-progress">
                <span class="coll-count">已收集 ${collected.size}/${total}</span>
            </div>
            <div class="ach-tabs">
                <button class="ach-tab ${showCategory === 'all' ? 'active' : ''}" onclick="ui.selectCollectibleCat('all')">全部</button>
                <button class="ach-tab ${showCategory === 'records' ? 'active' : ''}" onclick="ui.selectCollectibleCat('records')">📜 旧世界记录</button>
                <button class="ach-tab ${showCategory === 'badges' ? 'active' : ''}" onclick="ui.selectCollectibleCat('badges')">🏛️ 派系徽章</button>
                <button class="ach-tab ${showCategory === 'items' ? 'active' : ''}" onclick="ui.selectCollectibleCat('items')">💎 特殊物品</button>
            </div>
            <div class="collectibles-grid">
                ${filtered.map(item => {
                    const isCollected = collected.has(item.id);
                    const rarityStars = '⭐'.repeat(item.rarity || 1);
                    return `
                        <div class="collectible-card ${isCollected ? 'collected' : 'locked'}">
                            <div class="coll-icon">${isCollected ? '📜' : '❓'}</div>
                            <div class="coll-name">${isCollected ? item.name : '???'}</div>
                            <div class="coll-rarity">${rarityStars}</div>
                            ${isCollected ? `<div class="coll-desc">${item.desc}</div>` : '<div class="coll-desc dim">???</div>'}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    selectCollectibleCat(cat) {
        this._collCat = cat;
        this.renderCollectibles();
    }

    // ========== 游戏结束/胜利（v3.0 增强） ==========
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
                    <button class="btn btn-accent btn-full" onclick="ui.game.deleteSave();location.reload()">
                        🔄 重新开始
                    </button>
                </div>
            </div>
        `;
    }

    showVictory() {
        const content = document.getElementById('main-content');
        if (!content) return;
        const ending = this.game.endingTriggered ? ENDINGS[this.game.endingTriggered] : null;
        const score = this.game.getScore();
        content.innerHTML = `
            <div class="panel active" style="display:flex">
                <div class="victory-screen">
                    <h1 style="color:${ending?.color || '#f0c040'}">🎉 ${ending?.name || '任务完成！'}</h1>
                    ${ending ? `<p class="ending-desc">${ending.desc}<br><span class="dim">"${ending.flavor}"</span></p>` : '<p>你成功完成了所有主要订单，成为废土上最可靠的快递员！</p>'}
                    <div class="final-stats">
                        <h3>最终统计</h3>
                        <div>📏 行驶距离: ${Math.round(this.game.stats.distanceTraveled)} km</div>
                        <div>📋 完成订单: ${this.game.completedOrders}</div>
                        <div>⚔️ 战斗胜利: ${this.game.stats.combatsWon}</div>
                        <div>💰 总收入: ${this.game.stats.moneyEarned}</div>
                        <div>⏱️ 总回合数: ${this.game.turn}</div>
                        <div>💰 最终资金: ${this.game.money}</div>
                        <div>🏛️ 派系声望: ${Object.entries(this.game.factionRep).map(([fid,r]) => `${FACTIONS[fid]?.icon}${r>0?'+':''}${r}`).join(' ')}</div>
                        <div>🔮 零点碎片: ${this.game.zeroFragments.length}/7</div>
                        <div>🏆 解锁成就: ${Object.keys(this.game.achievements).length}/${Object.keys(ACHIEVEMENTS).length}</div>
                        <div>🗃️ 收藏品: ${this.game.collectibles.length}</div>
                        <div>⭐ 最终分数: ${score}</div>
                    </div>
                    <button class="btn btn-accent btn-full" onclick="ui.game.deleteSave();location.reload()">
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
        if (result.error) { this.showToast(result.error, 'error'); return; }
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
                this.pendingTactic = 0; // 重置战术
                this.showPanel('event');
                break;
            case 'arrive':
                this.showPanel('town');
                if (result.completedOrders?.length > 0) this.showToast(`完成${result.completedOrders.length}个订单！`, 'success');
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
        const results = this.game.resolveEvent(
            this.pendingEvent.key,
            choiceIndex,
            this.pendingTactic // 传递战术
        );
        const foundResult = results.find(r => r.foundMod);
        if (foundResult) this.foundMod = foundResult.foundMod;
        this.pendingEvent = null;
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
        if (this.game.state === 'gameover') { this.showGameOver(); return; }
        if (this.game.state === 'victory') { this.showVictory(); return; }
        if (this.game.travelProgress) {
            const tp = this.game.travelProgress;
            if (tp.currentSegment >= tp.totalSegments) {
                const result = this.game.arriveAtTown(tp.targetId);
                this.handleTravelResult(result);
            } else this.showPanel('travel');
        } else this.showPanel('town');
    }

    handleBuy(goodKey, amount) {
        const result = this.game.buyGoods(goodKey, amount);
        this.showToast(result.msg, result.success ? 'success' : 'error');
        this.refresh();
    }

    handleSell(goodKey, amount) {
        const result = this.game.sellGoods(goodKey, amount);
        this.showToast(result.msg, result.success ? 'success' : 'error');
        this.refresh();
    }

    handleBuyMod(modKey) {
        const result = this.game.buyMod(modKey);
        this.showToast(result.msg, result.success ? 'success' : 'error');
        this.refresh();
    }

    handleUninstallMod(slot) {
        this.game.uninstallMod(slot);
        this.showToast('已卸下零件', 'success');
        this.refresh();
    }

    handleInstallFoundMod() {
        if (!this.foundMod) return;
        this.game.installMod(MODIFICATIONS[this.foundMod].type, this.foundMod);
        this.foundMod = null;
        this.showToast('已安装拾取的零件', 'success');
        this.refresh();
    }

    handleAcceptOrder(orderId) {
        if (this.game.acceptOrder(orderId)) this.showToast('订单已接取', 'success');
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
        if (this.game.fireCrew(memberId)) this.showToast('已解雇', 'success');
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
    // 显式挂到 window，确保 inline onclick 能访问
    window.game = game;
    window.ui = ui;
    ui.init();
});
