"""Lossless WebP packaging; full resolution, alpha, poses and timing retained."""
import sys, json, hashlib
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageChops
job=json.loads(Path(sys.argv[1]).read_text(encoding='utf8'))
source,target=Path(job['source']),Path(job['target'])
(target/'art').mkdir(parents=True,exist_ok=True)
paths={source/c['folder']/f['file'] for c in job['clips'].values() for f in c['metadata']['frames']}
digests={p:hashlib.sha256(p.read_bytes()).hexdigest()[:24] for p in paths}
# Identical frames in different clips must not concurrently write the same file.
representatives={digest:p for p,digest in digests.items()}
def pack(item):
    digest,p=item; raw=p.read_bytes()
    out=target/'art'/(digest+'.webp')
    im=Image.open(p).convert('RGBA')
    if not out.exists():
        temporary=out.with_suffix('.tmp')
        im.save(temporary,'WEBP',lossless=True,exact=True,method=4)
        temporary.replace(out)
    restored=Image.open(out).convert('RGBA')
    assert im.size==restored.size and im.getchannel('A').tobytes()==restored.getchannel('A').tobytes()
    # Invisible RGB under zero alpha has no effect; all visible RGB must match.
    mask=im.getchannel('A').point(lambda a:255 if a else 0)
    diff=ImageChops.difference(im.convert('RGB'),restored.convert('RGB'))
    for channel in diff.split(): assert ImageChops.multiply(channel,mask).getbbox() is None,p
    return digest,{'file':'art/'+out.name,'bytes':out.stat().st_size,'sourceBytes':len(raw)}
with ThreadPoolExecutor(max_workers=4) as pool: by_digest=dict(pool.map(pack,sorted(representatives.items())))
packed={str(p):by_digest[digest] for p,digest in digests.items()}
clips={}
for key,c in job['clips'].items():
    info=c['metadata'];info['sourceFolder']=c['folder']
    for f in info['frames']:
        f['sourceFile']=f['file'];f['file']=packed[str(source/c['folder']/f['file'])]['file']
    clips[key]=info
manifest={'version':'website-1','clips':clips}
(target/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf8')
unique={v['file']:v for v in packed.values()}
report={'frames':sum(len(c['frames']) for c in clips.values()),'uniqueImages':len(unique),'bytes':sum(v['bytes'] for v in unique.values()),'losslessVerified':True,'runtime':'refinement-study-10 revision 19'}
(target/'import-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report),flush=True)
