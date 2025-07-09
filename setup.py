from setuptools import setup, find_packages

with open("requirements.txt") as f:
    requirements = f.read().splitlines()

setup(
    name="slam",
    version="1.0",
    py_modules=["main"],
    packages=find_packages(include=["slam", "slam.*"]),
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "slam=slam.main:main",
        ],
    },
)
