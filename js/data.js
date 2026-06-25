// ============================================================
// 废土快递 - 游戏数据
// ============================================================

const TOWN_NAMES = [
    '铁锈镇', '新希望', '弹坑城', '辐光营地', '骸骨驿站',
    '绿洲港', '钢铁堡', '灰烬谷', '避风港', '废墟市集',
    '油桶镇', '幸存者营', '旧金山废墟', '拉斯维加斯残骸',
    '盐湖要塞', '丹佛地堡', '凤凰城绿洲', '达拉斯贸易站'
];

const TOWN_TYPES = {
    trading: { name: '贸易站', color: '#f0c040', goodsBonus: 1.3, modBonus: 0.7 },
    military: { name: '军事基地', color: '#40a0f0', goodsBonus: 0.7, modBonus: 1.5 },
    settlement: { name: '定居点', color: '#60d060', goodsBonus: 1.0, modBonus: 1.0 },
    raider: { name: '掠夺者营地', color: '#f06040', goodsBonus: 0.8, modBonus: 1.2 },
    ruins: { name: '废墟', color: '#a080c0', goodsBonus: 0.5, modBonus: 0.5 }
};

const GOODS = {
    food: { name: '食物', basePrice: 10, icon: '🍖', weight: 1 },
    water: { name: '净水', basePrice: 15, icon: '💧', weight: 1 },
    medicine: { name: '药品', basePrice: 30, icon: '💊', weight: 0.5 },
    ammo: { name: '弹药', basePrice: 25, icon: '🔫', weight: 2 },
    fuel_barrel: { name: '燃油桶', basePrice: 40, icon: '⛽', weight: 3 },
    electronics: { name: '电子元件', basePrice: 50, icon: '🔧', weight: 1 },
    luxuries: { name: '奢侈品', basePrice: 80, icon: '💎', weight: 1 },
    scrap: { name: '废金属', basePrice: 5, icon: '🔩', weight: 3 },
    chemicals: { name: '化学品', basePrice: 35, icon: '🧪', weight: 2 },
    textiles: { name: '织物', basePrice: 20, icon: '🧵', weight: 1 }
};

const MOD_SETS = {
    military: { name: '军用', color: '#4488cc' },
    raider: { name: '掠夺者', color: '#cc4444' },
    civilian: { name: '民用', color: '#88cc44' },
    tech: { name: '高科技', color: '#cc88ff' },
    salvage: { name: '拾荒者', color: '#ccaa44' }
};

const SET_BONUSES = {
    'military_2': {
        name: '急行军',
        desc: '油耗-30%',
        required: { set: 'military', count: 2 },
        effect: { fuelCostMult: 0.7 }
    },
    'raider_2': {
        name: '威慑',
        desc: '强盗逃跑概率+50%',
        required: { set: 'raider', count: 2 },
        effect: { banditFleeMult: 1.5 }
    },
    'civilian_2': {
        name: '舒适驾驶',
        desc: '理智消耗-40%',
        required: { set: 'civilian', count: 2 },
        effect: { sanityCostMult: 0.6 }
    },
    'tech_2': {
        name: '先进雷达',
        desc: '事件预警+60%',
        required: { set: 'tech', count: 2 },
        effect: { eventWarningMult: 1.6 }
    },
    'salvage_2': {
        name: '拾荒大师',
        desc: '战利品+80%',
        required: { set: 'salvage', count: 2 },
        effect: { lootMult: 1.8 }
    },
    'military_3': {
        name: '装甲列车',
        desc: '受伤-50%，油耗-30%',
        required: { set: 'military', count: 3 },
        effect: { damageMult: 0.5, fuelCostMult: 0.7 }
    },
    'tech_3': {
        name: '科技霸权',
        desc: '所有属性+20%',
        required: { set: 'tech', count: 3 },
        effect: { allStatsMult: 1.2 }
    }
};

