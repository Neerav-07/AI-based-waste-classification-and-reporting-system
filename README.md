# AI-based-waste-classification-and-reporting-system

## Backend Entry Point

The FastAPI app entrypoint is now [backend/main.py](backend/main.py).

Recommended backend setup from the `backend` directory:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

For Expo Go on a physical Android phone, keep the phone and laptop on the same Wi-Fi network and start the frontend from the `frontend` directory with:

```bash
npm install
npm run start
```

If LAN discovery is blocked on your network, use:

```bash
npm run start:tunnel
```

## AI Training

The image classifier uses the expected TensorFlow / Keras stack with a pretrained MobileNetV2 backbone and `ImageDataGenerator`.

Run training from the project root with:

```bash
backend\.venv\Scripts\python.exe ai\train_model.py --epochs 5 --batch-size 32 --image-size 224
```

Trained artifacts are written to `ai/artifacts/`.
