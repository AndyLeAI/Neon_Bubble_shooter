# Power-ups editing guide

## Asset files

```text
assets/images/powerups/bomb.png
assets/images/powerups/fire.png
assets/images/powerups/clock.png
assets/audio/bomb.wav
assets/audio/fire.wav
assets/audio/clock.wav
```

Bạn có thể thay trực tiếp các PNG/WAV trên bằng file cùng tên. PNG nên để nền trong suốt và kích thước vuông, ví dụ 256×256 px.

## Thông số dễ chỉnh trong `game.js`

Trong `CONFIG`:

```js
incomingGiftChance: 0.075,
freezeSeconds: 15,
```

- Tăng `incomingGiftChance` để quà xuất hiện nhiều hơn.
- Đổi `freezeSeconds` để thay thời gian đóng băng.

Trong `activateGift()`:

```js
const radius = CONFIG.bubbleSize * 2.15;
```

- `2.15` là phạm vi bom. Tăng lên để bom nổ rộng hơn.

Điểm thưởng cũng nằm trong `activateGift()`:

```js
const points = 350 + removed * 140; // Bom
const points = 500 + removed * 170; // Mồi lửa
state.score += 500;                 // Đồng hồ
```

## Cách hoạt động

- Projectile va trực tiếp vào gift sẽ gọi `hitGift()`.
- `activateGift('bomb')` phá vùng tròn xung quanh.
- `activateGift('fire')` xóa toàn bộ một hàng rồi gọi kiểm tra các cụm mất liên kết.
- `activateGift('clock')` đặt `freezeTimer`; trong thời gian này `rowProgress` không tăng nhưng người chơi vẫn bắn được.
