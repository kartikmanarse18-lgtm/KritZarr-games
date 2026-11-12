import json, re, sys, base64, collections, colorsys, glob, os
REL, OUT, INFO = sys.argv[1], sys.argv[2], sys.argv[3]
APP = sys.argv[4]

m = json.load(open(REL + '/manifest.json'))
en = json.load(open(REL + '/names/en.json'))['entries']
S = {s['id']: s for s in m['structures']}
def name(i): return en.get(i, {}).get('name') or i
def chain(i):
    c = []; p = S[i].get('parent')
    while p and p in S and S[p]['kind'] != 'system':
        c.append(p); p = S[p]['parent']
    return list(reversed(c))

mus_idx = json.load(open(OUT + '/muscles.index.json'))
sk_idx = json.load(open(OUT + '/skeleton.index.json'))
mi = {it['id']: n for n, it in enumerate(mus_idx['items'])}
ski = {it['id']: n for n, it in enumerate(sk_idx['items'])}

# ---------- study data ----------
info, partinfo = {}, {}
for f in sorted(glob.glob(INFO + '/*.txt')):
    for line in open(f, encoding='utf8'):
        line = line.rstrip('\n')
        if not line.strip() or line.startswith('#'): continue
        f_ = [x.strip() for x in line.split('|')]
        if f_[0].startswith('part:'):
            partinfo[f_[0][5:]] = dict(o=f_[1], i=f_[2], note=f_[3] if len(f_) > 3 else '')
        else:
            if len(f_) < 5: print('BAD LINE', line[:80], file=sys.stderr); continue
            info[f_[0]] = dict(o=f_[1], i=f_[2], n=f_[3], a=f_[4], p=f_[5] if len(f_) > 5 else '')

# ---------- entities ----------
def key(n):
    k = n.strip().lower().strip('()')
    k = re.sub(r'\s+muscles?\b', '', k)
    return k.strip()
PREFIX = re.compile(r'^((?:anterior|posterior|superficial|deep|long|short|medial|lateral|oblique|transverse|humeral|ulnar|radial|humero-ulnar|superior|inferior|dorsal|ventral|abdominal|clavicular|sternocostal|acromial|scapular spinal|ascending|descending|straight|external|thyro-epiglottic|ary-epiglottic|orbital|palpebral|intermediate)\s+(?:head|part|parts|belly)s?)\s+of\s+(.+)$')
def whole_key(k):
    mm = PREFIX.match(k)
    return (mm.group(2), mm.group(1)) if mm else (k, None)

EXCLUDE_NAME = re.compile(r'common tendinous ring|tendinous arch|trochlea|tarsus|^linea alba|retinaculum$|patellar retinaculum|bursa|sheath|fascia(?! latae)|septum|ligament$|aponeurosis$|^calcaneal tendon$|^intermediate tendon', re.I)
PART = re.compile(r'tendon|aponeuros|ligament|retinacul|iliotibial tract', re.I)
EXCL_GROUP = re.compile(r'^(Fasciae|Bursae|Tendon sheaths)|fasciae$|^Bursae|sheaths', re.I)
ATTACH = {'epicranial aponeurosis': 'frontalis', 'calcaneal tendon': 'gastrocnemius', 'intermediate tendon of digastric muscle': 'digastric', 'iliotibial tract': 'tensor fasciae latae', 'inguinal ligament': 'external abdominal oblique'}

ents = collections.OrderedDict()   # entity key -> dict
tend_cands = []
for s in m['structures']:
    if s['system'] != 'muscular' or s['kind'] != 'structure' or not s.get('meshes'): continue
    sid = s['id']; n = name(sid); ch = chain(sid); chn = [name(c) for c in ch]
    if any(EXCL_GROUP.search(x) for x in chn): continue
    if re.search(r'bursa|sheath|septum', n, re.I): continue
    if re.search(r'^common tendinous ring|tendinous arch|trochlea|tarsus|^linea alba|patellar retinaculum', n, re.I): continue
    if PART.search(n):
        tend_cands.append((sid, n, ch, s.get('side') or 'mid')); continue
    k = key(n)
    E = ents.setdefault(k, dict(key=k, name=n.strip('()'), path=chn, groups=[name(c) for c in ch if S[c]['kind'] == 'group'], sides=collections.defaultdict(list), t=[]))
    E['sides'][s.get('side') or 'mid'].append(sid)

