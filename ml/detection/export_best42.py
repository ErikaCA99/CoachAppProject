"""Export the verified 42-class detector on Linux x86_64 or macOS.

Run in an environment with Ultralytics and its LiteRT export dependencies.
No automatic dependency installation is allowed by this script.
"""
import argparse
import os
import platform
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--imgsz', type=int, default=320)
    args = parser.parse_args()
    if platform.system() not in {'Linux', 'Darwin'}:
        raise SystemExit('The installed Ultralytics LiteRT exporter requires Linux x86_64 or macOS. Use Colab or a compatible environment.')
    os.environ['YOLO_AUTOINSTALL'] = 'false'
    from ultralytics import YOLO
    model = YOLO(args.model)
    if model.task != 'detect' or len(model.names) != 42:
        raise SystemExit('Expected the custom detector with 42 classes.')
    destination = model.export(format='litert', imgsz=args.imgsz, batch=1, device='cpu', nms=False)
    print(destination)
    print('Next: validate exported predictions, then benchmark on the target Android device.')


if __name__ == '__main__':
    main()
