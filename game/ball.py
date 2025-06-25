class Ball:
    def __init__(self, x, y, radius, color):
        self.x = x
        self.y = y
        self.radius = radius
        self.color = color
        self.dx = 4
        self.dy = 4

    def update(self):
        self.x += self.dx
        self.y += self.dy

        if self.y - self.radius <= 0 or self.y + self.radius >= 480:
            self.dy *= -1

    def check_collision(self, paddle):
        if paddle.x < self.x < paddle.x + paddle.width:
            if paddle.y < self.y < paddle.y + paddle.height:
                self.dx *= -1

    def reset(self):
        self.x, self.y = 320, 240

    def draw(self, frame):
        import cv2
        cv2.circle(frame, (self.x, self.y), self.radius, self.color, -1)