# whole muscles
wholes = collections.OrderedDict()
for k, E in ents.items():
    wk, pref = whole_key(k)
    W = wholes.setdefault(wk, dict(key=wk, parts=[], groups=E['groups'], path=E['path'], t=[]))
    W['parts'].append((k, pref, E))
# attach tendons
unattached = []
for sid, n, ch, side in tend_cands:
    k = key(n); target = None
    if k in ATTACH: target = ATTACH[k]
    else:
        mm = re.match(r'tendons? of (.+)$', k)
        if mm: target = mm.group(1)
    if target is None:
        for c in reversed(ch):
            if key(name(c)) in wholes: target = key(name(c)); break
    if target and target in wholes: wholes[target]['t'].append((sid, side))
    else: unattached.append(n)
print('unattached tendon-like structures:', sorted(set(unattached))[:40], file=sys.stderr)

# ---------- regions ----------
REG = [
 ('eye', 'Eye (extra-ocular)', ['Extra-ocular muscles']),
 ('mastication', 'Mastication', ['Masticatory muscles']),
 ('face', 'Face & scalp', ['Facial muscles', 'Epicranius muscle']),
 ('tongue', 'Tongue & palate', ['Muscles of tongue', 'Muscles of soft palate']),
 ('larynx', 'Larynx & pharynx', ['Laryngeal muscles', 'Pharyngeal muscles']),
 ('neck', 'Neck & hyoid', ['Muscles of neck', 'Infrahyoid muscles', 'Suprahyoid muscles', 'Digastric muscle']),
 ('backsup', 'Back: superficial', ['Hypaxial muscles of back', 'Trapezius muscle']),
 ('backdeep', 'Back: deep (intrinsic)', ['Epaxial muscles']),
 ('thorax', 'Thorax', ['Muscles of thorax', 'Levatores costarum', 'Pectoralis major muscle', 'Thoracic part of muscular system']),
 ('abdomen', 'Abdomen', ['Muscles of abdomen']),
 ('pelvis', 'Pelvic floor', ['Muscles of pelvis', 'Pelvic diaphragm', 'Levator ani', 'Perineal muscles']),
 ('shoulder', 'Shoulder', ['Scapulohumeral muscles', 'Deltoid muscle', 'Rotator cuff muscles']),
 ('arm', 'Arm', ['Anterior compartment of arm', 'Posterior compartment of arm', 'Biceps brachii muscle', 'Triceps brachii muscle']),
 ('forearm', 'Forearm', ['Anterior compartment of forearm', 'Posterior compartment of forearm']),
 ('hand', 'Hand', ['Muscles of hand']),
 ('hip', 'Hip & gluteal', ['Superficial gluteal muscles', 'Deep gluteal muscles', 'Iliopsoas muscle']),
 ('thigh', 'Thigh', ['Anterior compartment of thigh', 'Medial compartment of thigh', 'Posterior compartment of thigh']),
 ('leg', 'Leg', ['Anterior compartment of leg', 'Lateral compartment of leg', 'Posterior compartment of leg', 'Superficial part of posterior compartment of leg', 'Deep part of posterior compartment of leg']),
 ('foot', 'Foot', ['Muscles of foot', 'Adductor hallucis', 'Flexor hallucis brevis']),
]
def region_of(path):
    for rid, rn, keys in REG:
        if any(any(k == p or p.startswith(k) for p in path) for k in keys): return rid
    return None
regions = []
for i, (rid, rn, _) in enumerate(REG):
    h = (i * 137.508 + 12) % 360
    r, g, b = colorsys.hls_to_rgb(h / 360, 0.60, 0.66)
    regions.append(dict(id=rid, name=rn, color='#%02x%02x%02x' % (int(r * 255), int(g * 255), int(b * 255))))
