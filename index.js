import mineflayer from 'mineflayer';
import fs from 'fs';
import mineflayerPathfinder from 'mineflayer-pathfinder';
const { pathfinder, Movements, goals } = mineflayerPathfinder;
import mcDataFactory from 'minecraft-data';
import { loader as autoeat } from 'mineflayer-auto-eat';
import armorManager from 'mineflayer-armor-manager';

// --- TẢI CẤU HÌNH ---
let config;
try {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
} catch (err) {
    console.error("❌ Lỗi: Không đọc được file config.json! Vui lòng kiểm tra lại file.");
    process.exit(1);
}

let bot;
let afkLoop;
let mcData;

// Giao diện Log đẹp mắt hơn
function log(type, msg, detail = "") {
    const time = new Date().toLocaleTimeString();
    const icons = { info: "ℹ️", success: "✅", warn: "⚠️", error: "❌", combat: "⚔️", brain: "🧠", debug: "🐛" };
    console.log(`[${time}] ${icons[type] || "•"} [${type.toUpperCase()}]: ${msg}`);
    if (detail) console.log(`   └─ ➤ ${detail}`);
}

// Hàm giải toán an toàn
function solveMath(expression) {
    try {
        const parts = expression.match(/(\d+)\s*([\+\-\*])\s*(\d+)/);
        if (!parts) return null;
        const a = parseInt(parts[1]);
        const op = parts[2];
        const b = parseInt(parts[3]);

        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            default: return null;
        }
    } catch (e) {
        return null;
    }
}

function createBot() {
    log('info', 'Đang kết nối tới server...', `IP: ${config.server_info.ip} | Port: ${config.server_info.port} | User: ${config.bot_account.username}`);

    bot = mineflayer.createBot({
        host: config.server_info.ip,
        port: config.server_info.port,
        username: config.bot_account.username,
        version: (config.server_info.version === "false" || config.server_info.version === false) ? false : config.server_info.version,
        auth: config.bot_account.auth_type,
        password: config.bot_account.password,
        viewDistance: "tiny",
        checkTimeoutInterval: 90000
    });

    // Load Plugins
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(autoeat);
    bot.loadPlugin(armorManager);

    // Xử lý các sự kiện kết nối & Lỗi chi tiết
    bot.on('kicked', (reason, loggedIn) => {
        let reasonText = reason;
        try {
            const parsed = JSON.parse(reason);
            reasonText = parsed.text || parsed.extra?.map(e => e.text).join('') || reason;
        } catch (e) { }
        log('warn', `Bị server kick!`, `Lý do: ${reasonText}`);
    });

    bot.on('error', (err) => {
        let msg = err.message;
        let suggestion = "Lỗi chưa xác định. Kiểm tra lại mạng hoặc server.";

        if (msg.includes('ECONNREFUSED')) {
            suggestion = "Server đang TẮT hoặc SAI IP/PORT. Aternos có thể đã tự đóng.";
        } else if (msg.includes('ETIMEDOUT') || msg.includes('socket hung up')) {
            suggestion = "Mạng quá yếu hoặc Server bị lag (Timeout).";
        } else if (msg.includes('decoder') || msg.includes('packet')) {
            suggestion = "Sai phiên bản (Version) hoặc plugin antibot chặn.";
        }

        log('error', `Lỗi kết nối nghiêm trọng!`, `${msg} -> ${suggestion}`);
    });

    bot.on('end', (reason) => {
        log('warn', `Bot đã ngắt kết nối.`, `Lý do: ${reason}`);
        clearInterval(afkLoop);
        if (config.features.auto_reconnect) {
            log('info', 'Đang chờ 15s để kết nối lại...');
            setTimeout(createBot, 15000);
        }
    });

    setupEvents();
}