const MODIFICATIONS = {
    // === 货舱 ===
    cargo_basic: { name: '基础货架', type: 'cargo', set: 'civilian', rarity: 'common', stats: { cargoSpace: 5 }, price: 50 },
    cargo_reinforced: { name: '加固货舱', type: 'cargo', set: 'civilian', rarity: 'uncommon', stats: { cargoSpace: 8, armor: 2 }, price: 120 },
    cargo_military: { name: '军用集装箱', type: 'cargo', set: 'military', rarity: 'rare', stats: { cargoSpace: 10, armor: 5 }, price: 300 },
    cargo_raider: { name: '掠夺者货兜', type: 'cargo', set: 'raider', rarity: 'uncommon', stats: { cargoSpace: 12, armor: -2 }, price: 80 },
    cargo_tech: { name: '压缩仓储', type: 'cargo', set: 'tech', rarity: 'rare', stats: { cargoSpace: 15 }, price: 400 },
    cargo_salvage: { name: '拾荒背包', type: 'cargo', set: 'salvage', rarity: 'common', stats: { cargoSpace: 6, lootBonus: 10 }, price: 60 },

    // === 装甲 ===
    armor_scrap: { name: '废铁装甲', type: 'armor', set: 'salvage', rarity: 'common', stats: { armor: 10, speed: -5 }, price: 40 },
    armor_plate: { name: '钢板装甲', type: 'armor', set: 'civilian', rarity: 'uncommon', stats: { armor: 20, speed: -10 }, price: 150 },
    armor_military: { name: '军用复合装甲', type: 'armor', set: 'military', rarity: 'rare', stats: { armor: 35, speed: -5 }, price: 350 },
    armor_raider: { name: '尖刺装甲', type: 'armor', set: 'raider', rarity: 'uncommon', stats: { armor: 15, combatBonus: 10 }, price: 130 },
    armor_reactive: { name: '反应装甲', type: 'armor', set: 'tech', rarity: 'legendary', stats: { armor: 40, speed: 5 }, price: 800 },

    // === 引擎 ===
    engine_salvage: { name: '拼凑引擎', type: 'engine', set: 'salvage', rarity: 'common', stats: { speed: 10, fuelEfficiency: -10 }, price: 45 },
    engine_standard: { name: '标准引擎', type: 'engine', set: 'civilian', rarity: 'uncommon', stats: { speed: 20, fuelEfficiency: 0 }, price: 160 },
    engine_military: { name: '军用柴油机', type: 'engine', set: 'military', rarity: 'rare', stats: { speed: 25, fuelEfficiency: 15 }, price: 380 },
    engine_turbo: { name: '涡轮增压', type: 'engine', set: 'raider', rarity: 'rare', stats: { speed: 40, fuelEfficiency: -20 }, price: 300 },
    engine_fusion: { name: '微型聚变引擎', type: 'engine', set: 'tech', rarity: 'legendary', stats: { speed: 35, fuelEfficiency: 50 }, price: 1000 },

    // === 雷达 ===
    radar_basic: { name: '基础雷达', type: 'radar', set: 'civilian', rarity: 'common', stats: { detection: 15 }, price: 60 },
    radar_military: { name: '军用扫描仪', type: 'radar', set: 'military', rarity: 'rare', stats: { detection: 35, eventWarning: 20 }, price: 320 },
    radar_salvage: { name: '改装探测器', type: 'radar', set: 'salvage', rarity: 'uncommon', stats: { detection: 20, lootBonus: 15 }, price: 100 },
    radar_tech: { name: '量子感应器', type: 'radar', set: 'tech', rarity: 'legendary', stats: { detection: 50, eventWarning: 40 }, price: 900 },

    // === 武器 ===
    weapon_mg: { name: '车载机枪', type: 'weapon', set: 'military', rarity: 'uncommon', stats: { combatBonus: 20 }, price: 180 },
    weapon_spike: { name: '撞击尖刺', type: 'weapon', set: 'raider', rarity: 'common', stats: { combatBonus: 12, armor: 3 }, price: 70 },
    weapon_laser: { name: '激光炮台', type: 'weapon', set: 'tech', rarity: 'legendary', stats: { combatBonus: 45 }, price: 1200 },
    weapon_salvage: { name: '废料投射器', type: 'weapon', set: 'salvage', rarity: 'uncommon', stats: { combatBonus: 15, lootBonus: 10 }, price: 90 },
    weapon_flamer: { name: '火焰喷射器', type: 'weapon', set: 'raider', rarity: 'rare', stats: { combatBonus: 30 }, price: 280 }
};

