import cv2
import numpy as np
import time
from game.paddle import Paddle
from game.ball import Ball
from vision.hand_tracker import get_hand_y_position, get_dual_hand_positions

class GameEngine:
    def __init__(self, mode="ai", ai_level="medium"):
        self.width, self.height = 640, 480
        self.user_score = 0
        self.ai_score = 0
        self.mode = mode  # 'ai' or 'friend'
        self.ai_level = ai_level

        self.user = Paddle(20, 200, 10, 80, (255, 0, 0))
        self.ai = Paddle(610, 200, 10, 80, (0, 0, 255))
        self.ball = Ball(320, 240, 10, (255, 255, 255))

        self.cap = cv2.VideoCapture(0)

    def get_ai_speed(self):
        return {"easy": 2, "medium": 4, "hard": 6}.get(self.ai_level, 4)

    def run(self):
        while True:
            ret, frame = self.cap.read()
            frame = cv2.flip(frame, 1)
            game_frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)

            # --- Paddle Control ---
            if self.mode == "friend":
                hands = get_dual_hand_positions(frame)
                if "Left" in hands:
                    self.user.move_to(hands["Left"] - self.user.height // 2)
                if "Right" in hands:
                    self.ai.move_to(hands["Right"] - self.ai.height // 2)
            else:
                y_pos = get_hand_y_position(frame)
                if y_pos:
                    self.user.move_to(y_pos - self.user.height // 2)

                ai_speed = self.get_ai_speed()
                if self.ai.y + self.ai.height // 2 < self.ball.y:
                    self.ai.y += ai_speed
                elif self.ai.y + self.ai.height // 2 > self.ball.y:
                    self.ai.y -= ai_speed
                self.ai.y = max(0, min(self.ai.y, self.height - self.ai.height))

            # --- Ball Movement ---
            self.ball.update()
            self.ball.check_collision(self.user)
            self.ball.check_collision(self.ai)

            # --- Scoring ---
            if self.ball.x <= 0:
                self.ai_score += 1
                self.ball.reset()
                time.sleep(1)
            elif self.ball.x >= self.width:
                self.user_score += 1
                self.ball.reset()
                time.sleep(1)

            # --- Draw Game ---
            self.user.draw(game_frame)
            self.ai.draw(game_frame)
            self.ball.draw(game_frame)

            cv2.putText(game_frame, f'P1: {self.user_score}', (50, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)
            cv2.putText(game_frame, f'P2: {self.ai_score}', (self.width - 120, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)

            # --- Game Over ---
            if self.user_score == 10 or self.ai_score == 10:
                winner = "You Win!" if self.user_score == 10 else "Opponent Wins!"
                cv2.putText(game_frame, winner, (self.width//2 - 120, self.height//2),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0,255,0), 3)
                cv2.putText(game_frame, "Press R to Restart or ESC to Quit",
                            (self.width//2 - 200, self.height//2 + 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)
                cv2.imshow('Pong Game', game_frame)
                key = cv2.waitKey(0)
                if key in [ord('r'), ord('R')]:
                    self.user_score = 0
                    self.ai_score = 0
                    self.ball.reset()
                    continue
                else:
                    break

            # --- Display ---
            combined = np.hstack((cv2.resize(frame, (320, 240)), cv2.resize(game_frame, (320, 240))))
            cv2.imshow('Pong Game', combined)

            if cv2.waitKey(1) & 0xFF == 27:
                break

        self.cap.release()
        cv2.destroyAllWindows()
