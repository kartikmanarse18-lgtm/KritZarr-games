/* MyoAtlas reference entries: muscles and muscle tissues that have NO 3D mesh in the source atlas.
   Text written for this project from standard anatomy/physiology teaching (CC BY-SA 4.0, see LICENSES.md).
   Line format: name | sub-group | origin | insertion | nerve supply | action | clinical pearl
   Tissue entries use the same 5 slots but with their own labels (see LABELS). Not independently reviewed. */
(function () {
  var REGIONS = [
    { id: 'x-tongue', name: 'Tongue & palate (more)', color: '#d8c13a' },
    { id: 'x-larynx', name: 'Larynx & pharynx (more)', color: '#4aa3df' },
    { id: 'x-ear', name: 'Ear muscles', color: '#e0709a' },
    { id: 'x-face', name: 'Face & scalp (more)', color: '#b061e0' },
    { id: 'x-neck', name: 'Neck, back & thorax (more)', color: '#6dd05a' },
    { id: 'x-trunk', name: 'Abdomen, perineum & pelvis (more)', color: '#3fd1b4' },
    { id: 'x-limb', name: 'Limbs: small & variant muscles', color: '#e89b4a' },
    { id: 'x-cardiac', name: 'Cardiac muscle', color: '#ef5350' },
    { id: 'x-smooth', name: 'Smooth muscle', color: '#9575cd' },
    { id: 'x-skel', name: 'Skeletal muscle: tissue & mechanics', color: '#78909c' }
  ];
  var LAB = ['Origin', 'Insertion', 'Nerve supply', 'Action'];
  var TLAB = ['Where found', 'Structure', 'Innervation / control', 'Function'];

  var SK = {
    'x-tongue': 'Styloglossus | Extrinsic tongue | Anterior border of styloid process and stylomandibular ligament | Side of tongue, blending with hyoglossus and inferior longitudinal fibres | Hypoglossal nerve (CN XII) | Retracts the tongue and draws it up and back | Part of the extrinsic group: all are supplied by CN XII except palatoglossus.\n\
Palatoglossus | Extrinsic tongue / soft palate | Oral surface of palatine aponeurosis | Side of tongue (junction of oral and pharyngeal parts) | Pharyngeal plexus (cranial accessory fibres of vagus, CN X) | Elevates back of tongue; narrows the oropharyngeal isthmus | The only "tongue" muscle not supplied by CN XII; forms the palatoglossal arch.\n\
Superior longitudinal muscle of tongue | Intrinsic tongue | Submucosa near epiglottis and median fibrous septum | Margins and apex of tongue | Hypoglossal nerve (CN XII) | Shortens the tongue; curls tip and sides upward | Intrinsic muscles alter the shape, extrinsic muscles the position of the tongue.\n\
Inferior longitudinal muscle of tongue | Intrinsic tongue | Root of tongue and body of hyoid | Apex of tongue | Hypoglossal nerve (CN XII) | Shortens the tongue; curls tip downward | In a hypoglossal lesion the tongue atrophies and deviates toward the lesion.\n\
Transverse muscle of tongue | Intrinsic tongue | Median fibrous septum | Submucosa of the lateral margins | Hypoglossal nerve (CN XII) | Narrows and elongates the tongue | Helps protrusion together with genioglossus.\n\
Vertical muscle of tongue | Intrinsic tongue | Submucosa of dorsum | Inferior surface of tongue | Hypoglossal nerve (CN XII) | Flattens and broadens the tongue | Works with transverse fibres in speech and swallowing.\n\
Tensor veli palatini | Soft palate | Scaphoid fossa, spine of sphenoid, lateral wall of cartilaginous auditory tube | Hooks around the pterygoid hamulus into the palatine aponeurosis | Nerve to medial pterygoid (mandibular nerve, CN V3) | Tenses the soft palate; opens the auditory tube on swallowing and yawning | Dysfunction (as in cleft palate) predisposes to otitis media with effusion. The only palate muscle not supplied by the pharyngeal plexus.\n\
Levator veli palatini | Soft palate | Inferior surface of petrous temporal apex and medial wall of auditory tube cartilage | Upper surface of palatine aponeurosis | Pharyngeal plexus (CN X, cranial accessory fibres) | Elevates the soft palate to seal the nasopharynx | Failure causes nasal regurgitation and hypernasal speech.\n\
Musculus uvulae | Soft palate | Posterior nasal spine and palatine aponeurosis | Mucosa of the uvula | Pharyngeal plexus (CN X) | Shortens and lifts the uvula | In a unilateral vagus lesion the uvula deviates to the healthy side.\n\
Salpingopharyngeus | Pharyngeal (longitudinal) | Inferior part of cartilage of the auditory tube | Blends with palatopharyngeus in the pharyngeal wall | Pharyngeal plexus (CN X) | Elevates pharynx and larynx in swallowing; helps open the tube | Creates the salpingopharyngeal fold seen on nasopharyngoscopy.',

    'x-larynx': 'Vocalis | Laryngeal | Angle of the thyroid cartilage (deep, medial part of thyro-arytenoid) | Vocal process of the arytenoid | Recurrent laryngeal nerve (vagus) | Tenses the vocal ligament; fine control of pitch | Recurrent laryngeal injury (e.g. thyroid surgery) gives hoarseness.\n\
Thyroepiglotticus | Laryngeal | Inner surface of thyroid lamina | Margin of epiglottis | Recurrent laryngeal nerve | Widens the laryngeal inlet | Thin sheet continuous with thyro-arytenoid.\n\
Aryepiglotticus | Laryngeal | Apex of arytenoid | Lateral margin of epiglottis (in the aryepiglottic fold) | Recurrent laryngeal nerve | Narrows the laryngeal inlet like a sphincter | Prevents aspiration during swallowing.\n\
Thyropharyngeus | Pharyngeal (inferior constrictor, oblique part) | Oblique line of thyroid cartilage | Median pharyngeal raphe | Pharyngeal plexus (CN X); external laryngeal nerve | Constricts the pharynx | Part of the inferior pharyngeal constrictor (a 3D mesh of the whole muscle is in the Core list).\n\
Cricopharyngeus | Pharyngeal (inferior constrictor, transverse part) | Side of the cricoid cartilage | Median raphe, continuous with the upper oesophageal sphincter | Pharyngeal plexus and recurrent laryngeal nerve | Keeps the upper oesophageal sphincter closed; relaxes on swallowing | Zenker diverticulum herniates through Killian dehiscence between thyropharyngeus and cricopharyngeus.',

    'x-ear': 'Tensor tympani | Middle ear | Cartilaginous auditory tube, greater wing of sphenoid and its own bony canal | Handle of the malleus | Nerve to medial pterygoid (CN V3, passing through otic ganglion without synapse) | Tenses the tympanic membrane; damps loud sounds | Part of the tympanic (attenuation) reflex.\n\
Stapedius | Middle ear | Pyramidal eminence of the tympanic cavity | Neck of the stapes | Nerve to stapedius (facial nerve, CN VII) | Damps stapes movement; protects the inner ear from loud noise | Smallest skeletal muscle in the body. Facial palsy above its branch gives hyperacusis.\n\
Auricularis anterior | Extrinsic auricular | Temporal fascia / galea aponeurotica | Anterior part of helix | Temporal branches of facial nerve | Draws the ear forward and up | Vestigial in most people.\n\
Auricularis superior | Extrinsic auricular | Galea aponeurotica | Upper part of auricle | Temporal branches of facial nerve | Elevates the ear | Largest of the three extrinsic ear muscles.\n\
Auricularis posterior | Extrinsic auricular | Mastoid process | Root of the auricle (concha) | Posterior auricular branch of facial nerve | Draws the ear backward | Supplied by a branch that arises at the stylomastoid foramen.\n\
Helicis major | Intrinsic auricular | Spine of the helix | Anterior border of helix | Temporal branches of facial nerve | Slightly alters the shape of the helix | Intrinsic ear muscles are rudimentary in humans.\n\
Helicis minor | Intrinsic auricular | Helix crus | Helix (anterior) | Temporal branches of facial nerve | Slightly alters the shape of the helix | Rudimentary.\n\
Tragicus | Intrinsic auricular | Lateral surface of tragus | Tragus margin | Temporal branches of facial nerve | Alters tragus shape | Rudimentary.\n\
Antitragicus | Intrinsic auricular | Outer antitragus | Helix tail and antihelix | Temporal branches of facial nerve | Alters antitragus shape | Rudimentary.\n\
Transverse auricular muscle | Intrinsic auricular | Convexity of the concha | Convexity of the scapha | Posterior auricular branch of facial nerve | Draws back of auricle toward the head | Rudimentary.\n\
Oblique auricular muscle | Intrinsic auricular | Convexity of the concha | Convexity of the helix / auricle | Posterior auricular branch of facial nerve | Draws parts of the auricle together | Rudimentary.',

    'x-face': 'Depressor supercilii | Eyebrow | Medial orbital rim near frontal process of maxilla | Skin of the medial eyebrow | Facial nerve (temporal and zygomatic branches) | Pulls the medial eyebrow down | Sometimes regarded as part of orbicularis oculi.\n\
Incisivus labii superioris | Lips | Incisive fossa of maxilla | Angle of mouth (modiolus) | Facial nerve (buccal branches) | Draws the angle of the mouth toward the midline | Contributes to the modiolus.\n\
Incisivus labii inferioris | Lips | Incisive fossa of mandible | Angle of mouth (modiolus) | Facial nerve (marginal mandibular branch) | Draws the angle of the mouth toward the midline | Contributes to the modiolus.\n\
Transversus menti | Chin (variable) | Fibres decussating beneath the chin | Skin of chin | Facial nerve (marginal mandibular branch) | Tightens the skin of the chin | Often absent.\n\
Lacrimal part of orbicularis oculi (Horner muscle) | Eyelid | Posterior lacrimal crest | Lateral palpebral raphe / lacrimal sac fascia | Facial nerve (zygomatic branches) | Draws eyelids medially; dilates lacrimal sac | Pumps tears into the nasolacrimal duct; weak in facial palsy (epiphora).',

    'x-neck': 'Semispinalis capitis | Transversospinalis (head) | Transverse processes of C7 to T6 and articular processes of C4 to C6 | Between superior and inferior nuchal lines of occipital bone | Dorsal rami of cervical spinal nerves | Extends the head and neck; turns face to opposite side | The greater occipital nerve (C2) pierces it.\n\
Intertransversarii anteriores colli | Segmental | Anterior tubercles of cervical transverse processes | Adjacent anterior tubercle above | Ventral rami of cervical nerves | Lateral flexion of neck; proprioception | Rich in muscle spindles.\n\
Intertransversarii posteriores colli | Segmental | Posterior tubercles of cervical transverse processes | Adjacent posterior tubercle above | Dorsal and ventral rami of cervical nerves | Lateral flexion of neck; proprioception | Rich in muscle spindles.\n\
Intertransversarii mediales lumborum | Segmental | Accessory process and mamillary process of lumbar vertebra | Adjacent mamillary process above | Dorsal rami of lumbar nerves | Lateral flexion of lumbar spine; proprioception | Medial set of lumbar intertransversarii.\n\
Scalenus minimus (pleuralis) | Neck (variable) | Anterior tubercle of C7 transverse process | Suprapleural membrane and inner border of first rib | Ventral rami of C8 | Tenses the suprapleural membrane (Sibson fascia) | Present in around a third to half of people.\n\
Subcostales | Thorax | Inner surface of lower ribs near their angles | Inner surfaces of ribs two to three below | Intercostal nerves | Depress ribs; like internal intercostals | Contribute to forced expiration.\n\
Sternalis | Thorax (variant) | Variable: sternum or rectus sheath | Pectoral fascia or costal cartilages | Anterior thoracic nerves or intercostal nerves | Uncertain | Present in about 5 percent; can be mistaken for a mass on mammography.',

    'x-trunk': 'Psoas minor | Abdominal (variable) | T12 and L1 vertebral bodies and disc | Pectineal line and iliopubic eminence via iliopectineal arch | Ventral ramus of L1 | Weak flexion of the trunk | Absent in 40 to 50 percent of people; its tendon is a landmark in surgery.\n\
Cremaster | Spermatic cord | Inguinal ligament and lower fibres of internal oblique | Pubic tubercle and crest; coat of the spermatic cord | Genital branch of genitofemoral nerve (L1, L2) | Elevates the testis | Cremasteric reflex tests L1 and L2.\n\
Bulbospongiosus | Superficial perineal | Perineal body and median raphe (male: bulb of penis) | Corpus spongiosum, perineal membrane, dorsum of penis (female: vestibule and clitoral body) | Perineal branch of pudendal nerve (S2 to S4) | Empties the urethra; assists erection; narrows the vaginal opening | Pudendal block anaesthetises its territory.\n\
Ischiocavernosus | Superficial perineal | Ischial tuberosity and ischial ramus | Crus of penis or clitoris | Perineal branch of pudendal nerve | Maintains erection by compressing venous outflow | Covers the crus.\n\
Superficial transverse perineal | Superficial perineal | Ischial ramus and tuberosity | Perineal body | Perineal branch of pudendal nerve | Fixes the perineal body | Often weak or absent.\n\
Deep transverse perineal | Deep perineal | Inferior ischial ramus | Perineal body | Perineal branch of pudendal nerve | Stabilises perineal body; supports the pelvic floor | Part of the deep perineal pouch.\n\
External urethral sphincter | Deep perineal | Ischiopubic ramus; encircles the membranous urethra | Median raphe around the urethra | Perineal branch of pudendal nerve (S2 to S4) | Voluntary closure of urethra | Weakness causes stress incontinence; at risk in prostatectomy.\n\
Compressor urethrae and urethrovaginal sphincter | Deep perineal (female) | Ischiopubic ramus | Arch over the urethra / around urethra and vagina | Perineal branch of pudendal nerve | Compress the urethra | Support continence in females.',

    'x-limb': 'Articularis genu | Thigh | Anterior surface of lower femoral shaft | Synovial membrane of the suprapatellar bursa | Femoral nerve (L3, L4) | Retracts the suprapatellar bursa during knee extension | Prevents synovial pinching.\n\
Articularis cubiti (subanconeus) | Arm | Posterior surface of lower humerus | Posterior elbow joint capsule | Radial nerve | Retracts the elbow capsule in extension | Small deep slip of triceps.\n\
Palmaris brevis | Hand | Flexor retinaculum and palmar aponeurosis | Skin of the ulnar border of the palm | Superficial branch of the ulnar nerve (C8, T1) | Wrinkles the skin; deepens the hollow of the palm | A cutaneous muscle; helps grip.\n\
Fibularis quartus (peroneus quartus) | Leg (variant) | Fibula or fibularis brevis | Calcaneus or cuboid | Superficial fibular nerve | Weak eversion | Found in about 10 to 20 percent.\n\
Flexor accessorius longus (variant) | Leg (variant) | Fibula or tibia posteriorly | Tendon of flexor hallucis longus / quadratus plantae | Tibial nerve | Assists toe flexion | Can compress the tibial nerve in the tarsal tunnel.'
  };

  /* Tissue-level entries: where, structure, control, function, clinical */
  var TS = {
    'x-cardiac': 'Cardiac muscle (myocardium): general | Tissue | Wall of the heart | Short branched striated cells, one or two central nuclei, intercalated discs (gap junctions, desmosomes, fascia adherens), abundant mitochondria, T-tubules at the Z line forming diads | Involuntary: autonomic modulation (sympathetic via beta-1, parasympathetic via vagus, M2); intrinsic automaticity | Rhythmic coordinated contraction pumping blood | Depends almost entirely on aerobic metabolism: ischaemia causes infarction; adult cardiomyocytes regenerate poorly.\n\
Atrial myocardium | Heart | Walls of the atria; pectinate muscles in the right atrial wall | Thinner than ventricular; secretory granules with atrial natriuretic peptide | Sinoatrial node pacing; autonomic | Fills the ventricles and secretes ANP | Atrial fibrillation: chaotic atrial activity with stroke risk from thrombus.\n\
Ventricular myocardium | Heart | Left ventricular wall about 3 times thicker than right; spiral layered fibres | Subendocardial, middle (circular) and subepicardial layers | Purkinje fibres; autonomic | Generates ejection pressure | Subendocardium is most vulnerable to ischaemia.\n\
Papillary muscles | Heart | Right ventricle: anterior, posterior, septal; left ventricle: anterior and posterior | Conical projections giving rise to chordae tendineae | Purkinje network | Tension the chordae to prevent valve eversion in systole | Papillary muscle rupture after infarction causes acute mitral regurgitation.\n\
Trabeculae carneae | Heart | Inner surface of ventricles | Irregular muscular ridges | Purkinje network | Prevent suction adhesion of ventricular walls; contribute to contraction | Smooth-walled outflow tracts are free of them.\n\
Septomarginal trabecula (moderator band) | Heart | Right ventricle, from septum to base of anterior papillary muscle | Muscular band carrying the right bundle branch | Right bundle branch | Prevents over-distension and carries conduction fibres | Aids coordinated contraction of the right ventricle.\n\
Pectinate muscles and crista terminalis | Heart | Right atrial wall | Comb-like ridges ending at the crista terminalis | Sinoatrial region | Increase atrial contraction surface | The sinoatrial node lies at the upper end of the crista terminalis.\n\
Sinoatrial node | Conduction system | Junction of superior vena cava and right atrium (upper crista terminalis) | Nodal pacemaker cells, little contractile apparatus | Sympathetic (speeds), vagus (slows); blood supply from the right coronary artery in about 60 percent | Natural pacemaker, around 60 to 100 beats per minute | Sinus node disease causes bradycardia.\n\
Atrioventricular node | Conduction system | Triangle of Koch, floor of right atrium near the septal tricuspid leaflet | Nodal tissue with slow conduction | Autonomic | Delays the impulse about 0.1 s so the ventricles fill | Blood supply from the AV nodal artery (usually right coronary): inferior infarction causes heart block.\n\
Atrioventricular bundle (of His) and bundle branches | Conduction system | Membranous interventricular septum, then both sides of the muscular septum | Fast fibres, insulated from the myocardium | Autonomic influence minor | Carry impulse to the ventricles | Left bundle branch block alters left ventricular activation (wide QRS).\n\
Purkinje fibres | Conduction system | Subendocardium of the ventricles | Large pale cells with few myofibrils and fast conduction | Autonomic influence minor | Rapid spread of excitation for synchronous contraction | Their automaticity can generate ventricular escape rhythms.',

    'x-smooth': 'Smooth muscle: general | Tissue | Walls of hollow organs, vessels, skin, eye | Spindle cells with a single central nucleus, no sarcomeres: actin and myosin in dense bodies, caveolae, gap junctions in single-unit type | Involuntary: autonomic nervous system, hormones, local factors | Slow, sustained contraction; wide length-tension range | Calcium binds calmodulin, activating myosin light chain kinase (not troponin); can regenerate by hypertrophy and hyperplasia.\n\
Vascular smooth muscle (tunica media) | Blood vessels | Arteries, arterioles and veins | Circular layers around the lumen | Sympathetic (alpha-1 vasoconstriction); nitric oxide and local metabolites | Regulates vascular tone, resistance and blood pressure | Arterioles are the main site of peripheral resistance.\n\
Muscularis externa of the gut | Digestive tract | Oesophagus to rectum | Inner circular and outer longitudinal layers; oesophagus striated at top, then mixed, then smooth | Enteric plexus (Auerbach) modulated by vagus and sympathetics | Peristalsis and segmentation | Loss of Auerbach plexus neurons causes achalasia or Hirschsprung disease.\n\
Muscularis mucosae | Digestive tract | Deep to the lamina propria | Thin smooth muscle layer | Enteric plexus | Local movement of mucosal folds | Used as a histological landmark of mucosal depth.\n\
Bronchial smooth muscle | Airways | Trachea (trachealis) and bronchi | Spiral bands around airways | Vagus (constricts); sympathetic beta-2 (relaxes) | Controls airway calibre | Contracts in asthma; treated with beta-2 agonists.\n\
Detrusor | Urinary bladder | Bladder wall | Interlacing smooth muscle bundles | Parasympathetic S2 to S4 (contract); sympathetic (relax) | Voiding of urine | Neurogenic bladder after spinal injury.\n\
Internal urethral sphincter | Urinary / male | Bladder neck in males | Smooth muscle ring | Sympathetic T10 to L2 | Prevents retrograde ejaculation into the bladder | Impaired after prostate or bladder neck surgery.\n\
Internal anal sphincter | Anorectal | Upper two thirds of the anal canal | Thickened circular smooth muscle | Sympathetic (contract); parasympathetic (relax) | Involuntary continence | Relaxes in the rectoanal inhibitory reflex.\n\
Myometrium | Uterus | Uterine wall | Interwoven smooth muscle layers | Hormonal: oestrogen, oxytocin | Labour contractions; menstrual expulsion | Hypertrophy and hyperplasia in pregnancy; fibroids are leiomyomas.\n\
Arrector pili | Skin | Hair follicle to papillary dermis | Small smooth muscle bundle | Sympathetic | Pilo-erection ("goosebumps") | Contraction expels sebum.\n\
Sphincter pupillae | Eye (intrinsic) | Iris, circular | Smooth muscle | Parasympathetic (oculomotor, via ciliary ganglion) | Constricts the pupil | Lost in an oculomotor lesion (dilated pupil).\n\
Dilator pupillae | Eye (intrinsic) | Iris, radial | Myoepithelial derived smooth muscle | Sympathetic (superior cervical ganglion) | Dilates the pupil | Impaired in Horner syndrome (miosis).\n\
Ciliary muscle | Eye (intrinsic) | Ciliary body | Smooth muscle with meridional, radial and circular fibres | Parasympathetic (oculomotor) | Relaxes zonular tension so the lens thickens for near vision | Presbyopia: reduced accommodation with age.\n\
Superior tarsal muscle (Muller) | Eyelid | Underside of levator palpebrae superioris | Smooth muscle | Sympathetic | Raises the upper eyelid about 2 mm | Ptosis in Horner syndrome.\n\
Dartos muscle | Scrotum | Dermis of the scrotum | Smooth muscle | Sympathetic | Wrinkles scrotal skin, helping thermoregulation | Works with cremaster.\n\
Myoepithelial cells | Glands | Around acini of mammary, sweat, salivary and lacrimal glands | Contractile epithelial-derived cells (smooth-muscle-like) | Oxytocin in the breast | Expel secretions | Mammary let-down reflex.',

    'x-skel': 'Skeletal muscle fibre types | Tissue | All skeletal muscles in varying mix | Type I (slow oxidative, red, fatigue resistant), type IIa (fast oxidative-glycolytic), type IIx/IIb (fast glycolytic, pale, fatiguable) | Alpha motor neurons set the type | Posture and endurance (I) vs power (II) | Type II fibres atrophy first with ageing and disuse (sarcopenia).\n\
Neuromuscular junction and motor unit | Tissue | Motor end plate on each fibre | Alpha motor neuron with all the fibres it supplies; acetylcholine acts on nicotinic receptors | Somatic motor neuron | All-or-none activation; fine control uses small motor units | Myasthenia gravis: antibodies to the acetylcholine receptor cause fatigable weakness.\n\
Sarcomere and excitation-contraction coupling | Tissue | Z line to Z line | Thin actin filaments with troponin and tropomyosin, thick myosin; T-tubules and sarcoplasmic reticulum form triads | Calcium release through ryanodine receptors | Sliding-filament contraction | Rigor mortis: no ATP to detach myosin. Malignant hyperthermia: ryanodine receptor defect.\n\
Muscle spindle | Receptor | Within the belly of most muscles, densest in small muscles of hand and neck | Intrafusal fibres (nuclear bag and chain) with Ia and II afferents, gamma efferents | Gamma motor neurons | Detects length and speed of stretch; basis of the stretch reflex | The knee jerk tests L3 and L4.\n\
Golgi tendon organ | Receptor | Myotendinous junction | Collagen strands with Ib afferents | Ib afferents to spinal interneurons | Detects tension; inhibits the muscle (autogenic inhibition) | Protects against excessive load.\n\
Muscle architecture: fascicle patterns | Concept | Whole muscles | Parallel/strap, fusiform, unipennate, bipennate, multipennate, convergent, circular | none | Pennate muscles are stronger for their size; parallel muscles give longer excursion | Examples: sartorius (strap), rectus femoris (bipennate), deltoid (multipennate), orbicularis oris (circular).\n\
Functional roles of muscles | Concept | Joint movements | Prime mover (agonist), antagonist, synergist, fixator, stabiliser | Reciprocal inhibition via spinal interneurons | Co-ordinated movement | Used to design clinical muscle testing and rehabilitation.\n\
Myotendinous junction and satellite cells | Tissue | Ends of muscle fibres; beneath basal lamina | Folded sarcolemma anchoring actin to collagen; satellite cells are muscle stem cells | none | Force transmission and repair | Strains usually tear at the myotendinous junction; satellite cell failure in Duchenne muscular dystrophy leads to fibrosis.'
  };

  function slug(s) { return 'x-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  var items = [];
  function parse(map, tissue) {
    Object.keys(map).forEach(function (r) {
      map[r].split('\n').forEach(function (line) {
        var f = line.split(' | '); if (f.length < 7) { if (window.console) console.warn('bad reference row', line.slice(0, 40)); return; }
        items.push({ id: slug(f[0]), n: f[0].trim(), la: '', r: r, sub: f[1].trim(), o: f[2].trim(), i: f[3].trim(), nv: f[4].trim(), a: f[5].trim(), p: f[6].trim(), parts: [], ref: true, tissue: !!tissue, labels: tissue ? TLAB : LAB });
      });
    });
  }
  parse(SK, false); parse(TS, true);
  window.REFERENCE = { regions: REGIONS, items: items };
})();
