# Bobble Pop — Neon Orbit Edition

## English

### Overview
Bobble Pop — Neon Orbit Edition is a rebuilt Bubble Shooter game made with pure HTML5 Canvas. It runs independently  any external template folder.

### How to Run
1. Open the `BobblePop_Neon` folder.
2. Double-click `index.html`.
3. Use a modern browser such as Chrome, Edge, or Firefox.

If your browser blocks asset loading when opened through `file://`, run a small local server instead:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

### Controls
- **Mouse / Touch:** move to aim, click or tap to shoot
- **A / D** or **Left / Right Arrow:** rotate aim
- **Space:** shoot
- **S:** swap the current bubble with the next bubble
- **P** or **Esc:** pause / resume
- **R:** restart
- **M:** mute / unmute audio

### Power-ups
- **Bomb:** explodes surrounding bubbles
- **Fire Starter:** burns one full row and drops bubbles below that row
- **Clock:** freezes the descending orbit for 15 seconds so the player can clear more bubbles

### Features
- English UI
- Neon responsive interface for desktop and mobile
- Combo system and floating score feedback
- Falling disconnected clusters with bonus points
- Animated particles, pop bursts, trails, screen shake, and glow effects
- Background music and gameplay sound effects
- Local high-score saving with LocalStorage
- Multiple extra image and audio assets for future editing

### Project Structure
```text
BobblePop_Neon/
├── assets/
│   ├── animations/
│   ├── audio/
│   └── images/
├── bobblePop.html
├── game.js
├── index.html
├── styles.css
├── POWERUPS.md
└── README.md
```

### Main Asset Folders
- `assets/images/backgrounds/`: extra neon backgrounds
- `assets/images/powerups/`: bomb, fire starter, and clock icons
- `assets/images/bubbles/`: bubble sprites
- `assets/animations/`: pop and sparkle spritesheets
- `assets/audio/`: main music and sound effects
- `assets/audio/extras/`: extra music loops and UI sounds

### Recent Updates
- Fixed the black canvas/loading issue
- Added fallback loading background
- Added extra backgrounds and audio assets
- Added Bomb, Fire Starter, and Clock power-ups
- Restored the properly centered V4 shooter alignment
- Converted the full in-game UI to English

---

## Tiếng Việt

### Giới thiệu
Bobble Pop — Neon Orbit Edition là game Bubble Shooter được viết lại bằng HTML5 Canvas thuần. Game chạy độc lập, không cần thư mục template bên ngoài.

### Cách chạy
1. Mở thư mục `BobblePop_Neon`.
2. Nhấp đúp vào `index.html`.
3. Dùng trình duyệt hiện đại như Chrome, Edge hoặc Firefox.

Nếu trình duyệt chặn tải asset khi mở bằng `file://`, hãy chạy server nội bộ:

```bash
python -m http.server 8080
```

Sau đó mở:

```text
http://localhost:8080
```

### Điều khiển
- **Chuột / Cảm ứng:** di chuyển để ngắm, click hoặc chạm để bắn
- **A / D** hoặc **Mũi tên Trái / Phải:** xoay hướng bắn
- **Space:** bắn
- **S:** đổi bóng hiện tại với bóng kế tiếp
- **P** hoặc **Esc:** tạm dừng / tiếp tục
- **R:** chơi lại
- **M:** bật / tắt âm thanh

### Quà tặng / Power-up
- **Bomb:** nổ các bóng xung quanh
- **Fire Starter:** đốt sạch một hàng và làm rơi các bóng bên dưới hàng đó
- **Clock:** đóng băng quỹ đạo hạ xuống trong 15 giây để người chơi có thêm thời gian bắn

### Tính năng
- Giao diện game bằng tiếng Anh
- UI neon responsive cho desktop và mobile
- Hệ thống combo và điểm nổi trực quan
- Các cụm bóng mất liên kết sẽ rơi xuống và cộng điểm thưởng
- Particle, hiệu ứng nổ, trail, rung màn hình và glow
- Nhạc nền và hiệu ứng âm thanh gameplay
- Lưu điểm cao bằng LocalStorage
- Có sẵn thêm nhiều hình ảnh và âm thanh để bạn chỉnh sửa tiếp

### Cấu trúc thư mục
```text
BobblePop_Neon/
├── assets/
│   ├── animations/
│   ├── audio/
│   └── images/
├── bobblePop.html
├── game.js
├── index.html
├── styles.css
├── POWERUPS.md
└── README.md
```

### Các thư mục asset chính
- `assets/images/backgrounds/`: các hình nền neon bổ sung
- `assets/images/powerups/`: icon bomb, fire starter và clock
- `assets/images/bubbles/`: sprite bubble
- `assets/animations/`: spritesheet nổ và sparkle
- `assets/audio/`: nhạc nền và âm thanh chính
- `assets/audio/extras/`: nhạc loop phụ và âm thanh UI phụ

### Cập nhật gần đây
- Sửa lỗi canvas đen / loading
- Thêm nền loading dự phòng
- Thêm background và audio bổ sung
- Thêm 3 power-up: Bomb, Fire Starter và Clock
- Khôi phục lại khẩu súng V4 đúng tâm
- Đổi toàn bộ UI trong game sang tiếng Anh
