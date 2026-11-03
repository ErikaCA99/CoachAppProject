import os
from pathlib import Path
root=Path.cwd()
os.environ['YOLO_CONFIG_DIR']=str(root/'ml/detection/runs/config')
os.environ['YOLO_AUTOINSTALL']='false'
import json,zipfile,hashlib,collections,time
import yaml,torch
from ultralytics import YOLO
out=root/'ml/detection/runs/best42-evaluation'
out.mkdir(parents=True,exist_ok=True)
ds=out/'dataset'
with zipfile.ZipFile(root/'ml/detection/custom_object_detector_yolo11.zip') as z:
 config=yaml.safe_load(z.read('data.yaml'))
 for entry in z.infolist():
  if entry.filename.startswith(('train/','valid/','test/')):
   dest=(ds/entry.filename).resolve()
   if not dest.is_relative_to(ds.resolve()): raise ValueError('Unsafe archive path')
   z.extract(entry,ds)
config['path']=str(ds.resolve()); config['train']='train/images';config['val']='valid/images';config['test']='test/images'
data=out/'evaluation.yaml';data.write_text(yaml.safe_dump(config,allow_unicode=True),encoding='utf-8')
model=YOLO(root/'ml/recognition-yolo/weights/best.pt')
assert list(model.names.values())==config['names'],'Class mismatch'
counts={s:len(list((ds/s/'images').glob('*'))) for s in ['train','valid','test']}
hashes={s:{hashlib.sha256(p.read_bytes()).hexdigest() for p in (ds/s/'images').glob('*')} for s in counts}
audit={'images':counts,'exact_overlap_train_test':len(hashes['train']&hashes['test']),'exact_overlap_valid_test':len(hashes['valid']&hashes['test'])}
print('DATASET',audit,flush=True)
torch.set_num_threads(4)
metrics=model.val(data=str(data),split='test',imgsz=640,batch=1,device='cpu',workers=0,plots=False,save_json=False,project=str(out),name='test640',exist_ok=True)
report={'model':'best.pt','architecture':'YOLO11x','classes':model.names,'dataset_audit':audit,'metrics':metrics.results_dict,'speed_ms':metrics.speed,'device':'CPU; not Android','torch':torch.__version__}
(out/'results.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
print('RESULTS',json.dumps(report,ensure_ascii=False),flush=True)
