#!/usr/bin/env python3

import uvicorn


def main():
    uvicorn.run("slam.app:app", host="0.0.0.0", port=5000, workers=1)


if __name__ == "__main__":
    main()
