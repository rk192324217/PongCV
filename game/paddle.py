class Paddle:
    def __init__(self, x, y, width, height, color):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.color = color

    def move_to(self, y):
        self.y = max(0, min(y, 480 - self.height))

    def move_ai(self, ball_y):
        center = self.y + self.height // 2
        if center < ball_y:
            self.y += 4
        elif center > ball_y:
            self.y -= 4
        self.y = max(0, min(self.y, 480 - self.height))

    def draw(self, frame):
        import cv2
        cv2.rectangle(frame, (self.x, self.y), (self.x + self.width, self.y + self.height), self.color, -1)

