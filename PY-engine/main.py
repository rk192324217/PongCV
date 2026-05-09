import cv2
import numpy as np
from vision.hand_tracker import get_hand_y_position
from game.game_engine import GameEngine

print("=== Vision Pong ===")
mode_input = input("Choose Mode: [1] Play vs AI  |  [2] Play with Friend: ").strip()

if mode_input == "2":
    game = GameEngine(mode="friend")
else:
    difficulty = input("Select AI Difficulty (easy / medium / hard): ").strip().lower()
    if difficulty not in ["easy", "medium", "hard"]:
        difficulty = "medium"
    game = GameEngine(mode="ai", ai_level=difficulty)

game.run()

# Game Constants
WIDTH, HEIGHT = 640, 480
PADDLE_WIDTH, PADDLE_HEIGHT = 10, 80
BALL_RADIUS = 10

# Positions
user_paddle_x = 20
ai_paddle_x = WIDTH - 30
user_y = HEIGHT // 2
ai_y = HEIGHT // 2
ball_x, ball_y = WIDTH // 2, HEIGHT // 2
ball_dx, ball_dy = 4, 4

# Scores
user_score = 0
ai_score = 0

# Video Capture
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    frame = cv2.flip(frame, 1)
    game_frame = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)

    # Track blue object
    pos = get_hand_y_position(frame)
    if pos:
        y_center = pos
        user_y = y_center - PADDLE_HEIGHT // 2
        user_y = max(0, min(user_y, HEIGHT - PADDLE_HEIGHT))  # clamp

    # AI logic (move toward ball)
    if ai_y + PADDLE_HEIGHT // 2 < ball_y:
        ai_y += 4
    elif ai_y + PADDLE_HEIGHT // 2 > ball_y:
        ai_y -= 4
    ai_y = max(0, min(ai_y, HEIGHT - PADDLE_HEIGHT))

    # Move Ball
    ball_x += ball_dx
    ball_y += ball_dy

    # Ball Bounce on Top/Bottom
    if ball_y - BALL_RADIUS <= 0 or ball_y + BALL_RADIUS >= HEIGHT:
        ball_dy *= -1

    # Ball Collision with Paddles
    if user_paddle_x < ball_x < user_paddle_x + PADDLE_WIDTH:
        if user_y < ball_y < user_y + PADDLE_HEIGHT:
            ball_dx *= -1
    if ai_paddle_x < ball_x < ai_paddle_x + PADDLE_WIDTH:
        if ai_y < ball_y < ai_y + PADDLE_HEIGHT:
            ball_dx *= -1

    # Score Update
    if ball_x <= 0:
        ai_score += 1
        ball_x, ball_y = WIDTH // 2, HEIGHT // 2
    if ball_x >= WIDTH:
        user_score += 1
        ball_x, ball_y = WIDTH // 2, HEIGHT // 2

    # Draw Paddles, Ball, and Text
    cv2.rectangle(game_frame, (user_paddle_x, user_y), (user_paddle_x + PADDLE_WIDTH, user_y + PADDLE_HEIGHT), (255, 0, 0), -1)
    cv2.rectangle(game_frame, (ai_paddle_x, ai_y), (ai_paddle_x + PADDLE_WIDTH, ai_y + PADDLE_HEIGHT), (0, 0, 255), -1)
    cv2.circle(game_frame, (ball_x, ball_y), BALL_RADIUS, (255, 255, 255), -1)

    cv2.putText(game_frame, f'You: {user_score}', (50, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)
    cv2.putText(game_frame, f'AI: {ai_score}', (WIDTH - 120, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)

    # Combine frames
    combined = np.hstack((cv2.resize(frame, (320, 240)), cv2.resize(game_frame, (320, 240))))
    cv2.imshow('Pong with Vision (L: Webcam, R: Game)', combined)

    if cv2.waitKey(1) & 0xFF == 27:  # ESC to quit
        break

cap.release()
cv2.destroyAllWindows()