const RARITY_COLORS = {
    common: '#aaaaaa',
    uncommon: '#44cc44',
    rare: '#4488ff',
    legendary: '#ff8800'
};

const RARITY_NAMES = {
    common: '普通',
    uncommon: '精良',
    rare: '稀有',
    legendary: '传说'
};

const CREW_NAMES = [
    '辐射眼', '锈骨', '滤芯', '核尘', '暗齿轮', '破风',
    '锈钉', '毒滤', '铁肺', '骨钉', '硝烟', '碎甲',
    '拾荒者', '锈蚀', '滤毒者', '黑轮胎', '无声轮', '锈扳手',
    '废墟客', '灰烬', '铅皮', '暗流', '锈刃', '滤网'
];

const CREW_ROLES = {
    driver: {
        name: '司机',
        icon: '🚗',
        desc: '降低油耗，提升车速',
        effect: { fuelEfficiency: 0.05, speed: 0.03 }  // 每级效果
    },
    mechanic: {
        name: '机械师',
        icon: '🔧',
        desc: '提升修车效率，降低损耗',
        effect: { repairBonus: 0.1, durabilityLoss: -0.05 }
    },
    guard: {
        name: '保镖',
        icon: '⚔️',
        desc: '战斗加成，降低被劫概率',
        effect: { combatBonus: 0.08, banditChance: -0.05 }
    }
};

const EVENTS = {
    bandit: {
        name: '强盗伏击',
        icon: '🏴‍☠️',
        desc: '一群衣衫褴褛的强盗从废墟后冲出，挡住了去路！',
        baseChance: 0.3,
        choices: [
            {
                text: '⚔️ 战斗',
                desc: '用武力击退他们（可能损失耐久但能获得物资）',
                type: 'combat'
            },
            {
                text: '💰 贿赂',
                desc: '用瓶盖打发他们（损失金钱）',
                type: 'bribe'
            },
            {
                text: '🏃 逃跑',
                desc: '全速逃离（损失时间，可能翻车）',
                type: 'flee'
            }
        ]
    },
    merchant: {
        name: '神秘商人',
        icon: '🎭',
        desc: '一个戴着防毒面具的商人从暗处现身，手中晃动着闪光的旧世界货币...',
        baseChance: 0.12,
        choices: [
            {
                text: '🪙 交易旧世界货币',
                desc: '用旧世界货币换取传说级零件',
                type: 'trade_legendary'
            },
            {
                text: '💬 讨价还价',
                desc: '试着用瓶盖购买稀有物品',
                type: 'trade_caps'
            },
            {
                text: '👋 离开',
                desc: '无视他继续赶路',
                type: 'ignore'
            }
        ]
    },
    radiation: {
        name: '辐射风暴',
        icon: '☢️',
        desc: '地平线上涌来一片绿光闪烁的风暴云，辐射探测器疯狂鸣叫！',
        baseChance: 0.2,
        choices: [
            {
                text: '🏕️ 停车避险',
                desc: '找掩体等待风暴过去（消耗食物和时间）',
                type: 'shelter'
            },
            {
                text: '🚀 硬闯过去',
                desc: '全速冲过辐射区（乘员可能生病）',
                type: 'push_through'
            }
        ]
    },
    breakdown: {
        name: '车辆故障',
        icon: '🔧',
        desc: '引擎发出刺耳的金属声后熄火了，烟雾从引擎盖下冒出...',
        baseChance: 0.15,
        choices: [
            {
                text: '🔧 修理',
                desc: '尝试修复（机械师技能影响结果）',
                type: 'repair'
            },
            {
                text: '🚶 步行求援',
                desc: '派人去最近的城镇求助（消耗大量时间）',
                type: 'walk_help'
            }
        ]
    },
    abandoned: {
        name: '废弃车辆',
        icon: '🚛',
        desc: '路边停着一辆锈迹斑斑的废弃卡车，似乎还有些东西可以搜刮...',
        baseChance: 0.18,
        choices: [
            {
                text: '🔍 搜索',
                desc: '仔细搜索车辆（可能找到有价值的东西）',
                type: 'search'
            },
            {
                text: '⚠️ 警惕通过',
                desc: '可能是陷阱，小心绕过',
                type: 'avoid'
            }
        ]
    },
    survivor: {
        name: '幸存者',
        icon: '🧑',
        desc: '一个瘦弱的幸存者在路边挥手，请求搭载到下一个城镇...',
        baseChance: 0.15,
        choices: [
            {
                text: '🤝 搭载',
                desc: '好心搭载他（消耗食物，可能有好报）',
                type: 'pickup'
            },
            {
                text: '🚫 拒绝',
                desc: '在这个世界，信任是奢侈品',
                type: 'refuse'
            }
        ]
    }
};

