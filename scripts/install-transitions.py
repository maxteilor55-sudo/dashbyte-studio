#!/usr/bin/env python3
"""Install one shared transition across generated and standalone project pages.

Called AFTER both site generators, BEFORE packaging/publication.
It never modifies source videos, Telegram safe-area controllers, or the PIN gate.
"""
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parent.parent
DOCS=(
 "index.html","showroom.html","arthur.html","dashbyte.html","arsenal.html",
 "green-collection.html","perm-vl.html","privacy.html","arsenal-privacy.html",
 "showcase.html",
)
LINK='<link rel="stylesheet" href="./assets/db-route-transition.css?v=3">'
SCRIPT='<script defer src="./assets/db-route-transition.js?v=3"></script>'
for filename in DOCS:
    path=ROOT/filename
    if not path.is_file():
        raise FileNotFoundError(path)
    text=path.read_text(encoding="utf-8")
    # Replace EVERY older cached reference; don't stack versioned duplicates.
    text=re.sub(r'<link\s+rel="stylesheet"\s+href="\./assets/db-route-transition\.css\?v=\d+"\s*/?>\s*',
                '',text,flags=re.I)
    text=re.sub(r'<script\s+defer\s+src="\./assets/db-route-transition\.js\?v=\d+"\s*>\s*</script>\s*',
                '',text,flags=re.I)
    text,n=re.subn(r"</head\s*>",lambda m:LINK+"\n"+SCRIPT+"\n"+m.group(0),
                   text,count=1,flags=re.I)
    if n!=1:
        raise RuntimeError("No HEAD boundary: "+filename)
    if filename in ("index.html","showroom.html"):
        # Correct PIN entry keeps its authorization; only the subsequent
        # document change uses the shared blur transition.
        old="location.assign(destination.href);"
        new="if(!window.DashByteTransitions?.go(destination.href))location.assign(destination.href);"
        if old in text and new not in text:
            if text.count(old)!=1:
                raise RuntimeError("Ambiguous PIN entry: "+filename)
            text=text.replace(old,new,1)
        elif new not in text:
            raise RuntimeError("PIN route not found: "+filename)
    path.write_text(text,encoding="utf-8")
    print("TRANSITION_INSTALLED",filename, len(text))
