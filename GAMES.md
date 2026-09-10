# Bockie Game Engine Documentation

Complete guide to building 2D games with Bockie. Games can be exported to standalone HTML files that run in any browser.

## Table of Contents

- [Quick Start](#quick-start)
- [Game Modes](#game-modes)
- [Canvas API (HTML5)](#canvas-api-html5)
- [Screen API (ASCII)](#screen-api-ascii)
- [Animation System](#animation-system)
- [Color System](#color-system)
- [Terminal Control](#terminal-control)
- [Input Handling](#input-handling)
- [Export & Play](#export--play)
- [Examples](#examples)

---

## Quick Start

Bikin game bola mantul dalam 10 baris:

```bockie
import game

canvas = game.canvas_create(640, 360)
game.canvas_title(canvas, "My First Game")
game.canvas_bg(canvas, "#0a0a0a")

game.canvas_clear(canvas, "#0a0a0a")
game.canvas_circle(canvas, 320, 180, 30, "#ff5555", true)
game.canvas_text(canvas, 20, 20, "Hello Game!", "#ffaa00", 24)

game.canvas_save_html(canvas, "game.html")
print("Game saved! Open game.html in browser")
```

## Game Modes

Bockie punya 2 mode game engine:

### 1. Canvas Mode (HTML5)
- Render ke HTML5 `<canvas>`
- Export ke standalone `.html` file
- Support animation dengan frame-based system
- Play/Pause/Restart/Speed control di browser
- Cocok untuk game visual yang complex

### 2. Screen Mode (ASCII)
- Render ke terminal dengan ANSI colors
- Real-time di terminal
- 256 color support
- Cocok untuk game CLI / retro

---

## Canvas API (HTML5)

### Setup

| Function | Description |
|----------|-------------|
| `game.canvas_create(width, height)` | Bikin canvas baru, return ID |
| `game.canvas_title(id, title)` | Set judul game (tampil di HTML) |
| `game.canvas_bg(id, color)` | Set background color |
| `game.canvas_width(id)` | Get canvas width |
| `game.canvas_height(id)` | Get canvas height |
| `game.canvas_flush(id)` | Clear semua commands |

### Drawing Primitives

| Function | Description |
|----------|-------------|
| `game.canvas_clear(id, color?)` | Clear canvas dengan warna |
| `game.canvas_rect(id, x, y, w, h, color, fill?)` | Gambar rectangle |
| `game.canvas_circle(id, x, y, r, color, fill?)` | Gambar circle |
| `game.canvas_ellipse(id, x, y, rx, ry, color, fill?)` | Gambar ellipse |
| `game.canvas_line(id, x1, y1, x2, y2, color, width?)` | Gambar line |
| `game.canvas_pixel(id, x, y, color)` | Set 1 pixel |
| `game.canvas_arc(id, x, y, r, start, end, color)` | Gambar arc |
| `game.canvas_polygon(id, points, color, fill?)` | Gambar polygon custom |
| `game.canvas_text(id, x, y, text, color, size?)` | Gambar text |
| `game.canvas_shadow_text(id, x, y, text, color, shadowColor?, size?, blur?)` | Text dengan shadow/glow |
| `game.canvas_gradient_rect(id, x, y, w, h, color1, color2, direction?)` | Rectangle dengan gradient |

### Color Helpers

| Function | Description |
|----------|-------------|
| `game.color_rgb(r, g, b)` | Bikin warna dari RGB (0-255) |
| `game.color_hsl(h, s, l)` | Bikin warna dari HSL (h:0-360, s:0-100, l:0-100) |
| `game.color_random()` | Random color |

```bockie
import game

red = game.color_rgb(255, 0, 0)
blue = game.color_rgb(0, 0, 255)
warm = game.color_hsl(30, 100, 50)
random_color = game.color_random()
```

---

## Screen API (ASCII)

### Setup

| Function | Description |
|----------|-------------|
| `game.screen_create(width, height)` | Bikin screen ASCII baru |
| `game.screen_clear(id)` | Clear screen |
| `game.screen_width(id)` | Get width |
| `game.screen_height(id)` | Get height |
| `game.screen_render(id)` | Render ke terminal |

### Drawing

| Function | Description |
|----------|-------------|
| `game.screen_set(id, x, y, char, color?)` | Set 1 karakter di posisi |
| `game.screen_get(id, x, y)` | Get karakter di posisi |
| `game.screen_draw_text(id, x, y, text, color?)` | Gambar text |
| `game.screen_draw_rect(id, x, y, w, h, char, color?)` | Gambar rectangle |
| `game.screen_draw_line(id, x1, y1, x2, y2, char, color?)` | Gambar line (Bresenham) |
| `game.screen_draw_circle(id, cx, cy, r, char, color?)` | Gambar circle |

### ASCII Game Example

```bockie
import game

screen = game.screen_create(40, 15)
px = 20.0
py = 7.0
vx = 0.5
vy = 0.3

for frame in range(50):
    game.screen_clear(screen)
    game.screen_draw_rect(screen, 0, 0, 40, 1, "#", 4)
    game.screen_draw_rect(screen, 0, 14, 40, 1, "#", 4)
    px += vx
    py += vy
    if px <= 1 or px >= 38:
        vx = -vx
    if py <= 1 or py >= 13:
        vy = -vy
    game.screen_set(screen, px, py, "O", 2)
    game.screen_render(screen)
    sleep(0.05)
```

---

## Animation System

Bockie support frame-based animation untuk game HTML5.

### Basic Animation

```bockie
import game

canvas = game.canvas_create(640, 360)
game.canvas_set_fps(canvas, 30)

# Gambar background statis sekali
game.canvas_gradient_rect(canvas, 0, 0, 640, 360, "#0a0a0a", "#1a1a2e", "vertical")
game.canvas_set_background(canvas)  # <- pisah background dari per-frame

# Animasi: gambar frame, lalu next_frame
for frame in range(120):
    game.canvas_clear(canvas, "#0a0a0a")
    x = 100 + frame * 3
    game.canvas_circle(canvas, x, 180, 20, "#ff5555", true)
    game.canvas_text(canvas, 20, 20, "Frame {frame}", "#ffaa00", 16)
    game.canvas_next_frame(canvas)

# Save sebagai HTML playable
game.canvas_save_game(canvas, "animation.html")
```

### Key Functions

| Function | Description |
|----------|-------------|
| `game.canvas_set_fps(id, fps)` | Set frame rate (default: 30) |
| `game.canvas_next_frame(id)` | Akhiri frame saat ini, mulai frame baru |
| `game.canvas_set_background(id)` | Pisah background statis (optimasi ukuran file) |
| `game.canvas_save_game(id, filename)` | Save sebagai HTML dengan Play/Pause/Restart/Speed control |
| `game.canvas_save_html(id, filename)` | Save sebagai HTML statis (frame terakhir doang) |
| `game.canvas_play(id)` | Buka game langsung di browser default |

### Performance Tips

1. **Pakai `canvas_set_background()`** untuk background statis (checkerboard, stars, dll). Ini motong ukuran HTML 90%+.

2. **Kurangi jumlah draw commands per frame**. Gambar yang penting-penting doang.

3. **FPS rendah untuk game simple** (15-20 FPS). FPS tinggi (60) bikin file besar.

```bockie
# BAD: gambar background tiap frame (file 9MB+)
for frame in range(200):
    game.canvas_clear(canvas, "#0a0a0a")
    for y in range(30):
        for x in range(30):
            game.canvas_rect(canvas, x*20, y*20, 20, 20, "#111", true)  # 900 commands/frame!
    game.canvas_circle(canvas, px, py, 10, "#0f0", true)
    game.canvas_next_frame(canvas)

# GOOD: background sekali, frame cuma gambar yang bergerak (file 273KB)
for y in range(30):
    for x in range(30):
        game.canvas_rect(canvas, x*20, y*20, 20, 20, "#111", true)
game.canvas_set_background(canvas)

for frame in range(200):
    game.canvas_clear(canvas, "#0a0a0a")
    game.canvas_circle(canvas, px, py, 10, "#0f0", true)
    game.canvas_next_frame(canvas)
```

---

## Terminal Control

| Function | Description |
|----------|-------------|
| `game.term_clear()` | Clear terminal |
| `game.term_hide_cursor()` | Sembunyikan cursor |
| `game.term_show_cursor()` | Tampilkan cursor |
| `game.term_set_cursor(x, y)` | Posisikan cursor |
| `game.term_color(code)` | Set text color (0-255) |
| `game.term_reset_color()` | Reset ke default |
| `game.term_width()` | Get terminal width |
| `game.term_height()` | Get terminal height |
| `game.term_set_raw(bool)` | Enable/disable raw mode |
| `game.beep()` | Play terminal beep |

---

## Input Handling

### Terminal Input

| Function | Description |
|----------|-------------|
| `game.key_get()` | Non-blocking read 1 karakter |
| `game.key_wait()` | Blocking read, support arrow keys (`up`/`down`/`left`/`right`) |

```bockie
import game

game.term_set_raw(true)
game.term_hide_cursor()

while true:
    game.term_clear()
    key = game.key_get()
    if key == "q":
        break
    print("Key: " + key)

game.term_show_cursor()
game.term_set_raw(false)
```

---

## Export & Play

### Save as HTML

```bockie
# Static (frame terakhir doang)
game.canvas_save_html(canvas, "screenshot.html")

# Animated (semua frames, Play/Pause/Restart/Speed control)
game.canvas_save_game(canvas, "game.html")

# Langsung buka di browser
game.canvas_play(canvas)
```

HTML file yang di-generate:
- Standalone — ga butuh server, ga butuh install apapun
- Bisa di-share ke siapapun
- Buka di browser mana aja (Chrome, Firefox, Edge, Safari)
- Punya Play/Pause/Restart button + Speed slider

---

## Examples

File contoh tersedia di folder `examples/`:

| File | Tipe | Deskripsi |
|------|------|-----------|
| `hello.bckie` | Basic | Hello World |
| `bouncing_ball.bckie` | ASCII | Bola mantul di terminal |
| `snake.bckie` | ASCII | Snake game di terminal |
| `rotating_cube.bckie` | ASCII | Kubus 3D dengan perspective projection |
| `canvas_ball.bckie` | Canvas | Bola mantul HTML5 (static) |
| `canvas_snake.bckie` | Canvas | Snake game HTML5 (static) |
| `canvas_pong.bckie` | Canvas | Pong game HTML5 (static) |
| `animated_ball.bckie` | Canvas | Bola mantul animated dengan trail |
| `animated_snake.bckie` | Canvas | Snake game animated, optimized background |
| `breakout.bckie` | Canvas | Breakout dengan bricks, paddle AI, ball physics |
| `particles.bckie` | Canvas | Particle explosion dengan gravity & bouncing |
| `solar_system.bckie` | Canvas | Solar system dengan 6 planets, starfield |

### Run Examples

```bash
bockie run examples\animated_snake.bckie
# Buka snake_animated.html di browser

bockie run examples\breakout.bckie
# Buka breakout.html di browser

bockie run examples\solar_system.bckie
# Buka solar_system.html di browser
```

---

## Full Game Example: Pong

```bockie
import game

canvas = game.canvas_create(640, 400)
game.canvas_title(canvas, "Pong")
game.canvas_bg(canvas, "#0a0a0a")
game.canvas_set_fps(canvas, 30)

ball_x = 320.0
ball_y = 200.0
ball_vx = 4.0
ball_vy = 2.5
p1_y = 165.0
p2_y = 165.0
score1 = 0
score2 = 0

for frame in range(300):
    # AI paddle
    if p1_y + 35 < ball_y:
        p1_y += 4
    elif p1_y + 35 > ball_y:
        p1_y -= 4
    if p2_y + 35 < ball_y:
        p2_y += 4
    elif p2_y + 35 > ball_y:
        p2_y -= 4

    # Ball physics
    ball_x += ball_vx
    ball_y += ball_vy
    if ball_y < 0 or ball_y > 400:
        ball_vy = -ball_vy
    if ball_x < 20 and ball_y > p1_y and ball_y < p1_y + 70:
        ball_vx = -ball_vx
    if ball_x > 620 and ball_y > p2_y and ball_y < p2_y + 70:
        ball_vx = -ball_vx
    if ball_x < 0:
        score2 += 1
        ball_x = 320
        ball_y = 200
    if ball_x > 640:
        score1 += 1
        ball_x = 320
        ball_y = 200

    # Draw
    game.canvas_clear(canvas, "#0a0a0a")
    game.canvas_rect(canvas, 10, p1_y, 10, 70, "#00ffff", true)
    game.canvas_rect(canvas, 620, p2_y, 10, 70, "#ff8800", true)
    game.canvas_circle(canvas, ball_x, ball_y, 8, "#ffffff", true)
    game.canvas_text(canvas, 150, 20, str(score1), "#00ffff", 48)
    game.canvas_text(canvas, 470, 20, str(score2), "#ff8800", 48)
    game.canvas_next_frame(canvas)

game.canvas_save_game(canvas, "pong.html")
print("Pong saved! Score: {score1} - {score2}")
```
