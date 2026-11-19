#!/usr/bin/env python3
"""Build deploy ZIP from the active ART AVTO source tree."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import tempfile, os
root=Path(__file__).resolve().parents[1]
src=root/"production"/"art-avto"
target=root/"art-avto-upload.zip"
assert (src/"index.html").exists()
all_files=sorted(p for p in src.rglob("*") if p.is_file())
with tempfile.NamedTemporaryFile(dir=root,suffix=".zip",delete=False) as f:
    temp=Path(f.name)
try:
    with ZipFile(temp,"w",compression=ZIP_DEFLATED,compresslevel=9) as z:
        for p in all_files:
            z.write(p,p.relative_to(src).as_posix())
    with ZipFile(temp) as z:
        assert z.testzip() is None
        assert "index.html" in z.namelist()
        assert "assets/art-avto-logo.svg" in z.namelist()
        assert "assets/art-avto-mark.svg" in z.namelist()
    os.replace(temp,target)
finally:
    temp.unlink(missing_ok=True)
print(f"Packaged {len(all_files)} files into {target}")
