/* MyoAtlas — muscle data
 * Coordinates: metres-ish. Figure is ~1.8 tall, feet at y=0, front faces +z.
 * Parts are defined for the figure's +x side and auto-mirrored to -x.
 * p = position, s = ellipsoid radii, r = rotation in degrees (x,y,z).
 */
window.GROUPS = {
  'Head & Neck':  { color: '#e8b04a' },
  'Shoulders':    { color: '#f0794f' },
  'Chest':        { color: '#d6455d' },
  'Back':         { color: '#6c7cf2' },
  'Arms':         { color: '#e4609f' },
  'Core':         { color: '#3fb8a3' },
  'Hips & Glutes':{ color: '#a870e6' },
  'Thighs':       { color: '#4aa3e8' },
  'Lower Leg':    { color: '#7fc457' }
};

window.MUSCLES = [
  /* ---------------- HEAD & NECK ---------------- */
  {
    id: 'scm', name: 'Sternocleidomastoid', latin: 'M. sternocleidomastoideus', group: 'Head & Neck', side: 'front',
    location: 'Runs diagonally along each side of the neck, from behind the ear down to the collarbone and breastbone.',
    action: 'Turns the head to the opposite side; tilts it to the same side; both together flex the neck.',
    origin: 'Sternum (manubrium) and medial clavicle', insertion: 'Mastoid process of the skull',
    tip: 'The name is its attachments: STERNO (sternum) – CLEIDO (clavicle) – MASTOID.',
    parts: [{ p: [0.03, 1.545, 0.035], s: [0.014, 0.055, 0.016], r: [0, 0, -22] }]
  },
  {
    id: 'masseter', name: 'Masseter', latin: 'M. masseter', group: 'Head & Neck', side: 'front',
    location: 'Thick square muscle over the angle of the jaw, on the cheek.',
    action: 'Elevates the mandible to close the jaw — the strongest chewing muscle.',
    origin: 'Zygomatic arch (cheekbone)', insertion: 'Angle and ramus of the mandible',
    tip: 'Masseter ≈ "mastication" (chewing).',
    parts: [{ p: [0.07, 1.665, 0.05], s: [0.016, 0.034, 0.02], r: [0, 0, 0] }]
  },

  /* ---------------- SHOULDERS ---------------- */
  {
    id: 'deltoid', name: 'Deltoid', latin: 'M. deltoideus', group: 'Shoulders', side: 'front',
    location: 'Rounded cap of the shoulder, with anterior, lateral and posterior heads.',
    action: 'Lifts the arm: front head flexes, middle head abducts (raises sideways), rear head extends.',
    origin: 'Lateral third of clavicle, acromion, spine of scapula', insertion: 'Deltoid tuberosity of the humerus',
    tip: 'Shaped like the Greek letter delta (Δ).',
    parts: [{ p: [0.218, 1.42, 0.0], s: [0.047, 0.075, 0.052], r: [0, 0, 10] }]
  },
  {
    id: 'infraspinatus', name: 'Infraspinatus', latin: 'M. infraspinatus', group: 'Shoulders', side: 'back',
    location: 'Fills the lower part of the shoulder blade (scapula), below its spine.',
    action: 'Externally rotates the arm and stabilises the shoulder joint (rotator cuff).',
    origin: 'Infraspinous fossa of the scapula', insertion: 'Greater tubercle of the humerus',
    tip: 'Rotator cuff = SITS: Supraspinatus, Infraspinatus, Teres minor, Subscapularis.',
    parts: [{ p: [0.135, 1.385, -0.09], s: [0.055, 0.045, 0.016], r: [0, 0, -8] }]
  },
  {
    id: 'teres-major', name: 'Teres Major', latin: 'M. teres major', group: 'Shoulders', side: 'back',
    location: 'Small thick muscle at the lower outer edge of the shoulder blade, forming the back of the armpit.',
    action: 'Adducts, extends and medially rotates the arm.',
    origin: 'Inferior angle of the scapula', insertion: 'Medial lip of the humerus bicipital groove',
    tip: '"Lat\'s little helper" — it works with latissimus dorsi.',
    parts: [{ p: [0.19, 1.31, -0.075], s: [0.045, 0.026, 0.02], r: [0, 0, 25] }]
  },

  /* ---------------- CHEST ---------------- */
  {
    id: 'pectoralis-major', name: 'Pectoralis Major', latin: 'M. pectoralis major', group: 'Chest', side: 'front',
    location: 'Large fan-shaped muscle across the upper chest, from the breastbone to the upper arm.',
    action: 'Adducts and medially rotates the arm; flexes the shoulder (as in push-ups and bench press).',
    origin: 'Clavicle, sternum and upper costal cartilages', insertion: 'Lateral lip of the humerus bicipital groove',
    tip: 'Think "pecs" — the muscle you use to hug someone.',
    parts: [{ p: [0.095, 1.375, 0.074], s: [0.09, 0.056, 0.032], r: [0, 0, 14] }]
  },
  {
    id: 'serratus-anterior', name: 'Serratus Anterior', latin: 'M. serratus anterior', group: 'Chest', side: 'front',
    location: 'Finger-like slips along the side of the rib cage, under the armpit.',
    action: 'Protracts and rotates the scapula — keeps the shoulder blade pinned to the ribs.',
    origin: 'Outer surfaces of ribs 1–8/9', insertion: 'Medial border of the scapula',
    tip: 'Serra = saw. It looks like a saw blade; also called the "boxer\'s muscle" (punching).',
    parts: [{ p: [0.168, 1.255, 0.04], s: [0.024, 0.072, 0.045], r: [0, 0, 0] }]
  },

  /* ---------------- BACK ---------------- */
  {
    id: 'trapezius', name: 'Trapezius', latin: 'M. trapezius', group: 'Back', side: 'back',
    location: 'Big diamond/kite-shaped muscle from the base of the skull, across the shoulders, down to the mid-back.',
    action: 'Elevates, retracts and depresses the shoulder blade; extends the neck.',
    origin: 'Occipital bone, nuchal ligament, spinous processes C7–T12', insertion: 'Lateral clavicle, acromion, spine of scapula',
    tip: 'Together the two sides form a trapezoid (diamond). Upper = shrug, middle = squeeze, lower = pull down.',
    parts: [
      { p: [0.07, 1.505, -0.04], s: [0.075, 0.034, 0.028], r: [0, 0, -20] },
      { p: [0.055, 1.385, -0.078], s: [0.09, 0.085, 0.018], r: [0, 0, 0] },
      { p: [0.03, 1.255, -0.083], s: [0.058, 0.075, 0.016], r: [0, 0, 0] }
    ]
  },
  {
    id: 'latissimus-dorsi', name: 'Latissimus Dorsi', latin: 'M. latissimus dorsi', group: 'Back', side: 'back',
    location: 'Widest muscle of the back — sweeps from the spine and pelvis up to the underside of the upper arm.',
    action: 'Extends, adducts and medially rotates the arm (pull-ups, rowing, swimming).',
    origin: 'Spinous processes T7–L5, thoracolumbar fascia, iliac crest', insertion: 'Intertubercular groove of the humerus',
    tip: 'Latissimus = "widest". Gives the V-taper; the "swimmer\'s muscle".',
    parts: [{ p: [0.125, 1.2, -0.068], s: [0.075, 0.125, 0.032], r: [0, 0, -12] }]
  },
  {
    id: 'erector-spinae', name: 'Erector Spinae', latin: 'M. erector spinae', group: 'Back', side: 'back',
    location: 'Two thick columns running alongside the spine from the pelvis to the skull.',
    action: 'Extends and laterally flexes the spine; keeps you upright.',
    origin: 'Sacrum, iliac crest, spinous processes', insertion: 'Ribs, vertebrae and base of skull',
    tip: 'Erector = it keeps you ERECT. Made of iliocostalis, longissimus and spinalis.',
    parts: [{ p: [0.036, 1.1, -0.068], s: [0.03, 0.135, 0.026], r: [0, 0, 0] }]
  },

  /* ---------------- ARMS ---------------- */
  {
    id: 'biceps', name: 'Biceps Brachii', latin: 'M. biceps brachii', group: 'Arms', side: 'front',
    location: 'Front of the upper arm. Two heads (bi = two) join into one tendon at the elbow.',
    action: 'Flexes the elbow and supinates the forearm (turns palm up).',
    origin: 'Scapula (supraglenoid tubercle & coracoid process)', insertion: 'Radial tuberosity',
    tip: 'Bi-ceps = two heads. Think "curling a screwdriver": bend + twist.',
    parts: [{ p: [0.252, 1.2, 0.024], s: [0.03, 0.095, 0.03], r: [0, 0, 13] }]
  },
  {
    id: 'triceps', name: 'Triceps Brachii', latin: 'M. triceps brachii', group: 'Arms', side: 'back',
    location: 'Entire back of the upper arm. Three heads (tri = three): long, lateral and medial.',
    action: 'Extends (straightens) the elbow — pushing movements.',
    origin: 'Infraglenoid tubercle of scapula and posterior humerus', insertion: 'Olecranon of the ulna',
    tip: 'Tri-ceps = three heads. It\'s the muscle that undoes the biceps.',
    parts: [{ p: [0.254, 1.2, -0.026], s: [0.032, 0.095, 0.032], r: [0, 0, 13] }]
  },
  {
    id: 'brachioradialis', name: 'Brachioradialis', latin: 'M. brachioradialis', group: 'Arms', side: 'front',
    location: 'Thick muscle on the thumb side of the upper forearm, just below the elbow.',
    action: 'Flexes the elbow, strongest when the forearm is in a neutral "handshake" position.',
    origin: 'Lateral supracondylar ridge of the humerus', insertion: 'Styloid process of the radius',
    tip: 'The "hammer curl" muscle — brachio (arm) + radialis (radius).',
    parts: [{ p: [0.295, 1.05, 0.016], s: [0.024, 0.085, 0.022], r: [0, 0, 7] }]
  },
  {
    id: 'forearm-flexors', name: 'Forearm Flexors', latin: 'Mm. flexores antebrachii', group: 'Arms', side: 'front',
    location: 'Front/inner side of the forearm (flexor carpi radialis, palmaris longus, flexor carpi ulnaris, flexor digitorum).',
    action: 'Flex the wrist and fingers (gripping).',
    origin: 'Medial epicondyle of the humerus', insertion: 'Carpal and metacarpal bones, finger phalanges',
    tip: 'Palm side = flexors: they close your hand into a fist.',
    parts: [{ p: [0.276, 0.97, 0.014], s: [0.026, 0.1, 0.024], r: [0, 0, 5] }]
  },
  {
    id: 'forearm-extensors', name: 'Forearm Extensors', latin: 'Mm. extensores antebrachii', group: 'Arms', side: 'back',
    location: 'Back/outer side of the forearm (extensor carpi radialis, extensor digitorum, extensor carpi ulnaris).',
    action: 'Extend the wrist and fingers (open the hand, cock the wrist back).',
    origin: 'Lateral epicondyle of the humerus', insertion: 'Metacarpals and finger phalanges',
    tip: 'Back of the hand = extensors. Tennis elbow strains their common origin.',
    parts: [{ p: [0.285, 1.0, -0.016], s: [0.026, 0.11, 0.022], r: [0, 0, 6] }]
  },

  /* ---------------- CORE ---------------- */
  {
    id: 'rectus-abdominis', name: 'Rectus Abdominis', latin: 'M. rectus abdominis', group: 'Core', side: 'front',
    location: 'Vertical "six-pack" straps down the front of the abdomen, divided by tendinous bands.',
    action: 'Flexes the trunk (crunches) and compresses the abdomen.',
    origin: 'Pubic crest and symphysis', insertion: 'Xiphoid process and costal cartilages 5–7',
    tip: 'Rectus = straight. The grooves between "packs" are tendinous inscriptions.',
    parts: [
      { p: [0.028, 1.2, 0.082], s: [0.027, 0.032, 0.022], r: [0, 0, 0] },
      { p: [0.028, 1.13, 0.084], s: [0.027, 0.032, 0.022], r: [0, 0, 0] },
      { p: [0.028, 1.06, 0.083], s: [0.027, 0.032, 0.022], r: [0, 0, 0] },
      { p: [0.028, 0.99, 0.08], s: [0.027, 0.03, 0.02], r: [0, 0, 0] }
    ]
  },
  {
    id: 'external-oblique', name: 'External Oblique', latin: 'M. obliquus externus abdominis', group: 'Core', side: 'front',
    location: 'Sides of the abdomen, fibres running down and inward — like putting hands in pockets.',
    action: 'Rotates the trunk to the opposite side and flexes it sideways; compresses the abdomen.',
    origin: 'External surfaces of ribs 5–12', insertion: 'Linea alba and iliac crest',
    tip: 'Fibres run in the direction of your hands sliding into your pockets.',
    parts: [{ p: [0.125, 1.105, 0.048], s: [0.04, 0.105, 0.05], r: [0, 0, -12] }]
  },

  /* ---------------- HIPS & GLUTES ---------------- */
  {
    id: 'gluteus-maximus', name: 'Gluteus Maximus', latin: 'M. gluteus maximus', group: 'Hips & Glutes', side: 'back',
    location: 'The large rounded muscle forming the buttock.',
    action: 'Extends and externally rotates the hip (standing up, climbing, sprinting).',
    origin: 'Sacrum, coccyx, posterior ilium', insertion: 'Gluteal tuberosity of femur and iliotibial band',
    tip: 'Maximus = the largest of the three glute muscles.',
    parts: [{ p: [0.078, 0.93, -0.07], s: [0.085, 0.08, 0.052], r: [0, 0, 0] }]
  },
  {
    id: 'gluteus-medius', name: 'Gluteus Medius', latin: 'M. gluteus medius', group: 'Hips & Glutes', side: 'back',
    location: 'Fan-shaped muscle on the outer upper buttock, partly above gluteus maximus.',
    action: 'Abducts the hip and keeps the pelvis level when you stand on one leg.',
    origin: 'Outer surface of the ilium', insertion: 'Greater trochanter of the femur',
    tip: 'If it\'s weak, your pelvis drops on the opposite side when you walk (Trendelenburg sign).',
    parts: [{ p: [0.145, 1.0, -0.055], s: [0.05, 0.04, 0.048], r: [0, 0, -15] }]
  },

  /* ---------------- THIGHS ---------------- */
  {
    id: 'rectus-femoris', name: 'Rectus Femoris', latin: 'M. rectus femoris', group: 'Thighs', side: 'front',
    location: 'Middle of the front thigh — the only quadriceps muscle that crosses the hip.',
    action: 'Extends the knee and flexes the hip.',
    origin: 'Anterior inferior iliac spine', insertion: 'Tibial tuberosity via the patellar tendon',
    tip: 'One of the four "quads" (quadriceps = four heads).',
    parts: [{ p: [0.095, 0.7, 0.062], s: [0.036, 0.17, 0.034], r: [0, 0, 0] }]
  },
  {
    id: 'vastus-lateralis', name: 'Vastus Lateralis', latin: 'M. vastus lateralis', group: 'Thighs', side: 'front',
    location: 'Outer side of the thigh — the biggest quadriceps muscle.',
    action: 'Extends the knee.',
    origin: 'Greater trochanter and linea aspera of the femur', insertion: 'Tibial tuberosity via the patellar tendon',
    tip: 'Lateralis = lateral (outer). Vastus = vast/huge.',
    parts: [{ p: [0.15, 0.67, 0.03], s: [0.036, 0.18, 0.042], r: [0, 0, -2] }]
  },
  {
    id: 'vastus-medialis', name: 'Vastus Medialis', latin: 'M. vastus medialis', group: 'Thighs', side: 'front',
    location: 'Teardrop bulge on the inner thigh just above the knee.',
    action: 'Extends the knee and helps keep the kneecap tracking correctly.',
    origin: 'Intertrochanteric line and linea aspera', insertion: 'Tibial tuberosity via the patellar tendon',
    tip: 'Medialis = medial (inner). The "teardrop" quad.',
    parts: [{ p: [0.062, 0.6, 0.048], s: [0.034, 0.11, 0.034], r: [0, 0, 4] }]
  },
  {
    id: 'sartorius', name: 'Sartorius', latin: 'M. sartorius', group: 'Thighs', side: 'front',
    location: 'Long thin strap crossing the front of the thigh diagonally — the longest muscle in the body.',
    action: 'Flexes, abducts and externally rotates the hip; flexes the knee.',
    origin: 'Anterior superior iliac spine', insertion: 'Medial surface of the upper tibia (pes anserinus)',
    tip: 'Sartor = tailor. It crosses your legs into the cross-legged "tailor" sit.',
    parts: [{ p: [0.1, 0.72, 0.093], s: [0.013, 0.21, 0.011], r: [0, 0, -11] }]
  },
  {
    id: 'adductors', name: 'Hip Adductors', latin: 'Mm. adductores femoris', group: 'Thighs', side: 'front',
    location: 'Inner thigh (adductor longus, brevis, magnus, gracilis, pectineus).',
    action: 'Adduct the thigh — pull the legs together.',
    origin: 'Pubis and ischium', insertion: 'Linea aspera and medial femur',
    tip: 'ADDuctors ADD the leg toward the body; ABductors ABduct it away.',
    parts: [{ p: [0.052, 0.77, 0.022], s: [0.034, 0.14, 0.04], r: [0, 0, 8] }]
  },
  {
    id: 'biceps-femoris', name: 'Biceps Femoris', latin: 'M. biceps femoris', group: 'Thighs', side: 'back',
    location: 'Outer hamstring on the back of the thigh. Two heads: long and short.',
    action: 'Flexes the knee and extends the hip.',
    origin: 'Ischial tuberosity and linea aspera', insertion: 'Head of the fibula',
    tip: 'The only lateral hamstring. Hamstrings = Biceps femoris + Semitendinosus + Semimembranosus.',
    parts: [{ p: [0.125, 0.68, -0.048], s: [0.036, 0.175, 0.04], r: [0, 0, -1] }]
  },
  {
    id: 'semitendinosus', name: 'Semitendinosus & Semimembranosus', latin: 'Mm. semitendinosus et semimembranosus', group: 'Thighs', side: 'back',
    location: 'Inner (medial) hamstrings on the back of the thigh.',
    action: 'Flex the knee, extend the hip and medially rotate the lower leg.',
    origin: 'Ischial tuberosity', insertion: 'Medial tibia (pes anserinus / posterior medial condyle)',
    tip: '"Semi-tendon" is long and cord-like; "semi-membrane" is flat and sheet-like.',
    parts: [{ p: [0.068, 0.68, -0.048], s: [0.034, 0.175, 0.04], r: [0, 0, 1] }]
  },

  /* ---------------- LOWER LEG ---------------- */
  {
    id: 'tibialis-anterior', name: 'Tibialis Anterior', latin: 'M. tibialis anterior', group: 'Lower Leg', side: 'front',
    location: 'Outer edge of the shin bone, along the front of the lower leg.',
    action: 'Dorsiflexes the foot (lifts toes up) and inverts it.',
    origin: 'Lateral condyle and upper tibia', insertion: 'Medial cuneiform and 1st metatarsal',
    tip: 'Shin splints often hit this muscle. It lifts your toes so you don\'t trip.',
    parts: [{ p: [0.103, 0.3, 0.036], s: [0.022, 0.125, 0.02], r: [0, 0, 1] }]
  },
  {
    id: 'gastrocnemius', name: 'Gastrocnemius', latin: 'M. gastrocnemius', group: 'Lower Leg', side: 'back',
    location: 'The main calf bulge on the back of the lower leg, with medial and lateral heads.',
    action: 'Plantarflexes the foot (rising on tiptoe) and helps flex the knee.',
    origin: 'Medial and lateral condyles of the femur', insertion: 'Calcaneus via the Achilles tendon',
    tip: 'Gastro = belly, cnemius = leg → "belly of the leg". Joins soleus to form the Achilles.',
    parts: [
      { p: [0.066, 0.37, -0.034], s: [0.026, 0.095, 0.03], r: [0, 0, 0] },
      { p: [0.105, 0.37, -0.034], s: [0.026, 0.095, 0.03], r: [0, 0, 0] }
    ]
  },
  {
    id: 'soleus', name: 'Soleus', latin: 'M. soleus', group: 'Lower Leg', side: 'back',
    location: 'Flat muscle beneath gastrocnemius, visible on both sides lower down the calf.',
    action: 'Plantarflexes the foot; key for standing posture and walking (works with the knee bent).',
    origin: 'Soleal line of tibia and head of fibula', insertion: 'Calcaneus via the Achilles tendon',
    tip: 'Looks like a sole (flat fish). Gastrocnemius works best knee straight, soleus knee bent.',
    parts: [{ p: [0.087, 0.235, -0.026], s: [0.032, 0.085, 0.026], r: [0, 0, 0] }]
  }
];
