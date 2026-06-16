// ============================================================
// 废土快递 - 核心游戏引擎
// ============================================================

class Game {
    constructor() {
        this.state = 'menu'; // menu, playing, event, combat, gameover, victory
        this.mode = 'standard'; // standard, speed
        this.turn = 0;
        this.completedOrders = 0;
        this.requiredOrders = 3; // 标准模式需完成3个主要订单
        this.map = null;
        this.vehicle = null;
        this.crew = [];
        this.inventory = {};
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
            lastTradeRecords: {} // { townId_goodKey: { buyPrice, amount } }
        };
        this.achievements = {}; // { achievementId: { unlocked: true, time: timestamp } }
        this.pendingAchievements = []; // 待显示的成就通知
    }

    // ========== 初始化 ==========
    startGame(mode) {
        this.mode = mode;
        this.turn = 0;
        this.completedOrders = 0;
        this.requiredOrders = mode === 'speed' ? 1 : 3;
        this.money = mode === 'speed' ? 300 : 200;
        this.oldWorldCurrency = 0;
        this.inventory = {};
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
            lastTradeRecords: {}
        };
        this.achievements = {};
        this.pendingAchievements = [];

        this.generateMap(mode === 'speed' ? 5 : 8);
        this.initVehicle();
        this.initCrew();

        // 起始城镇
        this.currentTown = this.map.towns[0];
        this.currentTown.visited = true;
        this.stats.townsVisited.add(this.currentTown.id);

        this.generateOrders();
        this.state = 'playing';
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

        // 生成城镇位置（确保不重叠）
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
                id: i,
                name,
                type,
                x, y,
                visited: false,
                goods: this.generateTownGoods(type),
                mods: this.generateTownMods(type),
                availableCrew: i === 0 ? [] : this.maybeGenerateCrew(),
                priceModifier: 0.8 + Math.random() * 0.4
            });
        }

        // 生成路线（确保图连通）
        // 先用最小生成树确保连通
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

        // 额外添加一些快捷路线
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

        this.map.routes.push({
            from: a,
            to: b,
            distance,
            fuelCost,
            danger: Math.round(danger * 100) / 100,
            radiation,
            segments: Math.max(1, Math.floor(distance / 8))
        });
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
            // 传说级在普通城镇不出现
            if (mod.rarity === 'legendary' && townType !== 'military') continue;
            if (!available.includes(key)) available.push(key);
        }
        return available;
    }

    maybeGenerateCrew() {
        if (Math.random() > 0.5) return [];
        const count = 1 + (Math.random() > 0.7 ? 1 : 0);
        const crew = [];
        for (let i = 0; i < count; i++) {
            crew.push(this.generateCrewMember());
        }
        return crew;
    }

    generateCrewMember() {
        const roles = Object.keys(CREW_ROLES);
        const role = roles[Math.floor(Math.random() * roles.length)];
        const name = CREW_NAMES[Math.floor(Math.random() * CREW_NAMES.length)];
        const level = 1 + Math.floor(Math.random() * 3);
        return {
            id: 'crew_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name,
            role,
            level,
            health: 100,
            maxHealth: 100,
            sanity: 100,
            maxSanity: 100,
            hireCost: level * 80 + Math.floor(Math.random() * 50),
            sick: false
        };
    }

    // ========== 车辆系统 ==========
    initVehicle() {
        this.vehicle = {
            name: '老伙计',
            durability: 100,
            maxDurability: 100,
            fuel: 80,
            maxFuel: 100,
            baseSpeed: 50,
            baseArmor: 5,
            baseCargoSpace: 10,
            // 改装槽位
            mods: {
                cargo: null,
                armor: null,
                engine: null,
                radar: null,
                weapon: null
            },
            cargo: {} // 当前携带的货物
        };
    }

    getVehicleStats() {
        const v = this.vehicle;
        let stats = {
            speed: v.baseSpeed,
            armor: v.baseArmor,
            cargoSpace: v.baseCargoSpace,
            combatBonus: 0,
            detection: 0,
            fuelEfficiency: 0,
            eventWarning: 0,
            lootBonus: 0
        };

        // 应用改装
        const setCounts = {};
        for (const slot of Object.keys(v.mods)) {
            const modKey = v.mods[slot];
            if (!modKey) continue;
            const mod = MODIFICATIONS[modKey];
            if (!mod) continue;

            for (const [stat, val] of Object.entries(mod.stats)) {
                if (stats[stat] !== undefined) stats[stat] += val;
            }

            // 统计套装
            if (mod.set) {
                setCounts[mod.set] = (setCounts[mod.set] || 0) + 1;
            }
        }

        // 应用乘员加成
        for (const member of this.crew) {
            if (member.sick) continue;
            const roleData = CREW_ROLES[member.role];
            for (const [stat, val] of Object.entries(roleData.effect)) {
                if (stats[stat] !== undefined) {
                    stats[stat] += val * member.level;
                }
            }
        }

        // 计算套装效果
        this.activeSetBonuses = [];
        for (const [bonusKey, bonus] of Object.entries(SET_BONUSES)) {
            const { set, count } = bonus.required;
            if ((setCounts[set] || 0) >= count) {
                this.activeSetBonuses.push(bonus);
                // 应用套装效果
                for (const [effect, val] of Object.entries(bonus.effect)) {
                    if (effect === 'fuelCostMult') stats.fuelEfficiency += (1 - val) * 100;
                    else if (effect === 'allStatsMult') {
                        stats.speed *= val;
                        stats.armor *= val;
                        stats.combatBonus *= val;
                    }
                }
            }
        }

        // 确保不小于0
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
            id: 'crew_starter',
            name: '你',
            role: 'driver',
            level: 1,
            health: 100,
            maxHealth: 100,
            sanity: 100,
            maxSanity: 100,
            hireCost: 0,
            sick: false
        }];
    }

    hireCrew(member) {
        if (this.money < member.hireCost) return false;
        if (this.crew.length >= 4) return false;
        this.money -= member.hireCost;
        this.crew.push(member);
        this.stats.crewRecruited++;
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
            // 舒适驾驶套装效果
            const bonus = this.activeSetBonuses.find(b => b.effect.sanityCostMult);
            if (bonus) loss *= bonus.effect.sanityCostMult;
            member.sanity = Math.max(0, member.sanity - loss);
        }
    }

    checkSanityEvents() {
        const events = [];
        for (const member of this.crew) {
            if (member.sanity <= 0) {
                events.push({
                    type: 'sanity_break',
                    member,
                    message: `${member.name}的理智崩溃了！需要在酒馆休息恢复。`
                });
                member.sanity = 0;
            } else if (member.sanity <= 20 && Math.random() < 0.3) {
                events.push({
                    type: 'sanity_warning',
                    member,
                    message: `${member.name}精神状态很差，开始出现幻觉...`
                });
            }
        }
        return events;
    }

    restAtTavern() {
        const cost = 30 + this.crew.length * 10;
        if (this.money < cost) return { success: false, message: '瓶盖不够！' };
        this.money -= cost;
        // 消耗食物
        const foodConsumed = this.crew.length;
        const foodInCargo = this.vehicle.cargo.food || 0;
        if (foodInCargo > 0) {
            this.vehicle.cargo.food = Math.max(0, foodInCargo - foodConsumed);
        }
        for (const member of this.crew) {
            member.sanity = Math.min(member.maxSanity, member.sanity + 40);
            member.health = Math.min(member.maxHealth, member.health + 20);
            if (member.sick && Math.random() < 0.5) {
                member.sick = false;
                this.stats.crewHealed++;
            }
        }
        this.addLog(`在酒馆休息，花费${cost}瓶盖。全员恢复精神和体力。`);
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
                fromTown: this.currentTown.id,
                toTown: target.id,
                cargoType: cargoType.name,
                cargoIcon: cargoType.icon,
                amount,
                reward: baseReward + dangerBonus,
                dangerMult: cargoType.dangerMult,
                deadline: 5 + Math.floor(distance / 10),
                turnsLeft: 5 + Math.floor(distance / 10),
                accepted: false
            });
        }
    }

    acceptOrder(orderId) {
        const order = this.availableOrders.find(o => o.id === orderId);
        if (!order) return false;
        order.accepted = true;
        this.activeOrders.push(order);
        this.availableOrders = this.availableOrders.filter(o => o.id !== orderId);
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
        this.addLog(`✅ 订单完成！获得${order.reward}瓶盖！（${this.completedOrders}/${this.requiredOrders}）`);

        // 成就跟踪：乘员送货计数
        for (const c of this.crew) {
            this.stats.crewDeliveries[c.id] = (this.stats.crewDeliveries[c.id] || 0) + 1;
        }

        // 成就跟踪：危险品、长途、完美送达、闪电快递
        const orderDistance = this.getRouteDistance(order.fromTown, order.toTown);
        this.checkOrderAchievements(order, orderDistance);

        this.checkAchievements();

        if (this.completedOrders >= this.requiredOrders) {
            this.state = 'victory';
            this.addLog('🎉 恭喜！你完成了所有主要订单，成为废土上最可靠的快递员！');
            this.checkAchievements();
        }
        return true;
    }

    getRouteDistance(fromId, toId) {
        // BFS查找最短路径
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
            return {
                ...r,
                targetTown: this.map.towns[targetId],
                targetId,
                adjustedFuelCost: this.getAdjustedFuelCost(r.fuelCost)
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
        if (this.vehicle.fuel < fuelCost) {
            return { error: '燃油不足！' };
        }

        this.travelProgress = {
            route,
            currentSegment: 0,
            totalSegments: route.segments || 1,
            targetId: route.targetId,
            fuelPerSegment: fuelCost / (route.segments || 1),
            eventsQueue: []
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

        // 消耗燃油
        this.vehicle.fuel = Math.max(0, this.vehicle.fuel - tp.fuelPerSegment);

        // 消耗理智
        this.applySanityLoss(5);

        // 更新订单期限
        for (const order of this.activeOrders) {
            order.turnsLeft--;
            if (order.turnsLeft <= 0) {
                this.addLog(`⚠️ 订单超时：${order.cargoType}运送失败！`);
            }
        }
        this.activeOrders = this.activeOrders.filter(o => o.turnsLeft > 0);

        // 距离统计
        this.stats.distanceTraveled += tp.route.distance / tp.totalSegments;

        // 检查理智事件
        const sanityEvents = this.checkSanityEvents();
        for (const e of sanityEvents) {
            this.addLog(e.message);
        }

        // 检查燃油耗尽
        if (this.vehicle.fuel <= 0) {
            this.state = 'gameover';
            this.addLog('💀 燃油耗尽，你被困在了废土之中...');
            return { type: 'gameover', reason: '燃油耗尽' };
        }

        // 随机事件检查
        const event = this.checkForEvent(tp.route);
        if (event) {
            this.stats.eventsHandled++;
            return { type: 'event', event, segment: tp.currentSegment, total: tp.totalSegments };
        }

        // 到达目的地？
        if (tp.currentSegment >= tp.totalSegments) {
            return this.arriveAtTown(tp.targetId);
        }

        return { type: 'travel', segment: tp.currentSegment, total: tp.totalSegments };
    }

    arriveAtTown(townId) {
        const town = this.map.towns[townId];
        this.currentTown = town;
        town.visited = true;
        this.stats.townsVisited.add(townId);
        this.travelProgress = null;
        this.generateOrders();

        // 成就检测：低耐久到达、零燃油到达
        const hpPct = (this.vehicle.durability / this.vehicle.maxDurability) * 100;
        if (hpPct <= 5 && hpPct > 0) this.stats._arrivedLowHp = true;
        if (this.vehicle.fuel <= 0) this.stats._arrivedNoFuel = true;

        // 检查是否有可完成的订单
        const completable = this.activeOrders.filter(o => o.toTown === townId);

        this.addLog(`🏘️ 到达${town.name}（${TOWN_TYPES[town.type].name}）`);

        // 自动完成订单
        for (const order of completable) {
            this.completeOrder(order.id);
        }

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

            // 雷达降低负面事件概率（通过预警）
            if (['bandit', 'radiation', 'breakdown'].includes(key)) {
                chance *= (1 - warningBonus * 0.3);
            }

            if (Math.random() < chance) {
                return { key, ...eventData };
            }
        }
        return null;
    }

    // ========== 事件处理 ==========
    resolveEvent(eventKey, choiceIndex) {
        const results = [];

        // 记录事件类型
        this.stats.eventTypesSeen[eventKey] = true;

        switch (eventKey) {
            case 'bandit':
                results.push(...this.resolveBandit(choiceIndex));
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

        // 检查游戏结束
        if (this.vehicle.durability <= 0) {
            this.state = 'gameover';
            results.push({ type: 'gameover', message: '💀 车辆报废，你的旅程结束了...' });
        } else if (this.crew.every(c => c.health <= 0)) {
            this.state = 'gameover';
            results.push({ type: 'gameover', message: '💀 所有乘员死亡...' });
        }

        // 检查事件结果是否正面（连续好事件追踪）
        const hasGoodResult = results.some(r => r.type === 'success' || r.type === 'legendary');
        const hasBadResult = results.some(r => r.type === 'failure' || r.type === 'gameover');
        if (hasGoodResult && !hasBadResult) {
            this.stats.consecutiveGoodEvents++;
        } else if (hasBadResult) {
            this.stats.consecutiveGoodEvents = 0;
        }

        this.checkAchievements();
        return results;
    }

    resolveBandit(choice) {
        const stats = this.getVehicleStats();
        switch (choice) {
            case 0: { // 战斗
                const playerPower = stats.combatBonus + stats.armor * 0.5 +
                    this.crew.filter(c => c.role === 'guard' && !c.sick).reduce((sum, c) => sum + c.level * 15, 0);
                const enemyPower = 20 + Math.random() * 40;
                const win = playerPower + Math.random() * 30 > enemyPower;

                if (win) {
                    const loot = Math.round(30 + Math.random() * 50);
                    let lootMult = 1;
                    const lootBonus = this.activeSetBonuses.find(b => b.effect.lootMult);
                    if (lootBonus) lootMult = lootBonus.effect.lootMult;
                    const finalLoot = Math.round(loot * lootMult);
                    this.money += finalLoot;
                    this.stats.combatsWon++;
                    this.stats.banditsDefeated++;
                    this.stats.consecutivePeaceful = 0;
                    this.stats.consecutiveFights++;
                    const dmg = Math.round(5 + Math.random() * 15);
                    if (dmg === 0) this.stats.flawlessVictories++;
                    this.vehicle.durability = Math.max(0, this.vehicle.durability - dmg);
                    return [
                        { type: 'success', message: `⚔️ 战斗胜利！获得${finalLoot}瓶盖，车辆受损${dmg}点` }
                    ];
                } else {
                    const dmg = Math.round(15 + Math.random() * 25);
                    this.vehicle.durability = Math.max(0, this.vehicle.durability - dmg);
                    const lostCargo = this.loseSomeCargo();
                    this.crew.forEach(c => c.health = Math.max(0, c.health - Math.round(10 + Math.random() * 15)));
                    return [
                        { type: 'failure', message: `⚔️ 战斗失败！车辆受损${dmg}点${lostCargo}，乘员受伤` }
                    ];
                }
            }
            case 1: { // 贿赂
                const cost = Math.round(30 + Math.random() * 50);
                if (this.money >= cost) {
                    this.money -= cost;
                    this.stats.totalBribeSpent += cost;
                    this.stats.consecutivePeaceful++;
                    this.stats.consecutiveFights = 0;
                    return [{ type: 'neutral', message: `💰 贿赂了强盗，花费${cost}瓶盖` }];
                } else {
                    return this.resolveBandit(0); // 钱不够只能打
                }
            }
            case 2: { // 逃跑
                this.stats.consecutivePeaceful++;
                this.stats.consecutiveFights = 0;
                const escapeChance = 0.4 + stats.speed / 200;
                let bonus = 0;
                const fleeBonus = this.activeSetBonuses.find(b => b.effect.banditFleeMult);
                if (fleeBonus) bonus = 0.2;

                if (Math.random() < escapeChance + bonus) {
                    return [{ type: 'neutral', message: '🏃 成功逃脱！浪费了一些时间和燃油' }];
                } else {
                    const dmg = Math.round(10 + Math.random() * 20);
                    this.vehicle.durability = Math.max(0, this.vehicle.durability - dmg);
                    this.vehicle.fuel = Math.max(0, this.vehicle.fuel - 10);
                    return [{ type: 'failure', message: `🏃 逃跑翻车！车辆受损${dmg}点，损失燃油` }];
                }
            }
        }
        return [];
    }

    resolveMerchant(choice) {
        switch (choice) {
            case 0: { // 交易旧世界货币
                if (this.oldWorldCurrency < 3) {
                    return [{ type: 'failure', message: '🎭 旧世界货币不足（需要3个），商人摇头离去' }];
                }
                this.oldWorldCurrency -= 3;
                this.stats.merchantTrades++;
                const legendaryKey = LEGENDARY_POOL[Math.floor(Math.random() * LEGENDARY_POOL.length)];
                const mod = MODIFICATIONS[legendaryKey];
                const slot = mod.type;
                const oldMod = this.vehicle.mods[slot];
                this.vehicle.mods[slot] = legendaryKey;
                return [{
                    type: 'legendary',
                    message: `🎭 用3个旧世界货币换取了传说级零件：${mod.name}！${oldMod ? '（替换了' + MODIFICATIONS[oldMod].name + '）' : ''}`
                }];
            }
            case 1: { // 用瓶盖交易
                const cost = 100 + Math.floor(Math.random() * 100);
                if (this.money < cost) {
                    return [{ type: 'failure', message: '🎭 瓶盖不够，商人嗤笑着消失了' }];
                }
                this.money -= cost;
                this.stats.merchantTrades++;
                // 随机给一个稀有物品
                const rareKeys = Object.keys(MODIFICATIONS).filter(k => MODIFICATIONS[k].rarity === 'rare');
                const modKey = rareKeys[Math.floor(Math.random() * rareKeys.length)];
                const mod = MODIFICATIONS[modKey];
                const slot = mod.type;
                this.vehicle.mods[slot] = modKey;
                return [{ type: 'success', message: `🎭 花费${cost}瓶盖购买了${mod.name}` }];
            }
            case 2: // 离开
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
                return [{ type: 'neutral', message: `☢️ 停车避险${foodCost > currentFood ? '（食物不足，乘员饥饿受损）' : `（消耗${foodCost}份食物）`}` }];
            }
            case 1: { // 硬闯
                const results = [];
                for (const member of this.crew) {
                    if (Math.random() < 0.4) {
                        member.sick = true;
                        member.health = Math.max(0, member.health - 15);
                        results.push({ type: 'failure', message: `☢️ ${member.name}受到辐射，生病了！` });
                    }
                }
                this.vehicle.durability = Math.max(0, this.vehicle.durability - 5);
                this.stats.radiationSurvived++;
                if (results.length === 0) {
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
                    return [{ type: 'success', message: `🔧 修理成功！恢复${repair}点耐久` }];
                } else {
                    this.vehicle.durability = Math.max(0, this.vehicle.durability - 10);
                    return [{ type: 'failure', message: '🔧 修理失败，情况变得更糟了（-10耐久）' }];
                }
            }
            case 1: { // 步行求援
                this.turn += 2;
                this.applySanityLoss(15);
                const cost = 50 + Math.floor(Math.random() * 50);
                this.money = Math.max(0, this.money - cost);
                this.vehicle.durability = Math.min(this.vehicle.maxDurability,
                    this.vehicle.durability + 20);
                return [{ type: 'neutral', message: `🚶 派人步行求援，花了很长时间和${cost}瓶盖，车辆修复了20点` }];
            }
        }
        return [];
    }

    resolveAbandoned(choice) {
        switch (choice) {
            case 0: { // 搜索
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
                        return [{ type: 'success', message: `🔍 找到了${caps}瓶盖！` }];
                    } else if (roll < 0.5) {
                        const fuel = Math.round((10 + Math.random() * 20) * lootMult);
                        this.vehicle.fuel = Math.min(this.vehicle.maxFuel, this.vehicle.fuel + fuel);
                        return [{ type: 'success', message: `🔍 找到了${fuel}单位燃油！` }];
                    } else if (roll < 0.7) {
                        this.oldWorldCurrency++;
                        this.stats.oldCoinsCollected++;
                        return [{ type: 'legendary', message: '🔍 找到了一枚旧世界货币！' }];
                    } else {
                        // 随机普通零件
                        const commonMods = Object.keys(MODIFICATIONS).filter(k =>
                            MODIFICATIONS[k].rarity === 'common' || MODIFICATIONS[k].rarity === 'uncommon'
                        );
                        const modKey = commonMods[Math.floor(Math.random() * commonMods.length)];
                        const mod = MODIFICATIONS[modKey];
                        return [{ type: 'success', message: `🔍 找到了零件：${mod.name}！可在改装界面安装` },
                            { foundMod: modKey }];
                    }
                } else {
                    // 陷阱！
                    const dmg = Math.round(5 + Math.random() * 15);
                    this.vehicle.durability = Math.max(0, this.vehicle.durability - dmg);
                    return [{ type: 'failure', message: `🔍 是个陷阱！车辆受损${dmg}点` }];
                }
            }
            case 1: // 绕过
                return [{ type: 'neutral', message: '⚠️ 小心绕过了废弃车辆' }];
        }
        return [];
    }

    resolveSurvivor(choice) {
        switch (choice) {
            case 0: { // 搭载
                this.stats.survivorsHelped++;
                const foodCost = 2;
                const currentFood = this.vehicle.cargo.food || 0;
                if (currentFood >= foodCost) {
                    this.vehicle.cargo.food -= foodCost;
                }

                const roll = Math.random();
                if (roll < 0.4) {
                    const reward = 30 + Math.floor(Math.random() * 50);
                    this.money += reward;
                    return [{ type: 'success', message: `🤝 幸存者感谢你的帮助，给了你${reward}瓶盖作为报答` }];
                } else if (roll < 0.6) {
                    this.oldWorldCurrency++;
                    this.stats.oldCoinsCollected++;
                    return [{ type: 'legendary', message: '🤝 幸存者送给你一枚旧世界货币作为谢礼！' }];
                } else if (roll < 0.8) {
                    // 加入队伍
                    if (this.crew.length < 4) {
                        const newCrew = this.generateCrewMember();
                        newCrew.hireCost = 0;
                        this.crew.push(newCrew);
                        this.stats.crewRecruited++;
                        return [{ type: 'success', message: `🤝 ${newCrew.name}被你的善意感动，加入了你的队伍！（${CREW_ROLES[newCrew.role].name}）` }];
                    }
                    return [{ type: 'neutral', message: '🤝 幸存者感谢你的帮助后离去' }];
                } else {
                    // 偷东西
                    const stolen = Math.round(20 + Math.random() * 40);
                    this.money = Math.max(0, this.money - stolen);
                    return [{ type: 'failure', message: `🤝 那个"幸存者"趁你不注意偷走了${stolen}瓶盖！` }];
                }
            }
            case 1:
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

        // 记录购买成本以计算利润
        const recordKey = `${town.id}_${goodKey}`;
        this.stats.lastTradeRecords[recordKey] = { cost: totalCost, amount };

        // 跟踪同一城镇同一商品交易次数
        const townTradeKey = `sametown_${town.id}_${goodKey}`;
        this.stats[townTradeKey] = (this.stats[townTradeKey] || 0) + 1;

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

        // 成就跟踪：交易利润
        const recordKey = `${town.id}_${goodKey}`;
        const record = this.stats.lastTradeRecords[recordKey];
        if (record) {
            const profit = totalEarned - record.cost;
            if (profit > 0) {
                this.stats.totalTradeProfit += profit;
                if (!this.stats._firstTradeProfit) this.stats._firstTradeProfit = true;
                // 计算利润率
                const profitPct = (profit / record.cost) * 100;
                if (profitPct > (this.stats._maxTradeProfitPct || 0)) {
                    this.stats._maxTradeProfitPct = profitPct;
                }
            }
            delete this.stats.lastTradeRecords[recordKey];
        }

        // 跟踪同一城镇同一商品交易次数
        const townTradeKey = `sametown_${town.id}_${goodKey}`;
        this.stats[townTradeKey] = (this.stats[townTradeKey] || 0) + 1;

        this.checkAchievements();
        return { success: true, msg: `卖出${GOODS[goodKey].name}×${amount}，获得${totalEarned}瓶盖` };
    }

    buyMod(modKey) {
        const mod = MODIFICATIONS[modKey];
        if (!mod) return { success: false, msg: '零件不存在' };
        if (this.money < mod.price) return { success: false, msg: '瓶盖不足' };

        this.money -= mod.price;
        this.installMod(mod.type, modKey);

        // 从城镇移除
        if (this.currentTown) {
            this.currentTown.mods = this.currentTown.mods.filter(m => m !== modKey);
        }
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
            return { success: true, msg: `部分修理，恢复${repairAmount}点耐久` };
        }
        this.money -= cost;
        this.vehicle.durability = this.vehicle.maxDurability;
        this.stats.totalRepairs++;
        return { success: true, msg: `完全修理，花费${cost}瓶盖` };
    }

    refuel(amount) {
        const fuelPrice = 3;
        const maxBuy = Math.min(
            Math.floor(this.money / fuelPrice),
            this.vehicle.maxFuel - this.vehicle.fuel
        );
        const actual = Math.min(amount, maxBuy);
        if (actual <= 0) return { success: false, msg: '无法加油（瓶盖不足或油箱已满）' };

        const cost = actual * fuelPrice;
        this.money -= cost;
        this.vehicle.fuel += actual;
        return { success: true, msg: `加了${actual}单位燃油，花费${cost}瓶盖` };
    }

    // ========== 成就系统 ==========
    checkOrderAchievements(order, distance) {
        // 危险品订单
        if (order.dangerMult >= 1.5) {
            this.stats._dangerousOrders = (this.stats._dangerousOrders || 0) + 1;
        }
        // 长途订单
        if (distance >= 300) {
            this.stats._longDistanceOrder = true;
        }
        // 完美送达（车辆耐久≥90%）
        const hpPct = (this.vehicle.durability / this.vehicle.maxDurability) * 100;
        if (hpPct >= 90) {
            this.stats._perfectOrder = true;
        }
        // 闪电快递（在时限50%内完成）
        const timeUsedPct = ((order.deadline - order.turnsLeft) / order.deadline) * 100;
        if (timeUsedPct <= 50) {
            this.stats._fastDelivery = true;
        }
        // 瓶盖归零送货
        if (this.money <= 0) {
            this.stats._deliverBroke = true;
        }
    }

    checkAchievements() {
        for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
            if (this.achievements[id]) continue; // 已解锁
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
            // 生存之路
            case 'orders_completed': return s.ordersCompleted >= c.value;
            case 'distance_traveled': return s.distanceTraveled >= c.value;
            case 'all_towns_visited': return this.map && s.townsVisited.size >= this.map.towns.length;
            case 'fuel_efficient_trip': return false; // 需要旅行后专门检测
            case 'arrive_low_hp': return !!s._arrivedLowHp;
            // 商人之道
            case 'first_trade_profit': return !!s._firstTradeProfit;
            case 'total_trade_profit': return s.totalTradeProfit >= c.value;
            case 'single_trade_profit_pct': return (s._maxTradeProfitPct || 0) >= c.value;
            case 'hold_goods_types': return Object.keys(v.cargo).filter(k => v.cargo[k] > 0).length >= c.value;
            case 'caps_held': return this.money >= c.value;
            case 'merchant_trades': return s.merchantTrades >= c.value;
            case 'old_coins_collected': return s.oldCoinsCollected >= c.value;
            // 机械狂潮
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
            // 战斗荣耀
            case 'combats_won': return s.combatsWon >= c.value;
            case 'consecutive_peaceful': return s.consecutivePeaceful >= c.value;
            case 'bandits_defeated': return s.banditsDefeated >= c.value;
            case 'flawless_victory': return s.flawlessVictories >= c.value;
            case 'total_bribe_spent': return s.totalBribeSpent >= c.value;
            // 命运抉择
            case 'events_handled': return s.eventsHandled >= c.value;
            case 'radiation_survived': return s.radiationSurvived >= c.value;
            case 'consecutive_good_events': return s.consecutiveGoodEvents >= c.value;
            case 'survivors_helped': return s.survivorsHelped >= c.value;
            case 'vehicles_searched': return s.vehiclesSearched >= c.value;
            case 'breakdowns_fixed': return s.breakdownsFixed >= c.value;
            case 'all_event_types_seen': return Object.keys(s.eventTypesSeen).length >= 6;
            // 乘员羁绊
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
            // 订单传奇
            case 'fast_delivery': return !!s._fastDelivery;
            case 'dangerous_orders': return (s._dangerousOrders || 0) >= c.value;
            case 'long_distance_order': return !!s._longDistanceOrder;
            case 'perfect_order': return !!s._perfectOrder;
            case 'all_main_orders': return this.completedOrders >= this.requiredOrders;
            // 隐藏成就
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
        this.addLog(`🏆 成就解锁：${achievement.name} - ${achievement.desc}`);

        // 应用奖励
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