const ORDER_CARGO_TYPES = [
    { name: '医疗物资', icon: '💊', dangerMult: 1.0 },
    { name: '武器弹药', icon: '🔫', dangerMult: 1.5 },
    { name: '食物补给', icon: '🍖', dangerMult: 0.8 },
    { name: '电子设备', icon: '📡', dangerMult: 1.2 },
    { name: '建筑材料', icon: '🧱', dangerMult: 0.6 },
    { name: '珍贵文物', icon: '🏺', dangerMult: 1.8 },
    { name: '核燃料', icon: '☢️', dangerMult: 2.0 },
    { name: '净水设备', icon: '💧', dangerMult: 1.0 }
];

// 用于旧世界货币交易的传说级物品池
const LEGENDARY_POOL = [
    'armor_reactive', 'engine_fusion', 'radar_tech', 'weapon_laser'
];

// ============================================================
// 成就系统数据
// ============================================================

const ACHIEVEMENT_CATEGORIES = {
    survival: { name: '生存之路', icon: '🛤️', desc: '在废土中挣扎求存' },
    trading: { name: '商人之道', icon: '💰', desc: '用瓶盖书写传奇' },
    mechanical: { name: '机械狂潮', icon: '🔧', desc: '打造终极战车' },
    combat: { name: '战斗荣耀', icon: '⚔️', desc: '用铁与火开路' },
    events: { name: '命运抉择', icon: '🎭', desc: '每个选择都有代价' },
    crew: { name: '乘员羁绊', icon: '👥', desc: '在末世中建立信任' },
    orders: { name: '订单传奇', icon: '📦', desc: '使命必达的快递人' },
    hidden: { name: '隐藏成就', icon: '❓', desc: '意料之外的发现' }
};

