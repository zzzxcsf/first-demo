const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// 游戏设置
const gridSize = 20;
const tileCount = canvas.width / gridSize;
let snake = [{x: 10, y: 10}];
let food = {x: 15, y: 15};
let dx = 1; // 水平方向速度
let dy = 0; // 垂直方向速度
let score = 0;
let gameLoop;
let isPaused = false;
let gameSpeed = 100; // 默认中等难度
let isGameActive = false;
let obstacles = []; // 障碍物数组
let obstacleSpawnTimer; // 障碍物生成定时器
const OBSTACLE_SPAWN_INTERVAL = 10000; // 障碍物生成间隔(毫秒)
const OBSTACLE_ANIMATION_DURATION = 800; // 障碍物生成动画持续时间(毫秒)

// 界面元素
const screens = {
    start: document.getElementById('startScreen'),
    difficulty: document.getElementById('difficultyScreen'),
    game: document.getElementById('gameScreen'),
    settings: document.getElementById('settingsScreen')
};

// 设置选项
const settings = {
    language: 'zh',
    sound: true
};

// 音频上下文
let audioContext;
let soundEnabled = settings.sound;

// 初始化音频
function initAudio() {
    if (!soundEnabled) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn('Web Audio API 不受支持，音效功能已禁用');
        soundEnabled = false;
    }
}

