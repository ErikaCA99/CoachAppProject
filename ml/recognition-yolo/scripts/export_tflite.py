"""Exporta los pesos YOLO a TFLite con el MISMO contrato que usa la app y escribe su manifiesto.

Contrato (`src/services/ai/machineRecognition.ts`):
  entrada  float32 [1,224,224,3], RGB 0..255 (la normalización va dentro del modelo)
  salida   float32 [1,35] probabilidades, en el orden de `machineLabels.ts`

YOLO ordena sus clases alfabéticamente; el envoltorio las reordena al orden del catálogo,
de modo que el archivo resultante reemplaza a `assets/models/machine_recognizer.tflite`
sin tocar el código TypeScript.

Verificación (falla con código distinto de 0 si algo no coincide):
  - 16 fotos REALES (o de catálogo si no hay) preparadas con el mismo recorte que la app (OpenCV) y 8
    entradas aleatorias; se compara la PROBABILIDAD de PyTorch contra la del .tflite, no solo el argmax;
  - cada salida debe sumar 1 y estar en [0,1] (softmax) y el orden de clases es el de la app.
Al terminar escribe `<modelo>.manifest.json` (sha256, contrato, métricas, advertencias, versiones).

Requiere: pip install litert-torch ai-edge-litert
"""
import argparse
import sys
from pathlib import Path

import numpy as np
import torch
import litert_torch
from ultralytics import YOLO
from ai_edge_litert.interpreter import Interpreter

import cv_tools
from common import CATALOG_DIR, IMAGE_EXTS, PIPE, REAL_DIR, assert_trained_class_order, load_app_labels
from make_manifest import create_manifest


class AppContractWrapper(torch.nn.Module):
    def __init__(self, core: torch.nn.Module, perm: torch.Tensor):
        super().__init__()
        self.core = core
        self.register_buffer("perm", perm)

    def forward(self, x):  # x: [1,224,224,3] 0..255
        out = self.core(x.permute(0, 3, 1, 2) / 255.0)
        out = out[0] if isinstance(out, (list, tuple)) else out
        return out.index_select(1, self.perm)


def sample_inputs(limit: int = 16) -> tuple[list[np.ndarray], str]:
    """Entradas [1,224,224,3] RGB 0..255 con el recorte de la app; fotos reales primero."""
    for source, folder in (("fotos_reales", REAL_DIR), ("fotos_catalogo", CATALOG_DIR)):
        files = sorted(p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTS) if folder.is_dir() else []
        if files:
            step = max(1, len(files) // limit)
            inputs = []
            for path in files[::step][:limit]:
                image = cv_tools.read_image(path)
                if image is not None:
                    crop = cv_tools.center_square_crop_resize(image, 224)[..., ::-1]  # BGR → RGB
                    inputs.append(np.ascontiguousarray(crop, dtype=np.float32)[None])
            if inputs:
                return inputs, source
    return [], "ninguna"


def verify(wrapper, tflite_path: Path, n_classes: int, tolerance: float) -> dict:
    interpreter = Interpreter(model_path=str(tflite_path))
    interpreter.allocate_tensors()
    inp, out = interpreter.get_input_details()[0], interpreter.get_output_details()[0]
    if list(inp["shape"]) != [1, 224, 224, 3] or list(out["shape"]) != [1, n_classes]:
        raise SystemExit(f"Formas inesperadas: entrada {list(inp['shape'])}, salida {list(out['shape'])}")
    real, source = sample_inputs()
    generator = np.random.default_rng(0)
    noise = [generator.uniform(0, 255, (1, 224, 224, 3)).astype(np.float32) for _ in range(8)]
    max_diff, agree, comparable, sums = 0.0, 0, 0, []
    for x in real + noise:
        interpreter.set_tensor(inp["index"], x)
        interpreter.invoke()
        lite = interpreter.get_tensor(out["index"])[0]
        with torch.no_grad():
            torch_probs = wrapper(torch.from_numpy(x)).numpy()[0]
        max_diff = max(max_diff, float(np.abs(lite - torch_probs).max()))
        sums.append(float(lite.sum()))
        if lite.min() < -tolerance or lite.max() > 1 + tolerance:
            raise SystemExit("La salida del .tflite no está en [0,1]: ¿falta el softmax?")
        top2 = np.sort(torch_probs)[-2:]
        if top2[1] - top2[0] > 2 * tolerance:  # empates numéricos no cuentan como desacuerdo
            comparable += 1
            agree += int(np.argmax(lite) == np.argmax(torch_probs))
    result = {"ejecutada": True, "muestras": {source: len(real), "ruido": len(noise)},
              "max_dif_probabilidad": round(max_diff, 8), "tolerancia": tolerance,
              "coincidencia_top1": f"{agree}/{comparable}", "suma_prob_min": round(min(sums), 6),
              "suma_prob_max": round(max(sums), 6)}
    if max_diff > tolerance or agree != comparable or not (0.999 <= min(sums) and max(sums) <= 1.001):
        raise SystemExit(f"El .tflite NO coincide con PyTorch: {result}")
    if not real:
        result["aviso"] = "No había fotos reales ni de catálogo: solo se comprobó con ruido aleatorio."
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--weights", required=True)
    parser.add_argument("--stage", required=True, choices=["eval", "final"],
                        help="etapa de los pesos: 'final' vio las fotos reales de prueba, 'eval' no")
    parser.add_argument("--run", help="nombre de la corrida en results/ para el manifiesto (por defecto <stage>-n224)")
    parser.add_argument("--eval-summary", type=Path, help="JSON de evaluate.py --summary del modelo 'eval'")
    parser.add_argument("--tolerance", type=float, default=1e-3, help="diferencia máxima de probabilidad PyTorch vs TFLite")
    parser.add_argument("--out", default=str(PIPE / "model/machine_recognizer_yolo.tflite"))
    args = parser.parse_args()

    yolo = YOLO(args.weights)
    order = load_app_labels()
    class_order = sorted(order)
    assert_trained_class_order(yolo.names, class_order)
    index = {name: i for i, name in yolo.names.items()}
    perm = torch.tensor([index[name] for name in order])
    wrapper = AppContractWrapper(yolo.model.eval().float().cpu(), perm).eval()

    example = torch.rand(1, 224, 224, 3) * 255
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    litert_torch.convert(wrapper, (example,)).export(args.out)

    verification = verify(wrapper, Path(args.out), len(order), args.tolerance)
    manifest = create_manifest(Path(args.out), args.stage, Path(args.weights),
                               run=args.run or f"{args.stage}-n224", verification=verification,
                               eval_summary=args.eval_summary)
    print(f"Exportado: {args.out}")
    print(f"Verificación: {verification}")
    print(f"Manifiesto: {manifest}")


if __name__ == "__main__":
    sys.exit(main())