rank = {r['id']: i for i, r in enumerate(regions)}

DISPLAY = {'bucinator': 'Buccinator', 'levator nasolabialis': 'Levator labii superioris alaeque nasi', 'rectus anterior capitis': 'Rectus capitis anterior',
 'rectus lateralis capitis': 'Rectus capitis lateralis', 'rectus posterior major capitis': 'Rectus capitis posterior major', 'rectus posterior minor capitis': 'Rectus capitis posterior minor',
 'obliquus inferior capitis': 'Obliquus capitis inferior', 'obliquus superior capitis': 'Obliquus capitis superior', 'levatores breves costarum': 'Levatores costarum breves',
 'levatores longi costarum': 'Levatores costarum longi', 'pubo-analis': 'Puboanalis (puborectalis)', 'iliocostalis colli': 'Iliocostalis cervicis', 'longissimus colli': 'Longissimus cervicis',
 'spinalis colli': 'Spinalis cervicis', 'semispinalis colli': 'Semispinalis cervicis', 'multifidus colli': 'Multifidus (cervical)', 'multifidus thoracis': 'Multifidus (thoracic)',
 'multifidus lumborum': 'Multifidus (lumbar)', 'splenius colli': 'Splenius cervicis', 'thyro-arytenoid': 'Thyro-arytenoid', 'oblique arytenoid': 'Oblique arytenoid',
 'lateral intertransversarii lumborum': 'Lateral intertransversarii (lumbar)', 'external anal sphincter': 'External anal sphincter', 'flexor digiti minimi of hand': 'Flexor digiti minimi brevis (hand)',
 'flexor digiti minimi of foot': 'Flexor digiti minimi brevis (foot)', 'abductor digiti minimi of hand': 'Abductor digiti minimi (hand)', 'abductor digiti minimi of foot': 'Abductor digiti minimi (foot)',
 'opponens digiti minimi of hand': 'Opponens digiti minimi (hand)', 'opponens digiti minimi of foot': 'Opponens digiti minimi (foot)', 'lumbrical of hand': 'Lumbricals (hand)', 'lumbrical of foot': 'Lumbricals (foot)',
 'dorsal interossei of hand': 'Dorsal interossei (hand)', 'dorsal interossei of foot': 'Dorsal interossei (foot)', 'palmar interossei': 'Palmar interossei', 'plantar interossei': 'Plantar interossei',
 'quadratus plantae': 'Quadratus plantae (flexor accessorius)', 'diaphragm': 'Diaphragm', 'rotatores': 'Rotatores', 'tensor fasciae latae': 'Tensor fasciae latae', 'levator scapulae': 'Levator scapulae',
 'interspinales colli': 'Interspinales (cervical)', 'interspinales thoracis': 'Interspinales (thoracic)', 'interspinales lumborum': 'Interspinales (lumbar)', 'external abdominal oblique': 'External oblique',
 'internal abdominal oblique': 'Internal oblique', 'external intercostal': 'External intercostals', 'internal intercostal': 'Internal intercostals', 'innermost intercostal': 'Innermost intercostals',
 'iliocostalis lumborum': 'Iliocostalis lumborum', 'iliocostalis thoracis': 'Iliocostalis thoracis', 'longissimus thoracis': 'Longissimus thoracis', 'spinalis thoracis': 'Spinalis thoracis', 'semispinalis thoracis': 'Semispinalis thoracis'}
def disp(k):
    if k in DISPLAY: return DISPLAY[k]
    return k[:1].upper() + k[1:]
