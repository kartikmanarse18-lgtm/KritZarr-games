# Learning levels: Core and Advanced

MyoAtlas splits its 206 3D muscles into Core and Advanced, and adds a third, text-only **Reference** level (86 entries: 51 skeletal muscles with no 3D mesh, plus cardiac, smooth and skeletal-muscle tissue entries; see `reference.js`). Use **Core** first; when every Core muscle is marked learned, the app offers **Advanced**. **All** shows both.

## Basis (and its limits)
- The NMC competency-based MBBS anatomy curriculum says students must know the "main attachments, nerve supply and action" of body muscles, and its feedback notes that attachments of *all* muscles are not needed. It names no individual muscle, so the split below is **my judgement** from standard anatomy teaching and clinical relevance, not an official list.
- **Core (157)**: muscles that carry named nerve supplies, clinical tests, palsies or surgical landmarks (extra-ocular, mastication, main facial, laryngeal, pharyngeal, neck, trapezius/latissimus/rhomboids, erector spinae and suboccipitals, thorax and diaphragm, abdominal wall, levator ani, shoulder, arm, forearm, hand, gluteal, thigh, leg and foot muscles).
- **Advanced (49)**: small, deep, segmental or variable muscles (minor facial muscles, intrinsic segmental back muscles, prevertebral muscles, levatores costarum, gemelli, a few foot and forearm slips) that are usually studied in depth later or in specialties.
- Check your own university's syllabus: move a muscle between levels by editing `tiers.js` (a list of Core ids).

## Advanced muscles

**Face & scalp:** Temporoparietalis, Corrugator supercilii, Depressor anguli oris, Depressor labii inferioris, Depressor septi nasi, Levator anguli oris, Levator labii superioris, Levator labii superioris alaeque nasi, Mentalis, Nasalis, Procerus, Risorius, Zygomaticus minor
**Tongue & palate:** Palatopharyngeus
**Larynx & pharynx:** Oblique arytenoid
**Neck & hyoid:** Longus capitis, Longus colli, Rectus capitis anterior, Rectus capitis lateralis, Scalenus posterior
**Back: superficial:** Lateral intertransversarii (lumbar), Serratus posterior inferior, Serratus posterior superior
**Back: deep (intrinsic):** Iliocostalis cervicis, Interspinales (cervical), Interspinales (lumbar), Interspinales (thoracic), Longissimus capitis, Longissimus cervicis, Multifidus (cervical), Multifidus (thoracic), Rotatores, Semispinalis cervicis, Semispinalis thoracis, Spinalis capitis, Spinalis cervicis
**Thorax:** Levatores costarum breves, Levatores costarum longi, Transversus thoracis
**Abdomen:** Pyramidalis
**Pelvic floor:** Coccygeus
**Forearm:** Extensor indicis, Anconeus
**Hip & gluteal:** Inferior gemellus, Superior gemellus
**Thigh:** Adductor minimus
**Foot:** Extensor hallucis brevis, Flexor digiti minimi brevis (foot), Opponens digiti minimi (foot)
