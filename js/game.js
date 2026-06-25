// ============================================================
// 废土快递 - 核心游戏引擎 v2.0
// 新增：存档系统、乘员成长、战术战斗、辐射预览、交易参考价、路线遭遇次数、Web Audio音效
// ============================================================

// ============================================================
// 音效管理器（Web Audio API 合成，无需外部文件）
// ============================================================
class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.masterVolume = 0.4;
        this._initialized = false;
    }

    _init() {
        if (this._initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._initialized = true;
        } catch (e) {
            this.enabled = false;
        }
    }

    _play(type, freq, duration, volume = 1, type2 = 'sine') {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = type2;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(this.masterVolume * volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { /* silent fail */ }
    }

    engine() { this._play('sawtooth', 80, 0.3, 0.3); }
    horn() { this._play('square', 220, 0.2, 0.5); }
    coin() {
        this._play('sine', 880, 0.08, 0.4);
        setTimeout(() => this._play('sine', 1320, 0.1, 0.3), 80);
    }
    explosion() {
        for (let i = 0; i < 4; i++) {
            setTimeout(() => this._play('sawtooth', 60 + Math.random() * 80, 0.25, 0.7, 'square'), i * 50);
        }
    }
    click() { this._play('sine', 600, 0.05, 0.2); }
    success() {
        this._play('sine', 523, 0.1, 0.4);
        setTimeout(() => this._play('sine', 659, 0.1, 0.4), 100);
        setTimeout(() => this._play('sine', 784, 0.15, 0.4), 200);
    }
    failure() {
        this._play('sine', 300, 0.15, 0.5);
        setTimeout(() => this._play('sine', 200, 0.2, 0.4), 150);
    }
    upgrade() {
        this._play('sine', 440, 0.08, 0.4);
        setTimeout(() => this._play('sine', 660, 0.08, 0.4), 80);
        setTimeout(() => this._play('sine', 880, 0.12, 0.4), 160);
    }
    event() {
        this._play('triangle', 400, 0.3, 0.5);
        setTimeout(() => this._play('triangle', 600, 0.3, 0.4), 200);
    }
    radiation() {
        for (let i = 0; i < 6; i++) {
            setTimeout(() => this._play('sine', 200 + Math.random() * 300, 0.1, 0.3), i * 100);
        }
    }
    tavern() {
        this._play('sine', 220, 0.15, 0.3);
        setTimeout(() => this._play('sine', 277, 0.15, 0.3), 150);
        setTimeout(() => this._play('sine', 330, 0.2, 0.3), 300);
    }
    trade() { this._play('triangle', 700, 0.1, 0.3); }
}

const audio = new AudioManager();

class Game {
    constructor() {
        this.state = 'menu'; // menu, playing, event, gameover, victory
        this.mode = 'standard'; // standard, speed
        this.turn = 0;
        this.completedOrders = 0;
        this.requiredOrders = 3;
        this.map = null;
        this.vehicle = null;
        this.crew = [];
        this.money = 200;
        this.oldWorldCurrency = 0;
        this.currentTown = null;
        this.activeOrders = [];
        this.availableOrders = [];
        this.travelProgress = null;
        this.activeSetBonuses = [];
        this.log = [];
        this.stats = {
            distanceTraveled: 0, eventsHandled: 0, combatsWon: 0, moneyEarned: 0,
            ordersCompleted: 0, totalTradeProfit: 0, merchantTrades: 0,
            oldCoinsCollected: 0, modsInstalled: 0, totalRepairs: 0,
            banditsDefeated: 0, consecutivePeaceful: 0, consecutiveFights: 0,
            totalBribeSpent: 0, flawlessVictories: 0,
            radiationSurvived: 0, consecutiveGoodEvents: 0,
            survivorsHelped: 0, vehiclesSearched: 0, breakdownsFixed: 0,
            eventTypesSeen: {}, crewRecruited: 0, crewHealed: 0,
            crewDeliveries: {}, townsVisited: new Set(),
            lastTradeRecords: {}, // { townId_goodKey: { cost, amount } }
            crewExp: {} // { crewId: exp }
        };
        this.achievements = {};
        this.pendingAchievements = [];
        this._turnsPlayed = 0;
    }

    // ========== 存档系统 ==========
    static get SAVE_KEY() { return 'wasteland_save_v2'; }

    saveGame() {
        const saveData = {
            state: this.state, mode: this.mode, turn: this.turn,
            completedOrders: this.completedOrders, requiredOrders: this.requiredOrders,
            money: this.money, oldWorldCurrency: this.oldWorldCurrency,
            vehicle: this.vehicle, crew: this.crew,
            map: this.map, currentTownId: this.currentTown?.id,
            activeOrders: this.activeOrders, availableOrders: this.availableOrders,
            travelProgress: this.travelProgress,
            activeSetBonuses: this.activeSetBonuses,
            log: this.log.slice(-50),
            stats: this._cloneStats(this.stats),
            achievements: this.achievements,
            _turnsPlayed: this._turnsPlayed
        };
        localStorage.setItem(Game.SAVE_KEY, JSON.stringify(saveData));
        return true;
    }