def latin(k, d):
    if k in ('rotatores',): return 'Mm. rotatores'
    if k.startswith('interspinales') or 'intertransversarii' in k or k.startswith('levatores'): return 'Mm. ' + k
    if k in ('diaphragm',): return 'Diaphragma'
    if k == 'bucinator': return 'M. buccinator'
    if k == 'levator nasolabialis': return 'M. levator labii superioris alaeque nasi'
    base = {'rectus anterior capitis': 'rectus capitis anterior', 'rectus lateralis capitis': 'rectus capitis lateralis', 'rectus posterior major capitis': 'rectus capitis posterior major', 'rectus posterior minor capitis': 'rectus capitis posterior minor', 'obliquus inferior capitis': 'obliquus capitis inferior', 'obliquus superior capitis': 'obliquus capitis superior'}.get(k, k)
    base = base.replace(' of hand', ' manus').replace(' of foot', ' pedis')
    if base.endswith(('interossei', 'interossei manus', 'interossei pedis')) or 'lumbrical' in base: return 'Mm. ' + base
    return 'M. ' + base

def side_ch(s): return {'left': 'L', 'right': 'R'}.get(s, 'M')
mus = []; missing = []
for wk, W in wholes.items():
    path = W['path']; rid = region_of(path + W['groups'])
    if rid is None:
        print('NO REGION', wk, path, file=sys.stderr); continue
    first_pk = W['parts'][0][0]
    inf = info.get(wk) or info.get(first_pk)
    if not inf:
        missing.append(wk); inf = dict(o='', i='', n='', a='', p='')
    # sub label: last group name in path that isn't the region umbrella
    sub = W['groups'][-1] if W['groups'] else ''
    sub = re.sub(r'\s+muscles?$', '', sub)
    parts = []
    for pk, pref, E in W['parts']:
        ms = []
        for side, sids in E['sides'].items():
            for sid in sids:
                if sid in mi: ms.append([mi[sid], side_ch(side)])
        pi = partinfo.get(pk, {})
        label = (pref.split(' of ')[0] if pref else '')
        label = label[:1].upper() + label[1:]
        if not pref and len(W['parts']) > 1: label = pk
        parts.append(dict(k=pk, l=label, m=ms, o=pi.get('o', ''), i=pi.get('i', ''), x=pi.get('note', '')))
    # when a part has only generic info the whole info is used
    t = [[mi[sid], side_ch(sd)] for sid, sd in W['t'] if sid in mi]
    d = disp(wk)
    mus.append(dict(id=re.sub(r'[^a-z0-9]+', '-', wk).strip('-'), n=d, la=latin(wk, d), r=rid, sub=sub, o=inf['o'], i=inf['i'], nv=inf['n'], a=inf['a'], p=inf['p'], parts=parts, t=t))
mus.sort(key=lambda x: (rank[x['r']], x['sub'], x['n']))
print('whole muscles', len(mus), 'with info missing:', missing, file=sys.stderr)
print('mesh count used', sum(len(p['m']) for x in mus for p in x['parts']) + sum(len(x['t']) for x in mus), file=sys.stderr)
print('regions count', collections.Counter(x['r'] for x in mus), file=sys.stderr)

# skeleton names (aligned with skeleton index order)
bones = []
for it in sk_idx['items']:
    bones.append(name(it['id']))

atlas = dict(regions=regions, muscles=mus, bones=bones)
os.makedirs(APP, exist_ok=True)
open(APP + '/data.js', 'w', encoding='utf8').write('/* Generated: muscle catalogue (names, regions, study data). Mesh indices refer to geometry-muscles.js */\nwindow.ATLAS = ' + json.dumps(atlas, ensure_ascii=False, separators=(',', ':')) + ';\n')

def geo(tag, varname, idx):
    b = open(OUT + '/%s.bin.gz' % tag, 'rb').read()
    import gzip
    raw = gzip.decompress(b)
    b64 = base64.b64encode(raw).decode()
    meta = json.dumps(idx, separators=(',', ':'))
    open(APP + '/geometry-%s.js' % tag, 'w').write('/* Generated mesh data (quantised vertices + indices), derived from Z-Anatomy / BodyParts3D. CC BY-SA 4.0 — see LICENSES.md */\nwindow.%s = {meta:%s,b64:"%s"};\n' % (varname, meta, b64))
    print(tag, 'raw', len(raw), 'js', os.path.getsize(APP + '/geometry-%s.js' % tag))
geo('muscles', 'GEO_MUSCLES', mus_idx)
geo('skeleton', 'GEO_SKELETON', sk_idx)