// 播放音效
function playSound(frequency, type = 'sine', duration = 0.1) {
    if (!soundEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

// 播放食物音效
function playFoodSound() {
    playSound(523.25, 'sine', 0.1); // C5 音符
}

// 播放游戏结束音效
function playGameOverSound() {
    playSound(196.00, 'triangle', 0.5); // G3 音符
}

// 语言文本
const langText = {
    zh: {
        gameTitle: '贪吃蛇游戏',
        startBtn: '开始游戏',
        settingsBtn: '设置',
        exitBtn: '退出游戏',
        difficultyTitle: '选择难度',
        easy: '简单',
        medium: '中等',
        hard: '困难',
        backBtn: '返回',
        settingsTitle: '设置',
        language: '语言',
        sound: '声音',
        saveBtn: '保存设置',
        score: '分数',
        pauseBtn: '暂停',
        gameOver: '游戏结束！最终分数: '
    },
    en: {
        gameTitle: 'Snake Game',
        startBtn: 'Start Game',
        settingsBtn: 'Settings',
        exitBtn: 'Exit',
        difficultyTitle: 'Select Difficulty',
        easy: 'Easy',
        medium: 'Medium',
        hard: 'Hard',
        backBtn: 'Back',
        settingsTitle: 'Settings',
        language: 'Language',
        sound: 'Sound',
        saveBtn: 'Save Settings',
        score: 'Score',
        pauseBtn: 'Pause',
        gameOver: 'Game Over! Final Score: '
    }
};

// 屏幕切换函数
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// 更新语言显示
function updateLanguage() {
    const text = langText[settings.language];
    document.querySelectorAll('h1')[0].textContent = text.gameTitle; // 开始界面标题
    document.querySelectorAll('h1')[1].textContent = text.difficultyTitle; // 难度界面标题
    document.querySelectorAll('h1')[2].textContent = text.gameTitle; // 游戏界面标题
    document.querySelectorAll('h1')[3].textContent = text.settingsTitle; // 设置界面标题
    document.getElementById('startBtn').textContent = text.startBtn;
    document.getElementById('settingsBtn').textContent = text.settingsBtn;
    document.getElementById('exitBtn').textContent = text.exitBtn;
    document.querySelector('.score').textContent = `${text.score}: `;
    document.getElementById('pauseBtn').textContent = text.pauseBtn;
    document.getElementById('backToStartBtn').textContent = text.backBtn;
    document.getElementById('backFromSettingsBtn').textContent = text.backBtn;
    document.getElementById('saveSettingsBtn').textContent = text.saveBtn;
    document.querySelector('.setting-item label[for="languageSelect"]').textContent = text.language;
    document.querySelector('.setting-item label[for="soundToggle"]').textContent = text.sound;
    
    const difficultyBtns = document.querySelectorAll('.difficulty-buttons button');
    difficultyBtns[0].textContent = text.easy;
    difficultyBtns[1].textContent = text.medium;
    difficultyBtns[2].textContent = text.hard;
}

// 生成障碍物
function generateObstacles(count) {
    for (let i = 0; i < count; i++) {
        let obstacle;
        do {
            obstacle = {
                x: Math.floor(Math.random() * tileCount),
                y: Math.floor(Math.random() * tileCount),
                animationStart: Date.now(), // 动画开始时间
                isAnimating: true // 是否正在动画中
            };
        } while (
            snake.some(segment => segment.x === obstacle.x && segment.y === obstacle.y) ||
            (obstacle.x === food.x && obstacle.y === food.y) ||
            obstacles.some(o => o.x === obstacle.x && o.y === obstacle.y)
        );
        obstacles.push(obstacle);
    }
}

// 初始化游戏
function initGame() {
    snake = [{x: 10, y: 10}];
    food = {x: 15, y: 15};
    dx = 1;
    dy = 0;
    score = 0;
    scoreElement.textContent = score;
    obstacles = [];
    generateFood();
    generateObstacles(5); // 初始生成5个障碍物
    
    // 启动障碍物定时生成器
    if (obstacleSpawnTimer) clearInterval(obstacleSpawnTimer);
    obstacleSpawnTimer = setInterval(() => {
        if (!isPaused && isGameActive) {
            generateObstacles(1);
        }
    }, OBSTACLE_SPAWN_INTERVAL);
}

// 开始游戏
function startGame() {
    if (gameLoop) clearInterval(gameLoop);
    initGame();
    isGameActive = true;
    gameLoop = setInterval(update, gameSpeed);
    showScreen('game');
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    // 防止反向移动
    if ((e.key === 'ArrowLeft' || e.key === 'a') && dx === 0) {
        dx = -1;
        dy = 0;
    } else if ((e.key === 'ArrowRight' || e.key === 'd') && dx === 0) {
        dx = 1;
        dy = 0;
    } else if ((e.key === 'ArrowUp' || e.key === 'w') && dy === 0) {
        dx = 0;
        dy = -1;
    } else if ((e.key === 'ArrowDown' || e.key === 's') && dy === 0) {
        dx = 0;
        dy = 1;
    } else if (e.key === ' ' && isGameActive) {
        // 空格键暂停/继续
        togglePause();
    }
});

// 暂停/继续游戏
function togglePause() {
    if (isPaused) {
        gameLoop = setInterval(update, gameSpeed);
        // 恢复障碍物生成定时器
        obstacleSpawnTimer = setInterval(() => {
            if (!isPaused && isGameActive) {
                generateObstacles(1);
            }
        }, OBSTACLE_SPAWN_INTERVAL);
        document.getElementById('pauseBtn').textContent = langText[settings.language].pauseBtn;
        isPaused = false;
    } else {
        clearInterval(gameLoop);
        // 暂停障碍物生成定时器
        if (obstacleSpawnTimer) clearInterval(obstacleSpawnTimer);
        document.getElementById('pauseBtn').textContent = langText[settings.language].startBtn;
        isPaused = true;
    }
}

// 事件监听器 - 菜单按钮
 document.getElementById('startBtn').addEventListener('click', () => showScreen('difficulty'));
 document.getElementById('settingsBtn').addEventListener('click', () => showScreen('settings'));
 document.getElementById('exitBtn').addEventListener('click', () => window.close());
 document.getElementById('backToStartBtn').addEventListener('click', () => showScreen('start'));
 document.getElementById('backFromSettingsBtn').addEventListener('click', () => showScreen('start'));

// 事件监听器 - 难度选择
 document.querySelectorAll('.difficulty-buttons button').forEach(button => {
     button.addEventListener('click', () => {
         gameSpeed = parseInt(button.dataset.speed);
         document.querySelectorAll('.difficulty-buttons button').forEach(btn => btn.classList.remove('active'));
         button.classList.add('active');
         startGame();
     });
 });

// 事件监听器 - 暂停按钮
 document.getElementById('pauseBtn').addEventListener('click', togglePause);

// 事件监听器 - 设置保存
 document.getElementById('saveSettingsBtn').addEventListener('click', () => {
     settings.language = document.getElementById('languageSelect').value;
     settings.sound = document.getElementById('soundToggle').checked;
     soundEnabled = settings.sound;
     if (soundEnabled && !audioContext) {
         initAudio();
     }
     updateLanguage();
     showScreen('start');
 });

// 初始化音频
 initAudio();
 // 初始化语言
 updateLanguage();
 // 默认选中中等难度
 document.querySelector('.difficulty-buttons button[data-speed="100"]').classList.add('active');

// 生成新食物位置
function generateFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    // 确保食物不会出现在蛇身上或障碍物上
    if (snake.some(segment => segment.x === food.x && segment.y === food.y) ||
        obstacles.some(o => o.x === food.x && o.y === food.y)) {
        generateFood();
    }
}

