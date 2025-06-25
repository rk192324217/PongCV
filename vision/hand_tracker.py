import cv2
import mediapipe as mp

mp_hands = mp.solutions.hands
hands_detector = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)

def get_hand_y_position(frame):
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands_detector.process(frame_rgb)
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            y = hand_landmarks.landmark[0].y
            h, _, _ = frame.shape
            return int(y * h)
    return None

def get_dual_hand_positions(frame):
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands_detector.process(frame_rgb)
    hands = {}

    if results.multi_hand_landmarks and results.multi_handedness:
        for i, handedness in enumerate(results.multi_handedness):
            label = handedness.classification[0].label  # 'Left' or 'Right'
            y = results.multi_hand_landmarks[i].landmark[0].y
            h, _, _ = frame.shape
            hands[label] = int(y * h)
    return hands
