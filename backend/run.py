#!/usr/bin/env python3
"""Start backend — loads .env automatically so you never export keys in your shell."""
from dotenv import load_dotenv
load_dotenv()
import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