// 绘制游戏元素
function draw() {
    // 清空画布
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制墙壁边框
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // 绘制障碍物
    obstacles.forEach(obstacle => {
        ctx.save();
        const x = obstacle.x * gridSize + gridSize / 2;
        const y = obstacle.y * gridSize + gridSize / 2;
        ctx.translate(x, y);
        
        // 计算动画进度
        if (obstacle.isAnimating) {
            const elapsed = Date.now() - obstacle.animationStart;
            const progress = Math.min(elapsed / OBSTACLE_ANIMATION_DURATION, 1);
            
            // 呼吸动画效果: 使用正弦函数创建缩放+透明度变化
            const pulse = Math.sin(progress * Math.PI * 2) * 0.2 + 0.8;
            const scale = 0.5 + progress * 0.5 * pulse;
            const alpha = progress;
            
            ctx.globalAlpha = alpha;
            ctx.scale(scale, scale);
            
            // 动画结束
            if (progress === 1) {
                obstacle.isAnimating = false;
            }
        }
        
        ctx.fillStyle = '#795548'; // 棕色障碍物
        ctx.beginPath();
        ctx.arc(0, 0, gridSize / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        
        // 障碍物高光效果
        if (!obstacle.isAnimating) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.arc(-gridSize / 6, -gridSize / 6, gridSize / 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });

    // 绘制蛇
    snake.forEach((segment, index) => {
        ctx.save();
        const x = segment.x * gridSize + gridSize / 2;
        const y = segment.y * gridSize + gridSize / 2;
        ctx.translate(x, y);

        // 蛇头
        if (index === 0) {
            ctx.fillStyle = '#2E7D32';
            ctx.beginPath();
            ctx.arc(0, 0, gridSize / 2 - 1, 0, Math.PI * 2);
            ctx.fill();

            // 眼睛
            ctx.fillStyle = 'white';
            const eyeSize = gridSize / 8;
            if (dx === 1) {
                ctx.beginPath();
                ctx.arc(gridSize / 4, -gridSize / 6, eyeSize, 0, Math.PI * 2);
                ctx.arc(gridSize / 4, gridSize / 6, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            } else if (dx === -1) {
                ctx.beginPath();
                ctx.arc(-gridSize / 4, -gridSize / 6, eyeSize, 0, Math.PI * 2);
                ctx.arc(-gridSize / 4, gridSize / 6, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            } else if (dy === -1) {
                ctx.beginPath();
                ctx.arc(-gridSize / 6, -gridSize / 4, eyeSize, 0, Math.PI * 2);
                ctx.arc(gridSize / 6, -gridSize / 4, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            } else if (dy === 1) {
                ctx.beginPath();
                ctx.arc(-gridSize / 6, gridSize / 4, eyeSize, 0, Math.PI * 2);
                ctx.arc(gridSize / 6, gridSize / 4, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // 瞳孔
            ctx.fillStyle = 'black';
            const pupilSize = eyeSize / 2;
            if (dx === 1) {
                ctx.beginPath();
                ctx.arc(gridSize / 4 + eyeSize/2, -gridSize / 6, pupilSize, 0, Math.PI * 2);
                ctx.arc(gridSize / 4 + eyeSize/2, gridSize / 6, pupilSize, 0, Math.PI * 2);
                ctx.fill();
            } else if (dx === -1) {
                ctx.beginPath();
                ctx.arc(-gridSize / 4 - eyeSize/2, -gridSize / 6, pupilSize, 0, Math.PI * 2);
                ctx.arc(-gridSize / 4 - eyeSize/2, gridSize / 6, pupilSize, 0, Math.PI * 2);
                ctx.fill();
            } else if (dy === -1) {
                ctx.beginPath();
                ctx.arc(-gridSize / 6, -gridSize / 4 - eyeSize/2, pupilSize, 0, Math.PI * 2);
                ctx.arc(gridSize / 6, -gridSize / 4 - eyeSize/2, pupilSize, 0, Math.PI * 2);
                ctx.fill();
            } else if (dy === 1) {
                ctx.beginPath();
                ctx.arc(-gridSize / 6, gridSize / 4 + eyeSize/2, pupilSize, 0, Math.PI * 2);
                ctx.arc(gridSize / 6, gridSize / 4 + eyeSize/2, pupilSize, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // 蛇身
            ctx.fillStyle = index % 2 === 0 ? '#4CAF50' : '#8BC34A';
            ctx.beginPath();
            ctx.arc(0, 0, gridSize / 2 - 1, 0, Math.PI * 2);
            ctx.fill();

            // 身体纹路
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.arc(0, 0, gridSize / 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });

    // 绘制食物
    ctx.save();
    const foodX = food.x * gridSize + gridSize / 2;
    const foodY = food.y * gridSize + gridSize / 2;
    ctx.translate(foodX, foodY);

    // 苹果形状
    ctx.fillStyle = '#E53935';
    ctx.beginPath();
    ctx.arc(0, 0, gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // 苹果顶部
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.ellipse(0, -gridSize / 2 + 5, gridSize / 8, gridSize / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 高光效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(-gridSize / 6, -gridSize / 6, gridSize / 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// 更新游戏状态
function update() {
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};

    // 穿墙逻辑
    if (head.x < 0) head.x = tileCount - 1;
    else if (head.x >= tileCount) head.x = 0;
    if (head.y < 0) head.y = tileCount - 1;
    else if (head.y >= tileCount) head.y = 0;

    // 碰撞检测（自身）
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        clearInterval(gameLoop);
        if (obstacleSpawnTimer) clearInterval(obstacleSpawnTimer);
        playGameOverSound();
        alert(`${langText[settings.language].gameOver}${score}`);
        location.reload();
        return;
    }

    // 碰撞检测（障碍物）
    if (obstacles.some(o => o.x === head.x && o.y === head.y)) {
        clearInterval(gameLoop);
        playGameOverSound();
        alert(`${langText[settings.language].gameOver}${score}`);
        location.reload();
        return;
    }

    snake.unshift(head);

    // 吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        generateFood();
        playFoodSound();
    } else {
        snake.pop();
    }

    draw();
}

// 开始游戏
generateFood();
// 初始状态为暂停，按钮显示"开始"
document.getElementById('pauseBtn').textContent = '开始';

// 暂停按钮事件监听
document.getElementById('pauseBtn').addEventListener('click', () => {
    if (isPaused) {
        // 开始游戏
        gameLoop = setInterval(update, gameSpeed);
        document.getElementById('pauseBtn').textContent = '暂停';
        isPaused = false;
    } else {
        // 暂停游戏
        clearInterval(gameLoop);
        document.getElementById('pauseBtn').textContent = '继续';
        isPaused = true;
    }
});

// 难度选择事件监听
const difficultyButtons = document.querySelectorAll('.difficulty button');
difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        gameSpeed = parseInt(button.dataset.speed);
        difficultyButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        if (!isPaused) {
            clearInterval(gameLoop);
            gameLoop = setInterval(update, gameSpeed);
        }
    });
});

// 默认选中中等难度
document.querySelector('.difficulty button[data-speed="100"]').classList.add('active');