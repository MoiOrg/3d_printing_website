from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Status": "Le Backend 3D est en ligne"}