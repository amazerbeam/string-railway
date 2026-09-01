"""Regenerate `mockup.css` from the REAL stylesheets, so the mockup cannot drift from the app.
Run from this folder:  python build-mockup.py
"""
import io, re
def read(p): return io.open('../../../'+p, encoding='utf-8').read()
root = re.search(r'^:root \{.*?^\}', read('src/app/warCouncil/warCouncil.css'), re.S|re.M).group(0)
FILES = ['src/app/run/run.css', 'src/app/run/shop.css', 'src/app/run/shopItems.css', 'src/app/run/shopFlask.css', 'src/app/run/shopSlot.css', 'src/app/run/shopSlotCabinet.css', 'src/app/run/shopSlotReel.css', 'src/app/warCouncil/warCouncilBuffCard.css']
parts = [root]
for p in FILES:
    body = re.sub(r"^@import[^
]*
", "", read(p), flags=re.M)
    parts.append("/* ===== %s ===== */
%s" % (p, body))
io.open('mockup.css','w',encoding='utf-8',newline='').write("

".join(parts))
print('mockup.css regenerated from', len(FILES), 'stylesheets')