const ACHIEVEMENTS = {
    // === 生存之路 (6个) ===
    first_delivery: {
        id: 'first_delivery', category: 'survival', name: '第一步',
        desc: '完成第一次送货', icon: '👣',
        condition: { type: 'orders_completed', value: 1 },
        reward: { type: 'caps', value: 50 }, hidden: false
    },
    road_warrior: {
        id: 'road_warrior', category: 'survival', name: '公路战士',
        desc: '累计行驶500公里', icon: '🛣️',
        condition: { type: 'distance_traveled', value: 500 },
        reward: { type: 'caps', value: 100 }, hidden: false
    },
    wasteland_veteran: {
        id: 'wasteland_veteran', category: 'survival', name: '废土老兵',
        desc: '累计行驶2000公里', icon: '🏅',
        condition: { type: 'distance_traveled', value: 2000 },
        reward: { type: 'title', value: '废土老兵' }, hidden: false
    },
    explorer: {
        id: 'explorer', category: 'survival', name: '探险家',
        desc: '访问所有城镇', icon: '🗺️',
        condition: { type: 'all_towns_visited', value: true },
        reward: { type: 'caps', value: 200 }, hidden: false
    },
    fuel_miser: {
        id: 'fuel_miser', category: 'survival', name: '节油大师',
        desc: '单次旅行油耗低于基础值50%', icon: '⛽',
        condition: { type: 'fuel_efficient_trip', value: 0.5 },
        reward: { type: 'caps', value: 80 }, hidden: false
    },
    near_death: {
        id: 'near_death', category: 'survival', name: '死里逃生',
        desc: '车辆耐久低于5%时到达城镇', icon: '💀',
        condition: { type: 'arrive_low_hp', value: 5 },
        reward: { type: 'caps', value: 150 }, hidden: false
    },

    // === 商人之道 (7个) ===
    first_profit: {
        id: 'first_profit', category: 'trading', name: '初次盈利',
        desc: '第一次通过交易获利', icon: '🪙',
        condition: { type: 'first_trade_profit', value: true },
        reward: { type: 'caps', value: 30 }, hidden: false
    },
    trade_master: {
        id: 'trade_master', category: 'trading', name: '交易大师',
        desc: '累计交易利润达到2000瓶盖', icon: '💹',
        condition: { type: 'total_trade_profit', value: 2000 },
        reward: { type: 'caps', value: 200 }, hidden: false
    },
    buy_low_sell_high: {
        id: 'buy_low_sell_high', category: 'trading', name: '低买高卖',
        desc: '单次交易利润超过200%', icon: '📈',
        condition: { type: 'single_trade_profit_pct', value: 200 },
        reward: { type: 'caps', value: 100 }, hidden: false
    },
    market_monopoly: {
        id: 'market_monopoly', category: 'trading', name: '市场垄断',
        desc: '同时持有5种以上商品', icon: '🏬',
        condition: { type: 'hold_goods_types', value: 5 },
        reward: { type: 'caps', value: 80 }, hidden: false
    },
    caps_hoarder: {
        id: 'caps_hoarder', category: 'trading', name: '瓶盖囤积者',
        desc: '同时持有3000瓶盖', icon: '🏦',
        condition: { type: 'caps_held', value: 3000 },
        reward: { type: 'caps', value: 150 }, hidden: false
    },
    black_market: {
        id: 'black_market', category: 'trading', name: '黑市常客',
        desc: '与神秘商人交易5次', icon: '🎭',
        condition: { type: 'merchant_trades', value: 5 },
        reward: { type: 'unlock_mod', value: 'engine_blackmarket' }, hidden: false
    },
    old_world_collector: {
        id: 'old_world_collector', category: 'trading', name: '旧世界收藏家',
        desc: '累计获得10枚旧世界货币', icon: '🏛️',
        condition: { type: 'old_coins_collected', value: 10 },
        reward: { type: 'caps', value: 300 }, hidden: false
    },

    // === 机械狂潮 (7个) ===
    first_mod: {
        id: 'first_mod', category: 'mechanical', name: '改装入门',
        desc: '安装第一个改装件', icon: '🔩',
        condition: { type: 'mods_installed', value: 1 },
        reward: { type: 'caps', value: 30 }, hidden: false
    },
    full_set: {
        id: 'full_set', category: 'mechanical', name: '套装收集者',
        desc: '激活任意一个套装效果', icon: '🎴',
        condition: { type: 'set_bonus_activated', value: 1 },
        reward: { type: 'caps', value: 100 }, hidden: false
    },
    legendary_collector: {
        id: 'legendary_collector', category: 'mechanical', name: '传说收藏',
        desc: '拥有3件传说级改装件', icon: '🌟',
        condition: { type: 'legendary_mods_owned', value: 3 },
        reward: { type: 'unlock_mod', value: 'weapon_wargod' }, hidden: false
    },
    all_slots_filled: {
        id: 'all_slots_filled', category: 'mechanical', name: '全副武装',
        desc: '同时装满所有5个改装槽', icon: '🛡️',
        condition: { type: 'all_slots_equipped', value: true },
        reward: { type: 'caps', value: 120 }, hidden: false
    },
    repair_master: {
        id: 'repair_master', category: 'mechanical', name: '修理专家',
        desc: '累计修理车辆20次', icon: '🔧',
        condition: { type: 'total_repairs', value: 20 },
        reward: { type: 'unlock_mod', value: 'tool_universal' }, hidden: false
    },
    speed_demon: {
        id: 'speed_demon', category: 'mechanical', name: '速度恶魔',
        desc: '车辆速度属性达到80以上', icon: '💨',
        condition: { type: 'vehicle_speed', value: 80 },
        reward: { type: 'caps', value: 100 }, hidden: false
    },
    iron_fortress: {
        id: 'iron_fortress', category: 'mechanical', name: '铁壁堡垒',
        desc: '车辆装甲属性达到60以上', icon: '🏰',
        condition: { type: 'vehicle_armor', value: 60 },
        reward: { type: 'caps', value: 100 }, hidden: false
    },

    // === 战斗荣耀 (6个) ===
    first_blood: {
        id: 'first_blood', category: 'combat', name: '初战告捷',
        desc: '赢得第一次战斗', icon: '🗡️',
        condition: { type: 'combats_won', value: 1 },
        reward: { type: 'caps', value: 50 }, hidden: false
    },
    battle_hardened: {
        id: 'battle_hardened', category: 'combat', name: '身经百战',
        desc: '累计赢得10次战斗', icon: '⚔️',
        condition: { type: 'combats_won', value: 10 },
        reward: { type: 'caps', value: 200 }, hidden: false
    },
    pacifist: {
        id: 'pacifist', category: 'combat', name: '和平主义者',
        desc: '连续5次遭遇战斗选择非暴力解决', icon: '☮️',
        condition: { type: 'consecutive_peaceful', value: 5 },
        reward: { type: 'caps', value: 150 }, hidden: false
    },
    bandit_bane: {
        id: 'bandit_bane', category: 'combat', name: '强盗克星',
        desc: '击退20波强盗', icon: '🏴',
        condition: { type: 'bandits_defeated', value: 20 },
        reward: { type: 'caps', value: 250 }, hidden: false
    },
    no_damage: {
        id: 'no_damage', category: 'combat', name: '毫发无损',
        desc: '一次战斗中零伤害获胜', icon: '✨',
        condition: { type: 'flawless_victory', value: 1 },
        reward: { type: 'caps', value: 100 }, hidden: false
    },
    bribe_master: {
        id: 'bribe_master', category: 'combat', name: '贿赂大师',
        desc: '累计贿赂强盗花费超过500瓶盖', icon: '💸',
        condition: { type: 'total_bribe_spent', value: 500 },
        reward: { type: 'caps', value: 80 }, hidden: false
    },

    // === 命运抉择 (7个) ===
    event_survivor: {
        id: 'event_survivor', category: 'events', name: '事件幸存者',
        desc: '经历20次随机事件', icon: '🎲',
        condition: { type: 'events_handled', value: 20 },
        reward: { type: 'caps', value: 100 }, hidden: false
    },
    radiation_walker: {
        id: 'radiation_walker', category: 'events', name: '辐射行者',
        desc: '成功穿越5次辐射风暴', icon: '☢️',
        condition: { type: 'radiation_survived', value: 5 },
        reward: { type: 'caps', value: 120 }, hidden: false
    },
    lucky_star: {
        id: 'lucky_star', category: 'events', name: '幸运星',
        desc: '连续3次事件获得正面结果', icon: '⭐',
        condition: { type: 'consecutive_good_events', value: 3 },
        reward: { type: 'caps', value: 100 }, hidden: false
    },
    good_samaritan: {
        id: 'good_samaritan', category: 'events', name: '好撒玛利亚人',
        desc: '搭载5名幸存者', icon: '🤝',
        condition: { type: 'survivors_helped', value: 5 },
        reward: { type: 'caps', value: 150 }, hidden: false
    },
    scavenger: {
        id: 'scavenger', category: 'events', name: '拾荒专家',
        desc: '成功搜索10辆废弃车辆', icon: '🔍',
        condition: { type: 'vehicles_searched', value: 10 },
        reward: { type: 'caps', value: 100 }, hidden: false
    },
    breakdown_survivor: {
        id: 'breakdown_survivor', category: 'events', name: '故障克星',
        desc: '成功修复8次车辆故障事件', icon: '🛠️',
        condition: { type: 'breakdowns_fixed', value: 8 },
        reward: { type: 'caps', value: 120 }, hidden: false
    },
    event_variety: {
        id: 'event_variety', category: 'events', name: '百态人生',
        desc: '经历过所有6种事件类型', icon: '🌈',
        condition: { type: 'all_event_types_seen', value: true },
        reward: { type: 'caps', value: 200 }, hidden: false
    },

    // === 乘员羁绊 (7个) ===
    first_recruit: {
        id: 'first_recruit', category: 'crew', name: '初次招募',
        desc: '招募第一名乘员', icon: '🤝',
        condition: { type: 'crew_recruited', value: 1 },
        reward: { type: 'caps', value: 30 }, hidden: false
    },
    full_crew: {
        id: 'full_crew', category: 'crew', name: '满员出发',
        desc: '同时拥有3名乘员', icon: '👥',
        condition: { type: 'crew_count', value: 3 },
        reward: { type: 'caps', value: 80 }, hidden: false
    },
    crew_diversity: {
        id: 'crew_diversity', category: 'crew', name: '各司其职',
        desc: '同时拥有3种不同职业的乘员', icon: '🎭',
        condition: { type: 'crew_all_roles', value: true },
        reward: { type: 'caps', value: 100 }, hidden: false
    },
    crew_level_up: {
        id: 'crew_level_up', category: 'crew', name: '经验丰富',
        desc: '任一乘员达到5级', icon: '📈',
        condition: { type: 'crew_max_level', value: 5 },
        reward: { type: 'caps', value: 120 }, hidden: false
    },
    crew_healer: {
        id: 'crew_healer', category: 'crew', name: '妙手回春',
        desc: '治愈10次乘员伤病', icon: '💊',
        condition: { type: 'crew_healed', value: 10 },
        reward: { type: 'caps', value: 100 }, hidden: false
    },
    sanity_keeper: {
        id: 'sanity_keeper', category: 'crew', name: '心灵守护',
        desc: '全程保持所有乘员理智值在50以上', icon: '🧠',
        condition: { type: 'crew_sanity_maintained', value: 50 },
        reward: { type: 'caps', value: 150 }, hidden: false
    },
    crew_veteran: {
        id: 'crew_veteran', category: 'crew', name: '老战友',
        desc: '同一乘员随行完成10次送货', icon: '🎖️',
        condition: { type: 'crew_deliveries', value: 10 },
        reward: { type: 'caps', value: 200 }, hidden: false
    },

    // === 订单传奇 (7个) ===
    order_starter: {
        id: 'order_starter', category: 'orders', name: '新手快递员',
        desc: '完成3个订单', icon: '📦',
        condition: { type: 'orders_completed', value: 3 },
        reward: { type: 'caps', value: 80 }, hidden: false
    },
    order_expert: {
        id: 'order_expert', category: 'orders', name: '资深快递员',
        desc: '完成10个订单', icon: '📬',
        condition: { type: 'orders_completed', value: 10 },
        reward: { type: 'caps', value: 200 }, hidden: false
    },
    speed_delivery: {
        id: 'speed_delivery', category: 'orders', name: '闪电快递',
        desc: '在时限的50%内完成一个订单', icon: '⚡',
        condition: { type: 'fast_delivery', value: 50 },
        reward: { type: 'caps', value: 120 }, hidden: false
    },
    dangerous_cargo: {
        id: 'dangerous_cargo', category: 'orders', name: '危险品专家',
        desc: '完成5个危险系数≥1.5的订单', icon: '☣️',
        condition: { type: 'dangerous_orders', value: 5 },
        reward: { type: 'caps', value: 150 }, hidden: false
    },
    long_haul: {
        id: 'long_haul', category: 'orders', name: '长途跋涉',
        desc: '完成一个路程≥300公里的订单', icon: '🛤️',
        condition: { type: 'long_distance_order', value: 300 },
        reward: { type: 'caps', value: 100 }, hidden: false
    },
    perfect_delivery: {
        id: 'perfect_delivery', category: 'orders', name: '完美送达',
        desc: '完成一个订单且车辆耐久度≥90%', icon: '🏆',
        condition: { type: 'perfect_order', value: 90 },
        reward: { type: 'caps', value: 100 }, hidden: false
    },
    legendary_courier: {
        id: 'legendary_courier', category: 'orders', name: '传奇快递员',
        desc: '完成所有主线订单', icon: '👑',
        condition: { type: 'all_main_orders', value: true },
        reward: { type: 'unlock_vehicle', value: 'iron_fortress' }, hidden: false
    },

    // === 隐藏成就 (6个) ===
    ghost_rider: {
        id: 'ghost_rider', category: 'hidden', name: '幽灵骑士',
        desc: '在夜间（0燃油）到达城镇', icon: '👻',
        condition: { type: 'arrive_no_fuel', value: true },
        reward: { type: 'caps', value: 200 }, hidden: true
    },
    all_in: {
        id: 'all_in', category: 'hidden', name: '孤注一掷',
        desc: '瓶盖归零后完成一次送货', icon: '🎰',
        condition: { type: 'deliver_broke', value: true },
        reward: { type: 'caps', value: 300 }, hidden: true
    },
    merchant_friend: {
        id: 'merchant_friend', category: 'hidden', name: '商人之友',
        desc: '在同一个城镇买卖同一种商品3次', icon: '🤡',
        condition: { type: 'same_town_trade', value: 3 },
        reward: { type: 'caps', value: 100 }, hidden: true
    },
    road_rage: {
        id: 'road_rage', category: 'hidden', name: '公路狂怒',
        desc: '连续3次选择战斗解决遭遇', icon: '😤',
        condition: { type: 'consecutive_fights', value: 3 },
        reward: { type: 'caps', value: 120 }, hidden: true
    },
    walking_dead: {
        id: 'walking_dead', category: 'hidden', name: '行尸走肉',
        desc: '所有乘员同时处于生病状态', icon: '🧟',
        condition: { type: 'all_crew_sick', value: true },
        reward: { type: 'caps', value: 150 }, hidden: true
    },
    completionist: {
        id: 'completionist', category: 'hidden', name: '完美主义者',
        desc: '解锁除隐藏成就外的所有成就', icon: '🌟',
        condition: { type: 'all_non_hidden_unlocked', value: true },
        reward: { type: 'title', value: '废土传奇' }, hidden: true
    }
};

// 成就解锁的特殊改装件
const SPECIAL_MODS = {
    engine_blackmarket: {
        name: '黑市引擎', type: 'engine', set: 'tech', rarity: 'legendary',
        stats: { speed: 45, fuelEfficiency: 30 }, price: 0,
        desc: '来历不明的高性能引擎，传说由战前工厂秘密生产'
    },
    weapon_wargod: {
        name: '战神之矛', type: 'weapon', set: 'military', rarity: 'legendary',
        stats: { combatBonus: 55, armor: 5 }, price: 0,
        desc: '由传说级零件熔铸而成的终极武器'
    },
    tool_universal: {
        name: '万能扳手', type: 'radar', set: 'salvage', rarity: 'legendary',
        stats: { detection: 30, repairBonus: 50 }, price: 0,
        desc: '修理大师的毕生心血，可以修好任何东西'
    }
};

// 成就解锁的特殊载具皮肤
const SPECIAL_VEHICLES = {
    iron_fortress: {
        name: '钢铁堡垒',
        desc: '传奇快递员的终极座驾，集攻防于一体',
        bonusStats: { armor: 20, speed: 10, cargoSpace: 5 }
    }
};
