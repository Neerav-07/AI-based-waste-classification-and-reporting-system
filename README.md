# AI-based-waste-classification-and-reporting-system

## Backend Entry Point

The FastAPI app entrypoint is now [backend/main.py](backend/main.py).

Recommended backend setup from the `backend` directory:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## AI Training

The image classifier uses the expected TensorFlow / Keras stack with a pretrained MobileNetV2 backbone and `ImageDataGenerator`.

Run training from the project root with:

```bash
backend\.venv\Scripts\python.exe ai\train_model.py --epochs 5 --batch-size 32 --image-size 224
```

Trained artifacts are written to `ai/artifacts/`.