    loadGame() {
        const raw = localStorage.getItem(Game.SAVE_KEY);
        if (!raw) return false;
        try {
            const data = JSON.parse(raw);
            this.state = data.state || 'menu';
            this.mode = data.mode || 'standard';
            this.turn = data.turn || 0;
            this.completedOrders = data.completedOrders || 0;
            this.requiredOrders = data.requiredOrders || 3;
            this.money = data.money ?? 200;
            this.oldWorldCurrency = data.oldWorldCurrency || 0;
            this.vehicle = data.vehicle;
            this.crew = data.crew || [];
            this.map = data.map;
            this.activeOrders = data.activeOrders || [];
            this.availableOrders = data.availableOrders || [];
            this.travelProgress = data.travelProgress;
            this.activeSetBonuses = data.activeSetBonuses || [];
            this.log = data.log || [];
            this.stats = this._cloneStats(data.stats || {});
            // 确保 townsVisited 是 Set
            if (this.stats.townsVisited && !this.stats.townsVisited.add) {
                this.stats.townsVisited = new Set(this.stats.townsVisited);
            }
            this.achievements = data.achievements || {};
            this._turnsPlayed = data._turnsPlayed || 0;
            // 恢复当前城镇引用
            if (this.map && data.currentTownId !== undefined) {
                this.currentTown = this.map.towns.find(t => t.id === data.currentTownId) || null;
            }
            // 恢复乘员经验
            if (data.stats?.crewExp) {
                this.stats.crewExp = data.stats.crewExp;
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    hasSave() {
        return !!localStorage.getItem(Game.SAVE_KEY);
    }

    deleteSave() {
        localStorage.removeItem(Game.SAVE_KEY);
    }

    _cloneStats(s) {
        const clone = {};
        for (const [k, v] of Object.entries(s)) {
            if (v instanceof Set) clone[k] = new Set(v);
            else if (Array.isArray(v)) clone[k] = [...v];
            else if (typeof v === 'object' && v !== null) clone[k] = { ...v };
            else clone[k] = v;
        }
        return clone;
    }

    // ========== 初始化 ==========
    startGame(mode) {
        audio._init();
        audio.click();
        this.mode = mode;
        this.turn = 0;
        this.completedOrders = 0;
        this.requiredOrders = mode === 'speed' ? 1 : 3;
        this.money = mode === 'speed' ? 300 : 200;
        this.oldWorldCurrency = 0;
        this.activeOrders = [];
        this.availableOrders = [];
        this.log = [];
        this._turnsPlayed = 0;
        this.stats = {
            distanceTraveled: 0, eventsHandled: 0, combatsWon: 0, moneyEarned: 0,
            ordersCompleted: 0, totalTradeProfit: 0, merchantTrades: 0,
            oldCoinsCollected: 0, modsInstalled: 0, totalRepairs: 0,
            banditsDefeated: 0, consecutivePeaceful: 0, consecutiveFights: 0,
            totalBribeSpent: 0, flawlessVictories: 0,
            radiationSurvived: 0, consecutiveGoodEvents: 0,
            survivorsHelped: 0, vehiclesSearched: 0, breakdownsFixed: 0,
            eventTypesSeen: {}, crewRecruited: 0, crewHealed: 0,
            crewDeliveries: {}, townsVisited: new Set(),
            lastTradeRecords: {}, crewExp: {}
        };
        this.achievements = {};
        this.pendingAchievements = [];
        this.generateMap(mode === 'speed' ? 5 : 8);
        this.initVehicle();
        this.initCrew();
        this.currentTown = this.map.towns[0];
        this.currentTown.visited = true;
        this.stats.townsVisited.add(this.currentTown.id);
        this.generateOrders();
        this.state = 'playing';
        this.saveGame();
        this.addLog('你的货车轰鸣着启动了，废土快递之旅开始！');
        this.addLog(`当前位置：${this.currentTown.name}（${TOWN_TYPES[this.currentTown.type].name}）`);
    }

    // ========== 地图生成 ==========
    generateMap(townCount) {
        this.map = { towns: [], routes: [] };
        const usedNames = new Set();
        const padding = 80;
        const mapW = 900;
        const mapH = 500;

        for (let i = 0; i < townCount; i++) {
            let x, y, name, attempts = 0;
            do {
                x = padding + Math.random() * (mapW - padding * 2);
                y = padding + Math.random() * (mapH - padding * 2);
                attempts++;
            } while (attempts < 100 && this.map.towns.some(t =>
                Math.hypot(t.x - x, t.y - y) < 100
            ));

            do {
                name = TOWN_NAMES[Math.floor(Math.random() * TOWN_NAMES.length)];
            } while (usedNames.has(name));
            usedNames.add(name);

            const typeKeys = Object.keys(TOWN_TYPES);
            const type = typeKeys[Math.floor(Math.random() * typeKeys.length)];

            this.map.towns.push({
                id: i, name, type, x, y, visited: false,
                goods: this.generateTownGoods(type),
                mods: this.generateTownMods(type),
                availableCrew: i === 0 ? [] : this.maybeGenerateCrew(),
                priceModifier: 0.8 + Math.random() * 0.4
            });
        }

        // 最小生成树确保连通
        const connected = new Set([0]);
        const unconnected = new Set(this.map.towns.slice(1).map(t => t.id));
        while (unconnected.size > 0) {
            let bestDist = Infinity, bestA = -1, bestB = -1;
            for (const a of connected) {
                for (const b of unconnected) {
                    const ta = this.map.towns[a], tb = this.map.towns[b];
                    const d = Math.hypot(ta.x - tb.x, ta.y - tb.y);
                    if (d < bestDist) { bestDist = d; bestA = a; bestB = b; }
                }
            }
            connected.add(bestB);
            unconnected.delete(bestB);
            this.addRoute(bestA, bestB, bestDist);
        }

        // 额外快捷路线
        const extraRoutes = Math.floor(townCount * 0.4);
        for (let i = 0; i < extraRoutes; i++) {
            const a = Math.floor(Math.random() * townCount);
            let b;
            do { b = Math.floor(Math.random() * townCount); } while (b === a);
            if (!this.map.routes.some(r =>
                (r.from === a && r.to === b) || (r.from === b && r.to === a)
            )) {
                const ta = this.map.towns[a], tb = this.map.towns[b];
                const d = Math.hypot(ta.x - tb.x, ta.y - tb.y);
                if (d < 350) this.addRoute(a, b, d);
            }
        }
    }

    addRoute(a, b, dist) {
        const distance = Math.round(dist / 10);
        const danger = Math.min(0.8, 0.1 + Math.random() * 0.4 + distance * 0.005);
        const radiation = Math.random() < 0.3 ? Math.round(10 + Math.random() * 40) : 0;
        const fuelCost = Math.round(distance * (0.8 + Math.random() * 0.4));
        // 预计遭遇次数：每段可能触发一次事件
        const segments = Math.max(1, Math.floor(distance / 8));
        this.map.routes.push({ from: a, to: b, distance, fuelCost,
            danger: Math.round(danger * 100) / 100, radiation, segments });
    }

    generateTownGoods(townType) {
        const goods = {};
        const typeData = TOWN_TYPES[townType];
        const goodKeys = Object.keys(GOODS);
        const count = 3 + Math.floor(Math.random() * 4);
        const selected = this.shuffleArray([...goodKeys]).slice(0, count);
        for (const key of selected) {
            const basePrice = GOODS[key].basePrice;
            const modifier = typeData.goodsBonus * (0.7 + Math.random() * 0.6);
            goods[key] = {
                stock: Math.floor(3 + Math.random() * 10),
                buyPrice: Math.round(basePrice * modifier),
                sellPrice: Math.round(basePrice * modifier * 0.6)
            };
        }
        return goods;
    }

    generateTownMods(townType) {
        const typeData = TOWN_TYPES[townType];
        const count = Math.floor(1 + Math.random() * 3 * typeData.modBonus);
        const modKeys = Object.keys(MODIFICATIONS);
        const available = [];
        for (let i = 0; i < count; i++) {
            const key = modKeys[Math.floor(Math.random() * modKeys.length)];
            const mod = MODIFICATIONS[key];
            if (mod.rarity === 'legendary' && townType !== 'military') continue;
            if (!available.includes(key)) available.push(key);
        }
        return available;
    }

    maybeGenerateCrew() {
        if (Math.random() > 0.5) return [];
        const count = 1 + (Math.random() > 0.7 ? 1 : 0);
        const crew = [];
        for (let i = 0; i < count; i++) crew.push(this.generateCrewMember());
        return crew;
    }

    generateCrewMember() {
        const roles = Object.keys(CREW_ROLES);
        const role = roles[Math.floor(Math.random() * roles.length)];
        const name = CREW_NAMES[Math.floor(Math.random() * CREW_NAMES.length)];
        const level = 1 + Math.floor(Math.random() * 3);
        return {
            id: 'crew_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name, role, level, health: 100, maxHealth: 100,
            sanity: 100, maxSanity: 100,
            hireCost: level * 80 + Math.floor(Math.random() * 50),
            sick: false,
            exp: 0
        };
    }

    // ========== 乘员经验/升级 ==========
    addCrewExp(memberId, amount) {
        const member = this.crew.find(c => c.id === memberId);
        if (!member) return;
        member.exp = (member.exp || 0) + amount;
        const expNeeded = this.getExpNeeded(member.level);
        if (member.exp >= expNeeded && member.level < 10) {
            member.level++;
            member.exp -= expNeeded;
            member.maxHealth += 10;
            member.maxSanity += 5;
            member.health = Math.min(member.health + 10, member.maxHealth);
            member.sanity = Math.min(member.sanity + 5, member.maxSanity);
            // 升级时额外强化角色特定属性
            if (member.role === 'mechanic') member.maxHealth += 5;
            if (member.role === 'guard') member.maxHealth += 5;
            audio.upgrade();
            this.addLog(`🌟 ${member.name}升到Lv.${member.level}！`);
            this.checkAchievements();
        }
    }

    getExpNeeded(level) {
        return Math.round(50 + level * 30); // 80, 110, 140, ...
    }

    // ========== 车辆系统 ==========
    initVehicle() {
        this.vehicle = {
            name: '老伙计', durability: 100, maxDurability: 100,
            fuel: 80, maxFuel: 100,
            baseSpeed: 50, baseArmor: 5, baseCargoSpace: 10,
            mods: { cargo: null, armor: null, engine: null, radar: null, weapon: null },
            cargo: {}
        };
    }

    getVehicleStats() {
        const v = this.vehicle;
        let stats = {
            speed: v.baseSpeed, armor: v.baseArmor, cargoSpace: v.baseCargoSpace,
            combatBonus: 0, detection: 0, fuelEfficiency: 0,
            eventWarning: 0, lootBonus: 0
        };
        const setCounts = {};
        for (const slot of Object.keys(v.mods)) {
            const modKey = v.mods[slot];
            if (!modKey) continue;
            const mod = MODIFICATIONS[modKey];
            if (!mod) continue;
            for (const [stat, val] of Object.entries(mod.stats)) {
                if (stats[stat] !== undefined) stats[stat] += val;
            }
            if (mod.set) setCounts[mod.set] = (setCounts[mod.set] || 0) + 1;
        }
        for (const member of this.crew) {
            if (member.sick) continue;
            const roleData = CREW_ROLES[member.role];
            for (const [stat, val] of Object.entries(roleData.effect)) {
                if (stats[stat] !== undefined) stats[stat] += val * member.level;
            }
        }
        this.activeSetBonuses = [];
        for (const [bonusKey, bonus] of Object.entries(SET_BONUSES)) {
            const { set, count } = bonus.required;
            if ((setCounts[set] || 0) >= count) {
                this.activeSetBonuses.push(bonus);
                for (const [effect, val] of Object.entries(bonus.effect)) {
                    if (effect === 'fuelCostMult') stats.fuelEfficiency += (1 - val) * 100;
                    else if (effect === 'allStatsMult') {
                        stats.speed *= val; stats.armor *= val; stats.combatBonus *= val;
                    }
                }
            }
        }
        stats.speed = Math.max(10, Math.round(stats.speed));
        stats.armor = Math.max(0, Math.round(stats.armor));
        stats.cargoSpace = Math.max(1, Math.round(stats.cargoSpace));
        return stats;
    }

    getUsedCargoSpace() {
        let used = 0;
        for (const [key, amount] of Object.entries(this.vehicle.cargo)) {
            used += amount * (GOODS[key]?.weight || 1);
        }
        return Math.round(used * 10) / 10;
    }

    installMod(slot, modKey) {
        const mod = MODIFICATIONS[modKey] || SPECIAL_MODS[modKey];
        if (!mod || mod.type !== slot) return false;
        this.vehicle.mods[slot] = modKey;
        this.stats.modsInstalled++;
        audio.upgrade();
        this.addLog(`安装了${RARITY_NAMES[mod.rarity] || '特殊'}零件：${mod.name}`);
        this.checkAchievements();
        return true;
    }

    uninstallMod(slot) {
        const modKey = this.vehicle.mods[slot];
        if (!modKey) return null;
        this.vehicle.mods[slot] = null;
        return modKey;
    }

    // ========== 乘员系统 ==========
    initCrew() {
        this.crew = [{
            id: 'crew_starter', name: '你', role: 'driver', level: 1,
            health: 100, maxHealth: 100, sanity: 100, maxSanity: 100,
            hireCost: 0, sick: false, exp: 0
        }];
    }

    hireCrew(member) {
        if (this.money < member.hireCost) return false;
        if (this.crew.length >= 4) return false;
        this.money -= member.hireCost;
        member.exp = 0;
        this.crew.push(member);
        this.stats.crewRecruited++;
        audio.coin();
        this.addLog(`雇佣了${CREW_ROLES[member.role].name}：${member.name}（${member.level}级）`);
        this.checkAchievements();
        return true;
    }

    fireCrew(memberId) {
        if (memberId === 'crew_starter') return false;
        this.crew = this.crew.filter(c => c.id !== memberId);
        return true;
    }

    applySanityLoss(amount) {
        for (const member of this.crew) {
            let loss = amount;
            const bonus = this.activeSetBonuses.find(b => b.effect.sanityCostMult);
            if (bonus) loss *= bonus.effect.sanityCostMult;
            member.sanity = Math.max(0, member.sanity - loss);
        }
    }

    checkSanityEvents() {
        const events = [];
        for (const member of this.crew) {
            if (member.sanity <= 0) {
                events.push({ type: 'sanity_break', member,
                    message: `${member.name}的理智崩溃了！需要在酒馆休息恢复。` });
                member.sanity = 0;
            } else if (member.sanity <= 20 && Math.random() < 0.3) {
                events.push({ type: 'sanity_warning', member,
                    message: `${member.name}精神状态很差，开始出现幻觉...` });
            }
        }
        return events;
    }

    restAtTavern() {
        const cost = 20 + this.crew.length * 8; // 调低：20+8n 替代 30+10n
        if (this.money < cost) return { success: false, message: '瓶盖不够！' };
        this.money -= cost;
        const foodConsumed = Math.min(this.crew.length, this.vehicle.cargo.food || 0);
        this.vehicle.cargo.food = Math.max(0, (this.vehicle.cargo.food || 0) - foodConsumed);
        for (const member of this.crew) {
            member.sanity = Math.min(member.maxSanity, member.sanity + 50); // 40→50
            member.health = Math.min(member.maxHealth, member.health + 30);   // 20→30
            if (member.sick && Math.random() < 0.6) { // 0.5→0.6
                member.sick = false;
                this.stats.crewHealed++;
            }
        }
        // 乘员升级经验
        for (const member of this.crew) {
            this.addCrewExp(member.id, 5);
        }
        audio.tavern();
        this.addLog(`在酒馆休息，花费${cost}瓶盖。全员恢复精神和体力。`);
        this.saveGame();
        this.checkAchievements();
        return { success: true, cost, message: `花费${cost}瓶盖在酒馆休息，全员恢复。` };
    }

    // ========== 订单系统 ==========
    generateOrders() {
        this.availableOrders = [];
        const otherTowns = this.map.towns.filter(t => t.id !== this.currentTown.id);
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const target = otherTowns[Math.floor(Math.random() * otherTowns.length)];
            const cargoType = ORDER_CARGO_TYPES[Math.floor(Math.random() * ORDER_CARGO_TYPES.length)];
            const distance = this.getRouteDistance(this.currentTown.id, target.id);
            const baseReward = distance * 5 + 50;
            const dangerBonus = Math.round(baseReward * cargoType.dangerMult * 0.3);
            const amount = 2 + Math.floor(Math.random() * 5);
            this.availableOrders.push({
                id: 'order_' + Date.now() + '_' + i,
                fromTown: this.currentTown.id, toTown: target.id,
                cargoType: cargoType.name, cargoIcon: cargoType.icon,
                amount, reward: baseReward + dangerBonus,
                dangerMult: cargoType.dangerMult,
                deadline: 5 + Math.floor(distance / 10),
                turnsLeft: 5 + Math.floor(distance / 10), accepted: false
            });
        }
    }

    acceptOrder(orderId) {
        const order = this.availableOrders.find(o => o.id === orderId);
        if (!order) return false;
        order.accepted = true;
        this.activeOrders.push(order);
        this.availableOrders = this.availableOrders.filter(o => o.id !== orderId);
        audio.click();
        this.addLog(`接取订单：运送${order.cargoIcon}${order.cargoType}×${order.amount}到${this.map.towns[order.toTown].name}，报酬${order.reward}瓶盖`);
        return true;
    }

    completeOrder(orderId) {
        const idx = this.activeOrders.findIndex(o => o.id === orderId);
        if (idx === -1) return false;
        const order = this.activeOrders[idx];
        if (order.toTown !== this.currentTown.id) return false;
        this.money += order.reward;
        this.stats.moneyEarned += order.reward;
        this.stats.ordersCompleted++;
        this.completedOrders++;
        this.activeOrders.splice(idx, 1);
        audio.success();
        this.addLog(`✅ 订单完成！获得${order.reward}瓶盖！（${this.completedOrders}/${this.requiredOrders}）`);
        for (const c of this.crew) {
            this.stats.crewDeliveries[c.id] = (this.stats.crewDeliveries[c.id] || 0) + 1;
            this.addCrewExp(c.id, 15); // 乘员经验
        }
        const orderDistance = this.getRouteDistance(order.fromTown, order.toTown);
        this.checkOrderAchievements(order, orderDistance);
        this.saveGame();
        this.checkAchievements();
        if (this.completedOrders >= this.requiredOrders) {
            this.state = 'victory';
            this.addLog('🎉 恭喜！你完成了所有主要订单，成为废土上最可靠的快递员！');
            this.checkAchievements();
        }
        return true;
    }

    getRouteDistance(fromId, toId) {
        const visited = new Set();
        const queue = [[fromId, 0]];
        visited.add(fromId);
        while (queue.length > 0) {
            const [current, dist] = queue.shift();
            if (current === toId) return dist;
            for (const route of this.map.routes) {
                let neighbor = -1;
                if (route.from === current) neighbor = route.to;
                else if (route.to === current) neighbor = route.from;
                if (neighbor >= 0 && !visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push([neighbor, dist + route.distance]);
                }
            }
        }
        return 999;
    }

    // ========== 旅行系统 ==========
    getAvailableRoutes() {
        if (!this.currentTown) return [];
        return this.map.routes.filter(r =>
            r.from === this.currentTown.id || r.to === this.currentTown.id
        ).map(r => {
            const targetId = r.from === this.currentTown.id ? r.to : r.from;
            const stats = this.getVehicleStats();
            const warningBonus = stats.eventWarning / 100;
            // 计算各事件预期遭遇次数
            const banditChance = 0.3 * r.danger * (1 - warningBonus * 0.3);
            const merchantChance = 0.12;
            const radiationChance = 0.2 * (r.radiation > 0 ? 1.5 : 0.3);
            const breakdownChance = 0.15 * (1 - warningBonus * 0.3);
            const abandonedChance = 0.18;
            const survivorChance = 0.15;
            const totalChance = banditChance + merchantChance + radiationChance +
                breakdownChance + abandonedChance + survivorChance;
            const expectedEvents = Math.round(r.segments * totalChance * 10) / 10;
            return {
                ...r, targetTown: this.map.towns[targetId], targetId,
                adjustedFuelCost: this.getAdjustedFuelCost(r.fuelCost),
                banditChance, merchantChance, radiationChance,
                breakdownChance, abandonedChance, survivorChance,
                expectedEvents
            };
        });
    }

    getAdjustedFuelCost(baseCost) {
        const stats = this.getVehicleStats();
        let cost = baseCost * (1 - stats.fuelEfficiency / 100);
        return Math.max(1, Math.round(cost));
    }

    startTravel(routeIndex) {
        const routes = this.getAvailableRoutes();
        const route = routes[routeIndex];
        if (!route) return null;
        const fuelCost = route.adjustedFuelCost;
        if (this.vehicle.fuel < fuelCost) return { error: '燃油不足！' };
        audio.horn();
        this.travelProgress = {
            route, currentSegment: 0, totalSegments: route.segments || 1,
            targetId: route.targetId,
            fuelPerSegment: fuelCost / (route.segments || 1), eventsQueue: []
        };
        this.currentTown = null;
        this.addLog(`出发前往${route.targetTown.name}，路程${route.distance}，预计油耗${fuelCost}`);
        return this.advanceTravel();
    }

    advanceTravel() {
        const tp = this.travelProgress;
        if (!tp) return null;
        tp.currentSegment++;
        this.turn++;
        this._turnsPlayed++;
        this.vehicle.fuel = Math.max(0, this.vehicle.fuel - tp.fuelPerSegment);
        this.applySanityLoss(5);
        for (const order of this.activeOrders) {
            order.turnsLeft--;
            if (order.turnsLeft <= 0) {
                this.addLog(`⚠️ 订单超时：${order.cargoType}运送失败！`);
            }
        }
        this.activeOrders = this.activeOrders.filter(o => o.turnsLeft > 0);
        this.stats.distanceTraveled += tp.route.distance / tp.totalSegments;
        const sanityEvents = this.checkSanityEvents();
        for (const e of sanityEvents) this.addLog(e.message);
        if (this.vehicle.fuel <= 0) {
            this.state = 'gameover';
            audio.failure();
            this.addLog('💀 燃油耗尽，你被困在了废土之中...');
            this.saveGame();
            return { type: 'gameover', reason: '燃油耗尽' };
        }
        const event = this.checkForEvent(tp.route);
        if (event) {
            this.stats.eventsHandled++;
            audio.event();
            this.saveGame();
            return { type: 'event', event, segment: tp.currentSegment, total: tp.totalSegments };
        }
        if (tp.currentSegment >= tp.totalSegments) {
            return this.arriveAtTown(tp.targetId);
        }
        this.saveGame();
        return { type: 'travel', segment: tp.currentSegment, total: tp.totalSegments };
    }

    arriveAtTown(townId) {
        const town = this.map.towns[townId];
        this.currentTown = town;
        town.visited = true;
        this.stats.townsVisited.add(townId);
        this.travelProgress = null;
        audio.engine();
        this.generateOrders();
        const hpPct = (this.vehicle.durability / this.vehicle.maxDurability) * 100;
        if (hpPct <= 5 && hpPct > 0) this.stats._arrivedLowHp = true;
        if (this.vehicle.fuel <= 0) this.stats._arrivedNoFuel = true;
        const completable = this.activeOrders.filter(o => o.toTown === townId);
        this.addLog(`🏘️ 到达${town.name}（${TOWN_TYPES[town.type].name}）`);
        for (const order of completable) this.completeOrder(order.id);
        this.saveGame();
        this.checkAchievements();
        return { type: 'arrive', town, completedOrders: completable };
    }

    checkForEvent(route) {
        const stats = this.getVehicleStats();
        const warningBonus = stats.eventWarning / 100;
        for (const [key, eventData] of Object.entries(EVENTS)) {
            let chance = eventData.baseChance;
            if (key === 'bandit') chance *= route.danger;
            if (key === 'radiation') chance *= (route.radiation > 0 ? 1.5 : 0.3);
            if (['bandit', 'radiation', 'breakdown'].includes(key)) {
                chance *= (1 - warningBonus * 0.3);
            }
            if (Math.random() < chance) return { key, ...eventData };
        }
        return null;
    }

    // ========== 事件处理 ==========
    resolveEvent(eventKey, choiceIndex, extra) {
        const results = [];
        this.stats.eventTypesSeen[eventKey] = true;
        switch (eventKey) {
            case 'bandit':
                results.push(...this.resolveBandit(choiceIndex, extra));
                break;
            case 'merchant':
                results.push(...this.resolveMerchant(choiceIndex));
                break;
            case 'radiation':
                results.push(...this.resolveRadiation(choiceIndex));
                break;
            case 'breakdown':
                results.push(...this.resolveBreakdown(choiceIndex));
                break;
            case 'abandoned':
                results.push(...this.resolveAbandoned(choiceIndex));
                break;
            case 'survivor':
                results.push(...this.resolveSurvivor(choiceIndex));
                break;
        }
        for (const r of results) this.addLog(r.message);
        if (this.vehicle.durability <= 0) {
            this.state = 'gameover';
            audio.failure();
            results.push({ type: 'gameover', message: '💀 车辆报废，你的旅程结束了...' });
        } else if (this.crew.every(c => c.health <= 0)) {
            this.state = 'gameover';
            audio.failure();
            results.push({ type: 'gameover', message: '💀 所有乘员死亡...' });
        }
        const hasGoodResult = results.some(r => r.type === 'success' || r.type === 'legendary');
        const hasBadResult = results.some(r => r.type === 'failure' || r.type === 'gameover');
        if (hasGoodResult && !hasBadResult) this.stats.consecutiveGoodEvents++;
        else if (hasBadResult) this.stats.consecutiveGoodEvents = 0;
        this.saveGame();
        this.checkAchievements();
        return results;
    }

    // ========== 战斗系统 v2.0（战术选择） ==========
    resolveBandit(choice, tactic) {
        const stats = this.getVehicleStats();
        if (choice === 1) { // 贿赂
            const cost = Math.round(30 + Math.random() * 50);
            if (this.money >= cost) {
                this.money -= cost;
                this.stats.totalBribeSpent += cost;
                this.stats.consecutivePeaceful++;
                this.stats.consecutiveFights = 0;
                audio.trade();
                return [{ type: 'neutral', message: `💰 贿赂了强盗，花费${cost}瓶盖` }];
            } else {
                // 钱不够→强制进入战斗（战术默认"防守"）
                return this.resolveBandit(0, 1);
            }
        }
        if (choice === 2) { // 逃跑
            this.stats.consecutivePeaceful++;
            this.stats.consecutiveFights = 0;
            const escapeChance = 0.4 + stats.speed / 200;
            let bonus = 0;
            const fleeBonus = this.activeSetBonuses.find(b => b.effect.banditFleeMult);
            if (fleeBonus) bonus = 0.2;
            if (Math.random() < escapeChance + bonus) {
                audio.engine();
                return [{ type: 'neutral', message: '🏃 成功逃脱！浪费了一些时间和燃油' }];
            } else {
                const dmg = Math.round(10 + Math.random() * 20);
                this.vehicle.durability = Math.max(0, this.vehicle.durability - dmg);
                this.vehicle.fuel = Math.max(0, this.vehicle.fuel - 10);
                audio.explosion();
                return [{ type: 'failure', message: `🏃 逃跑翻车！车辆受损${dmg}点，损失燃油` }];
            }
        }
        // choice === 0: 战斗 — 战术系统
        // tactic: 0=全力攻击, 1=防守, 2=精准打击
        tactic = tactic || 0;
        const guards = this.crew.filter(c => c.role === 'guard' && !c.sick);
        const guardBonus = guards.reduce((sum, c) => sum + c.level * 15, 0);
        const playerBasePower = stats.combatBonus + stats.armor * 0.5 + guardBonus;
        let enemyPower = 20 + Math.random() * 40;
        let playerDmg = 0, enemyDmg = 0, playerWinChance = 0.5;

        switch (tactic) {
            case 0: // 全力攻击：伤害+50%，受伤害+50%，胜率不变
                playerWinChance = 0.45 + (playerBasePower / 100);
                enemyPower = enemyPower * 1.0;
                break;
            case 1: // 防守：伤害-30%，受伤害-60%，胜率+15%
                playerWinChance = 0.6 + (playerBasePower / 100) * 0.5;
                break;
            case 2: // 精准打击：敌人伤害波动大，胜率中，但大胜概率高
                playerWinChance = 0.5 + (playerBasePower / 100) * 0.6;
                enemyPower = enemyPower * (0.6 + Math.random() * 0.8);
                break;
        }

        const roll = Math.random();
        const win = roll < playerWinChance;

        if (win) {
            // 伤害计算（受战术影响）
            if (tactic === 0) { // 全力
                playerDmg = Math.round(5 + Math.random() * 15);
                enemyDmg = Math.round(30 + Math.random() * 50);
            } else if (tactic === 1) { // 防守
                playerDmg = Math.round(2 + Math.random() * 8);
                enemyDmg = Math.round(10 + Math.random() * 25);
            } else { // 精准
                playerDmg = Math.round(3 + Math.random() * 10);
                enemyDmg = Math.round(40 + Math.random() * 60);
            }
            let lootMult = 1;
            const lootBonus = this.activeSetBonuses.find(b => b.effect.lootMult);
            if (lootBonus) lootMult = lootBonus.effect.lootMult;
            const loot = Math.round((30 + Math.random() * 50) * lootMult);
            this.money += loot;
            this.stats.combatsWon++;
            this.stats.banditsDefeated++;
            this.stats.consecutivePeaceful = 0;
            this.stats.consecutiveFights++;
            if (playerDmg === 0) this.stats.flawlessVictories++;
            this.vehicle.durability = Math.max(0, this.vehicle.durability - playerDmg);
            // 乘员经验
            for (const g of guards) this.addCrewExp(g.id, 8);
            audio.explosion();
            const tacticNames = ['全力攻击', '防守', '精准打击'];
            return [{ type: 'success', message: `⚔️ ${tacticNames[tactic]}胜利！获得${loot}瓶盖，车辆受损${playerDmg}点，敌方损失${enemyDmg}点` }];
        } else {
            // 战败：敌人造成更高伤害
            enemyDmg = Math.round((15 + Math.random() * 25) * (tactic === 0 ? 1.5 : 1));
            this.vehicle.durability = Math.max(0, this.vehicle.durability - enemyDmg);
            const lostCargo = this.loseSomeCargo();
            this.crew.forEach(c => c.health = Math.max(0, c.health - Math.round(10 + Math.random() * 15)));
            audio.explosion();
            return [{ type: 'failure', message: `⚔️ 战斗失败！车辆受损${enemyDmg}点${lostCargo}，乘员受伤` }];
        }
    }

    resolveMerchant(choice) {
        switch (choice) {
            case 0: { // 交易旧世界货币
                if (this.oldWorldCurrency < 3) {
                    audio.failure();
                    return [{ type: 'failure', message: '🎭 旧世界货币不足（需要3个），商人摇头离去' }];
                }
                this.oldWorldCurrency -= 3;
                this.stats.merchantTrades++;
                const legendaryKey = LEGENDARY_POOL[Math.floor(Math.random() * LEGENDARY_POOL.length)];
                const mod = MODIFICATIONS[legendaryKey];
                const slot = mod.type;
                const oldMod = this.vehicle.mods[slot];
                // 修复：空槽位直接装，有装备时才替换
                const replaced = oldMod ? MODIFICATIONS[oldMod]?.name : null;
                this.vehicle.mods[slot] = legendaryKey;
                audio.upgrade();
                return [{
                    type: 'legendary',
                    message: `🎭 用3个旧世界货币换取了传说级零件：${mod.name}！${replaced ? `（替换了${replaced}）` : ''}`
                }];
            }
            case 1: { // 用瓶盖交易
                const cost = 100 + Math.floor(Math.random() * 100);
                if (this.money < cost) {
                    audio.failure();
                    return [{ type: 'failure', message: '🎭 瓶盖不够，商人嗤笑着消失了' }];
                }
                this.money -= cost;
                this.stats.merchantTrades++;
                const rareKeys = Object.keys(MODIFICATIONS).filter(k => MODIFICATIONS[k].rarity === 'rare');
                const modKey = rareKeys[Math.floor(Math.random() * rareKeys.length)];
                const mod = MODIFICATIONS[modKey];
                const slot = mod.type;
                const oldMod = this.vehicle.mods[slot];
                if (oldMod) {
                    const replaced = MODIFICATIONS[oldMod]?.name;
                    this.vehicle.mods[slot] = modKey;
                    audio.upgrade();
                    return [{ type: 'success', message: `🎭 花费${cost}瓶盖购买了${mod.name}（替换了${replaced}）` }];
                } else {
                    this.vehicle.mods[slot] = modKey;
                    audio.upgrade();
                    return [{ type: 'success', message: `🎭 花费${cost}瓶盖购买了${mod.name}` }];
                }
            }
            case 2:
                audio.click();
                return [{ type: 'neutral', message: '🎭 你无视了商人，继续赶路' }];
        }
        return [];
    }

    resolveRadiation(choice) {
        switch (choice) {
            case 0: { // 停车避险
                const foodCost = this.crew.length;
                const currentFood = this.vehicle.cargo.food || 0;
                if (currentFood >= foodCost) {
                    this.vehicle.cargo.food -= foodCost;
                } else {
                    this.crew.forEach(c => c.health = Math.max(0, c.health - 10));
                }
                this.turn++;
                audio.horn();
                return [{ type: 'neutral', message: `☢️ 停车避险${foodCost > currentFood ? '（食物不足，乘员饥饿受损）' : `（消耗${foodCost}份食物）`}` }];
            }
            case 1: {
                const results = [];
                for (const member of this.crew) {
                    if (Math.random() < 0.4) {
                        member.sick = true;
                        member.health = Math.max(0, member.health - 15);
                        audio.radiation();
                        results.push({ type: 'failure', message: `☢️ ${member.name}受到辐射，生病了！` });
                    }
                }
                this.vehicle.durability = Math.max(0, this.vehicle.durability - 5);
                this.stats.radiationSurvived++;
                if (results.length === 0) {
                    audio.success();
                    results.push({ type: 'success', message: '☢️ 幸运地冲过了辐射区，无人受伤' });
                }
                return results;
            }
        }
        return [];
    }

    resolveBreakdown(choice) {
        switch (choice) {
            case 0: { // 修理
                const mechanic = this.crew.find(c => c.role === 'mechanic' && !c.sick);
                const repairSkill = mechanic ? mechanic.level * 25 : 10;
                const success = Math.random() * 100 < repairSkill + 30;
                if (success) {
                    const repair = 10 + (mechanic ? mechanic.level * 10 : 0);
                    this.vehicle.durability = Math.min(this.vehicle.maxDurability,
                        this.vehicle.durability + repair);
                    this.stats.breakdownsFixed++;
                    if (mechanic) this.addCrewExp(mechanic.id, 10);
                    audio.success();
                    return [{ type: 'success', message: `🔧 修理成功！恢复${repair}点耐久` }];
                } else {
                    this.vehicle.durability = Math.max(0, this.vehicle.durability - 10);
                    audio.failure();
                    return [{ type: 'failure', message: '🔧 修理失败，情况变得更糟了（-10耐久）' }];
                }
            }
            case 1: {
                this.turn += 2;
                this.applySanityLoss(15);
                const cost = 50 + Math.floor(Math.random() * 50);
                this.money = Math.max(0, this.money - cost);
                this.vehicle.durability = Math.min(this.vehicle.maxDurability,
                    this.vehicle.durability + 20);
                audio.coin();
                return [{ type: 'neutral', message: `🚶 派人步行求援，花了很长时间和${cost}瓶盖，车辆修复了20点` }];
            }
        }
        return [];
    }

    resolveAbandoned(choice) {
        switch (choice) {
            case 0: {
                this.stats.vehiclesSearched++;
                const stats = this.getVehicleStats();
                let lootMult = 1;
                const lootBonus = this.activeSetBonuses.find(b => b.effect.lootMult);
                if (lootBonus) lootMult = lootBonus.effect.lootMult;
                if (Math.random() < 0.7) {
                    const roll = Math.random();
                    if (roll < 0.3) {
                        const caps = Math.round((20 + Math.random() * 60) * lootMult);
                        this.money += caps;
                        audio.coin();
                        return [{ type: 'success', message: `🔍 找到了${caps}瓶盖！` }];
                    } else if (roll < 0.5) {
                        const fuel = Math.round((10 + Math.random() * 20) * lootMult);
                        this.vehicle.fuel = Math.min(this.vehicle.maxFuel, this.vehicle.fuel + fuel);
                        audio.success();
                        return [{ type: 'success', message: `🔍 找到了${fuel}单位燃油！` }];
                    } else if (roll < 0.7) {
                        this.oldWorldCurrency++;
                        this.stats.oldCoinsCollected++;
                        audio.upgrade();
                        return [{ type: 'legendary', message: '🔍 找到了一枚旧世界货币！' }];
                    } else {
                        const commonMods = Object.keys(MODIFICATIONS).filter(k =>
                            MODIFICATIONS[k].rarity === 'common' || MODIFICATIONS[k].rarity === 'uncommon'
                        );
                        const modKey = commonMods[Math.floor(Math.random() * commonMods.length)];
                        const mod = MODIFICATIONS[modKey];
                        audio.success();
                        return [{ type: 'success', message: `🔍 找到了零件：${mod.name}！可在改装界面安装` },
                            { foundMod: modKey }];
                    }
                } else {
                    const dmg = Math.round(5 + Math.random() * 15);
                    this.vehicle.durability = Math.max(0, this.vehicle.durability - dmg);
                    audio.explosion();
                    return [{ type: 'failure', message: `🔍 是个陷阱！车辆受损${dmg}点` }];
                }
            }
            case 1:
                audio.click();
                return [{ type: 'neutral', message: '⚠️ 小心绕过了废弃车辆' }];
        }
        return [];
    }

    resolveSurvivor(choice) {
        switch (choice) {
            case 0: {
                this.stats.survivorsHelped++;
                const foodCost = 2;
                const currentFood = this.vehicle.cargo.food || 0;
                if (currentFood >= foodCost) this.vehicle.cargo.food -= foodCost;
                const roll = Math.random();
                if (roll < 0.4) {
                    const reward = 30 + Math.floor(Math.random() * 50);
                    this.money += reward;
                    audio.coin();
                    return [{ type: 'success', message: `🤝 幸存者感谢你的帮助，给了你${reward}瓶盖作为报答` }];
                } else if (roll < 0.6) {
                    this.oldWorldCurrency++;
                    this.stats.oldCoinsCollected++;
                    audio.upgrade();
                    return [{ type: 'legendary', message: '🤝 幸存者送给你一枚旧世界货币作为谢礼！' }];
                } else if (roll < 0.8) {
                    if (this.crew.length < 4) {
                        const newCrew = this.generateCrewMember();
                        newCrew.hireCost = 0;
                        this.crew.push(newCrew);
                        this.stats.crewRecruited++;
                        audio.upgrade();
                        return [{ type: 'success', message: `🤝 ${newCrew.name}被你的善意感动，加入了你的队伍！（${CREW_ROLES[newCrew.role].name}）` }];
                    }
                    return [{ type: 'neutral', message: '🤝 幸存者感谢你的帮助后离去' }];
                } else {
                    const stolen = Math.round(20 + Math.random() * 40);
                    this.money = Math.max(0, this.money - stolen);
                    audio.failure();
                    return [{ type: 'failure', message: `🤝 那个"幸存者"趁你不注意偷走了${stolen}瓶盖！` }];
                }
            }
            case 1:
                audio.click();
                return [{ type: 'neutral', message: '🚫 你无情地驶过，幸存者的身影在后视镜中渐渐消失' }];
        }
        return [];
    }

    loseSomeCargo() {
        const cargoKeys = Object.keys(this.vehicle.cargo).filter(k => this.vehicle.cargo[k] > 0);
        if (cargoKeys.length === 0) return '';
        const key = cargoKeys[Math.floor(Math.random() * cargoKeys.length)];
        const amount = Math.min(this.vehicle.cargo[key], 1 + Math.floor(Math.random() * 3));
        this.vehicle.cargo[key] -= amount;
        if (this.vehicle.cargo[key] <= 0) delete this.vehicle.cargo[key];
        return `，丢失了${amount}个${GOODS[key]?.name || key}`;
    }

    // ========== 交易系统 ==========
    buyGoods(goodKey, amount) {
        const town = this.currentTown;
        if (!town || !town.goods[goodKey]) return { success: false, msg: '商品不可用' };
        const good = town.goods[goodKey];
        const totalCost = good.buyPrice * amount;
        const weight = amount * (GOODS[goodKey]?.weight || 1);
        const stats = this.getVehicleStats();
        const currentUsed = this.getUsedCargoSpace();
        if (this.money < totalCost) return { success: false, msg: '瓶盖不足' };
        if (currentUsed + weight > stats.cargoSpace) return { success: false, msg: '货舱空间不足' };
        if (good.stock < amount) return { success: false, msg: '库存不足' };
        this.money -= totalCost;
        good.stock -= amount;
        this.vehicle.cargo[goodKey] = (this.vehicle.cargo[goodKey] || 0) + amount;
        const recordKey = `${town.id}_${goodKey}`;
        this.stats.lastTradeRecords[recordKey] = { cost: totalCost, amount };
        const townTradeKey = `sametown_${town.id}_${goodKey}`;
        this.stats[townTradeKey] = (this.stats[townTradeKey] || 0) + 1;
        audio.trade();
        this.saveGame();
        this.checkAchievements();
        return { success: true, msg: `购买${GOODS[goodKey].name}×${amount}，花费${totalCost}瓶盖` };
    }

    sellGoods(goodKey, amount) {
        const town = this.currentTown;
        if (!town) return { success: false, msg: '不在城镇' };
        const currentAmount = this.vehicle.cargo[goodKey] || 0;
        if (currentAmount < amount) return { success: false, msg: '数量不足' };
        const sellPrice = town.goods[goodKey]?.sellPrice ||
            Math.round(GOODS[goodKey].basePrice * town.priceModifier * 0.5);
        const totalEarned = sellPrice * amount;
        this.money += totalEarned;
        this.stats.moneyEarned += totalEarned;
        this.vehicle.cargo[goodKey] -= amount;
        if (this.vehicle.cargo[goodKey] <= 0) delete this.vehicle.cargo[goodKey];
        if (town.goods[goodKey]) town.goods[goodKey].stock += amount;
        const recordKey = `${town.id}_${goodKey}`;
        const record = this.stats.lastTradeRecords[recordKey];
        if (record) {
            const profit = totalEarned - record.cost;
            if (profit > 0) {
                this.stats.totalTradeProfit += profit;
                if (!this.stats._firstTradeProfit) this.stats._firstTradeProfit = true;
                const profitPct = (profit / record.cost) * 100;
                if (profitPct > (this.stats._maxTradeProfitPct || 0)) {
                    this.stats._maxTradeProfitPct = profitPct;
                }
            }
            delete this.stats.lastTradeRecords[recordKey];
        }
        const townTradeKey = `sametown_${town.id}_${goodKey}`;
        this.stats[townTradeKey] = (this.stats[townTradeKey] || 0) + 1;
        audio.trade();
        this.saveGame();
        this.checkAchievements();
        return { success: true, msg: `卖出${GOODS[goodKey].name}×${amount}，获得${totalEarned}瓶盖` };
    }

    getLastBuyPrice(townId, goodKey) {
        const key = `${townId}_${goodKey}`;
        return this.stats.lastTradeRecords[key] || null;
    }

    buyMod(modKey) {
        const mod = MODIFICATIONS[modKey];
        if (!mod) return { success: false, msg: '零件不存在' };
        if (this.money < mod.price) return { success: false, msg: '瓶盖不足' };
        this.money -= mod.price;
        this.installMod(mod.type, modKey);
        if (this.currentTown) {
            this.currentTown.mods = this.currentTown.mods.filter(m => m !== modKey);
        }
        this.saveGame();
        return { success: true, msg: `购买并安装了${mod.name}，花费${mod.price}瓶盖` };
    }

    repairVehicle() {
        const cost = Math.round((this.vehicle.maxDurability - this.vehicle.durability) * 1.5);
        if (cost <= 0) return { success: false, msg: '车辆无需修理' };
        if (this.money < cost) {
            const repairAmount = Math.floor(this.money / 1.5);
            if (repairAmount <= 0) return { success: false, msg: '瓶盖不足' };
            this.vehicle.durability += repairAmount;
            this.money -= Math.round(repairAmount * 1.5);
            this.stats.totalRepairs++;
            audio.click();
            return { success: true, msg: `部分修理，恢复${repairAmount}点耐久` };
        }
        this.money -= cost;
        this.vehicle.durability = this.vehicle.maxDurability;
        this.stats.totalRepairs++;
        audio.upgrade();
        this.saveGame();
        return { success: true, msg: `完全修理，花费${cost}瓶盖` };
    }

    refuel(amount) {
        const fuelPrice = 3;
        const maxBuy = Math.min(Math.floor(this.money / fuelPrice), this.vehicle.maxFuel - this.vehicle.fuel);
        const actual = Math.min(amount, maxBuy);
        if (actual <= 0) return { success: false, msg: '无法加油（瓶盖不足或油箱已满）' };
        const cost = actual * fuelPrice;
        this.money -= cost;
        this.vehicle.fuel += actual;
        audio.trade();
        this.saveGame();
        return { success: true, msg: `加了${actual}单位燃油，花费${cost}瓶盖` };
    }

    // ========== 成就系统 ==========
    checkOrderAchievements(order, distance) {
        if (order.dangerMult >= 1.5) this.stats._dangerousOrders = (this.stats._dangerousOrders || 0) + 1;
        if (distance >= 300) this.stats._longDistanceOrder = true;
        const hpPct = (this.vehicle.durability / this.vehicle.maxDurability) * 100;
        if (hpPct >= 90) this.stats._perfectOrder = true;
        const timeUsedPct = ((order.deadline - order.turnsLeft) / order.deadline) * 100;
        if (timeUsedPct <= 50) this.stats._fastDelivery = true;
        if (this.money <= 0) this.stats._deliverBroke = true;
    }

    checkAchievements() {
        for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
            if (this.achievements[id]) continue;
            if (this.isAchievementUnlocked(achievement)) {
                this.unlockAchievement(id, achievement);
            }
        }
    }

    isAchievementUnlocked(achievement) {
        const c = achievement.condition;
        const s = this.stats;
        const v = this.vehicle;
        switch (c.type) {
            case 'orders_completed': return s.ordersCompleted >= c.value;
            case 'distance_traveled': return s.distanceTraveled >= c.value;
            case 'all_towns_visited': return this.map && s.townsVisited.size >= this.map.towns.length;
            case 'fuel_efficient_trip': return false;
            case 'arrive_low_hp': return !!s._arrivedLowHp;
            case 'first_trade_profit': return !!s._firstTradeProfit;
            case 'total_trade_profit': return s.totalTradeProfit >= c.value;
            case 'single_trade_profit_pct': return (s._maxTradeProfitPct || 0) >= c.value;
            case 'hold_goods_types': return Object.keys(v.cargo).filter(k => v.cargo[k] > 0).length >= c.value;
            case 'caps_held': return this.money >= c.value;
            case 'merchant_trades': return s.merchantTrades >= c.value;
            case 'old_coins_collected': return s.oldCoinsCollected >= c.value;
            case 'mods_installed': return s.modsInstalled >= c.value;
            case 'set_bonus_activated': return this.activeSetBonuses.length >= c.value;
            case 'legendary_mods_owned': {
                let count = 0;
                for (const slot of Object.keys(v.mods)) {
                    const modKey = v.mods[slot];
                    if (modKey) {
                        const mod = MODIFICATIONS[modKey] || SPECIAL_MODS[modKey];
                        if (mod && mod.rarity === 'legendary') count++;
                    }
                }
                return count >= c.value;
            }
            case 'all_slots_equipped': return Object.values(v.mods).every(m => m !== null);
            case 'total_repairs': return s.totalRepairs >= c.value;
            case 'vehicle_speed': return this.getVehicleStats().speed >= c.value;
            case 'vehicle_armor': return this.getVehicleStats().armor >= c.value;
            case 'combats_won': return s.combatsWon >= c.value;
            case 'consecutive_peaceful': return s.consecutivePeaceful >= c.value;
            case 'bandits_defeated': return s.banditsDefeated >= c.value;
            case 'flawless_victory': return s.flawlessVictories >= c.value;
            case 'total_bribe_spent': return s.totalBribeSpent >= c.value;
            case 'events_handled': return s.eventsHandled >= c.value;
            case 'radiation_survived': return s.radiationSurvived >= c.value;
            case 'consecutive_good_events': return s.consecutiveGoodEvents >= c.value;
            case 'survivors_helped': return s.survivorsHelped >= c.value;
            case 'vehicles_searched': return s.vehiclesSearched >= c.value;
            case 'breakdowns_fixed': return s.breakdownsFixed >= c.value;
            case 'all_event_types_seen': return Object.keys(s.eventTypesSeen).length >= 6;
            case 'crew_recruited': return s.crewRecruited >= c.value;
            case 'crew_count': return this.crew.length >= c.value;
            case 'crew_all_roles': {
                const roles = new Set(this.crew.map(c => c.role));
                return roles.size >= 3;
            }
            case 'crew_max_level': return this.crew.some(m => m.level >= c.value);
            case 'crew_healed': return s.crewHealed >= c.value;
            case 'crew_sanity_maintained': return this.crew.length > 0 && this.crew.every(m => m.sanity >= c.value);
            case 'crew_deliveries': return Object.values(s.crewDeliveries).some(d => d >= c.value);
            case 'fast_delivery': return !!s._fastDelivery;
            case 'dangerous_orders': return (s._dangerousOrders || 0) >= c.value;
            case 'long_distance_order': return !!s._longDistanceOrder;
            case 'perfect_order': return !!s._perfectOrder;
            case 'all_main_orders': return this.completedOrders >= this.requiredOrders;
            case 'arrive_no_fuel': return !!s._arrivedNoFuel;
            case 'deliver_broke': return !!s._deliverBroke;
            case 'same_town_trade': {
                for (const key of Object.keys(s)) {
                    if (key.startsWith('sametown_') && s[key] >= c.value) return true;
                }
                return false;
            }
            case 'consecutive_fights': return s.consecutiveFights >= c.value;
            case 'all_crew_sick': return this.crew.length > 1 && this.crew.every(c => c.sick);
            case 'all_non_hidden_unlocked': {
                const nonHidden = Object.entries(ACHIEVEMENTS).filter(([, a]) => !a.hidden);
                return nonHidden.every(([id]) => this.achievements[id]);
            }
            default: return false;
        }
    }

    unlockAchievement(id, achievement) {
        this.achievements[id] = { unlocked: true, time: Date.now() };
        this.pendingAchievements.push(achievement);
        audio.upgrade();
        this.addLog(`🏆 成就解锁：${achievement.name} - ${achievement.desc}`);
        if (achievement.reward) {
            switch (achievement.reward.type) {
                case 'caps':
                    this.money += achievement.reward.value;
                    this.addLog(`  奖励：${achievement.reward.value}瓶盖`);
                    break;
                case 'title':
                    this.addLog(`  获得称号：${achievement.reward.value}`);
                    break;
                case 'unlock_mod':
                    this.addLog(`  解锁特殊零件：${SPECIAL_MODS[achievement.reward.value]?.name || achievement.reward.value}`);
                    break;
                case 'unlock_vehicle':
                    this.addLog(`  解锁特殊载具：${SPECIAL_VEHICLES[achievement.reward.value]?.name || achievement.reward.value}`);
                    break;
            }
        }
    }

    getAchievementProgress() {
        const total = Object.keys(ACHIEVEMENTS).length;
        const unlocked = Object.keys(this.achievements).length;
        const categories = {};
        for (const [catId, catData] of Object.entries(ACHIEVEMENT_CATEGORIES)) {
            const catAchievements = Object.entries(ACHIEVEMENTS).filter(([, a]) => a.category === catId);
            const catUnlocked = catAchievements.filter(([id]) => this.achievements[id]).length;
            categories[catId] = { ...catData, total: catAchievements.length, unlocked: catUnlocked };
        }
        return { total, unlocked, categories, pct: Math.round(unlocked / total * 100) };
    }

    popPendingAchievements() {
        const pending = [...this.pendingAchievements];
        this.pendingAchievements = [];
        return pending;
    }

    // ========== 工具函数 ==========
    addLog(message) {
        this.log.push({ turn: this.turn, message, time: Date.now() });
        if (this.log.length > 100) this.log.shift();
    }

    shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}