function setupEvents() {
    bot.once('spawn', () => {
        mcData = mcDataFactory(bot.version);
        log('success', `Bot đã vào server thành công! (Ver: ${bot.version})`);

        // Khởi tạo movements
        const defaultMove = new Movements(bot, mcData);
        bot.pathfinder.setMovements(defaultMove);

        // Auto Accept Resource Pack
        if (config.features.accept_resource_pack) {
            log('info', 'Đang chờ Resource Pack...');
        }

        // Cấu hình AutoEat
        if (config.features.auto_eat) {
            bot.autoeat.options.priority = 'foodValue';
            bot.autoeat.options.bannedFood = [];
            bot.autoeat.options.eatingTimeout = 3.0; // seconds
            log('info', 'Đã kích hoạt Chế độ Tự động ăn.');
        }

        // Cấu hình Armor Manager
        if (config.features.auto_equip) {
            bot.armorManager.equipAll();
            log('info', 'Đã kích hoạt Chế độ Tự động mặc giáp.');
        }

        // --- ENTRY LOGIC & ANTI-BOT BYPASS ---
        log('info', 'Đang thực hiện hành động giống người thật để qua mặt Anti-Bot...');

        // Nhìn quanh ngẫu nhiên ngay khi vào
        bot.look(bot.entity.yaw + (Math.random() - 0.5), 0);

        setTimeout(() => {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);

            // Di chuyển nhẹ
            bot.setControlState('forward', true);
            setTimeout(() => {
                bot.setControlState('forward', false);
                log('success', 'Đã hoàn tất thủ tục nhập cảnh. Bắt đầu AFK.');
                startSmartAFK();
            }, 1000);
        }, 1500);
    });

    bot.on('resourcePack', (url, hash) => {
        if (config.features.accept_resource_pack) {
            log('info', 'Phát hiện Resource Pack từ server.', 'Đang tự động chấp nhận...');
            bot.acceptResourcePack();
        }
    });

    // 1. CHAT & AUTH & CAPTCHA
    bot.on('messagestr', (msg, type) => {
        if (type === 'game_info') return; // Bỏ qua thanh action bar

        const m = msg.toLowerCase();

        // Solve Math Captcha
        if (config.features.solve_math_captcha) {
            const mathRegex = /(\d+)\s*([\+\-\*])\s*(\d+)/;
            if (mathRegex.test(m)) {
                const res = solveMath(m);
                if (res !== null) {
                    log('brain', `Giải Captcha: ${msg}`, `Kết quả: ${res}`);
                    bot.chat(res.toString());
                }
            }
        }

        // Robust Auth Detection
        // Regex bắt được nhiều dạng login/register hơn, kể cả tiếng Anh/Việt/Custom
        const authPatterns = [
            /register\s+(\S+)\s+(\S+)/i,          // /register pass pass
            /login\s+(\S+)/i,                     // /login pass
            /nhập\s+lệnh\s+\/login\s+<mật khẩu>/i,
            /nhập\s+lệnh\s+\/register\s+<mật khẩu>\s+<nhập lại mật khẩu>/i,
            /use\s+\/login\s+<password>/i,
            /use\s+\/register\s+<password>\s+<password>/i
        ];

        let isAuth = false;

        if (m.includes('/register') || m.includes('register') && (m.includes('password') || m.includes('mật khẩu'))) {
            const cmd = config.auth_settings?.register_cmd || "/register {pass} {pass}";
            const finalCmd = cmd.replace(/{pass}/g, config.bot_account.password);
            log('info', 'Phát hiện yêu cầu Đăng ký', `Thực thi: ${finalCmd}`);
            bot.chat(finalCmd);
            isAuth = true;
        } else if (m.includes('/login') || m.includes('login') && (m.includes('password') || m.includes('mật khẩu'))) {
            const cmd = config.auth_settings?.login_cmd || "/login {pass}";
            const finalCmd = cmd.replace(/{pass}/g, config.bot_account.password);
            log('info', 'Phát hiện yêu cầu Đăng nhập', `Thực thi: ${finalCmd}`);
            bot.chat(finalCmd);
            isAuth = true;
        }
    });

    // 2. TỰ VỆ
    bot.on('entityHurt', (entity) => {
        if (entity === bot.entity && config.features.combat_self_defense) {
            const attacker = bot.nearestEntity(e => (e.type === 'player' || e.type === 'mob') && e.position.distanceTo(bot.entity.position) < 4);
            if (attacker) {
                log('combat', `Đang bị ${attacker.name || 'Quái'} đánh!`, 'Phản công!');
                bot.lookAt(attacker.position.offset(0, attacker.height, 0));
                bot.attack(attacker);
            }
        }
    });

    // 3. SMART ANTI-AFK
    let isBusy = false;

    async function startSmartAFK() {
        if (afkLoop) clearInterval(afkLoop);

        afkLoop = setInterval(async () => {
            if (!bot.entity || isBusy) return;

            // Health check - Tự động mặc giáp nếu có đồ mới
            if (config.features.auto_equip) {
                bot.armorManager.equipAll();
            }

            // Đi ngủ
            if (config.features.auto_sleep && (bot.time.timeOfDay >= 13000 || bot.isRaining)) {
                const bed = bot.findBlock({
                    matching: blk => blk.name.includes('bed'),
                    maxDistance: 32
                });

                if (bed && !bot.isSleeping) {
                    isBusy = true;
                    log('info', 'Tìm thấy giường, đang đi ngủ...');
                    try {
                        await bot.pathfinder.goto(new goals.GoalGetToBlock(bed.position.x, bed.position.y, bed.position.z));
                        await bot.sleep(bed);
                        log('success', 'Đã ngủ.');
                    } catch (err) {
                        log('warn', 'Lỗi khi đi ngủ:', err.message);
                    } finally {
                        isBusy = false;
                    }
                    return;
                }
            }

            // Hành động ngẫu nhiên để lách Anti-AFK
            const r = Math.random();
            if (r < 0.15) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 400);
            } else if (r < 0.30) {
                bot.setControlState('sneak', true);
                setTimeout(() => bot.setControlState('sneak', false), 800);
            } else if (r < 0.45) {
                const yaw = bot.entity.yaw + (Math.random() - 0.5) * 2;
                const pitch = (Math.random() - 0.5);
                bot.look(yaw, pitch);
            } else if (r < 0.55) {
                bot.swingArm('right');
            } else if (r < 0.65) {
                // Di chuyển một bước nhỏ
                const p = bot.entity.position;
                const offX = (Math.random() - 0.5) * 2;
                const offZ = (Math.random() - 0.5) * 2;
                bot.pathfinder.setGoal(new goals.GoalNear(p.x + offX, p.y, p.z + offZ, 0));
            } else if (r < 0.05) {
                const msg = config.messages[Math.floor(Math.random() * config.messages.length)];
                bot.chat(`${msg} [${Math.floor(Math.random() * 9999)}]`);
            }

        }, 15000);
    }
}

// Chạy bot
createBot();