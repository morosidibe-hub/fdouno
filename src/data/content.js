export const config = {
  from: 'Moro Sidibe',
  to: 'Fatoumata Diaraye Douno',
  // Numéro WhatsApp de Moro au format international sans « + » ni espaces (ex. « 224620000000 »).
  // Laisser vide pour que WhatsApp demande à qui envoyer le message.
  whatsappNumber: '',
  whatsappMessage: 'J’ai lu ton message, viens me chercher... ❤️',
  // Chanson « Notre pure vérité » (public/notre pure verite.mp3). Les espaces sont encodés pour l'URL.
  musicSrc: encodeURI('/notre pure verite.mp3'),
  // Message vocal de Moro (public/voicenote.mp3). La section n'apparaît que si le fichier existe.
  voiceSrc: '/voicenote.mp3',
}

/** Photos du couple, dans public/assets/. */
export const photos = {
  moro: ['/assets/Moro1.jpg', '/assets/Moro2.jpg', '/assets/Moro3.jpg', '/assets/Moro4.jpg'],
  douno: ['/assets/Douno1.jpg', '/assets/Douno2.jpg', '/assets/Douno3.jpg'],
}

export const player = {
  title: 'Notre pure vérité',
  playing: 'Nos cœurs battent ensemble',
  paused: 'Touche pour écouter',
  synth: 'Composée en code',
  play: 'Lancer « Notre pure vérité »',
  pause: 'Mettre « Notre pure vérité » en pause',
}

export const intro = {
  greeting: 'Fatoumata Diaraye,',
  instruction: 'Mon cœur est fermé à clé. Glisse la clé jusqu’à lui : toi seule peux l’ouvrir.',
  dragging: 'Il bat plus fort à ton approche…',
  near: 'Encore un peu… lâche-la ici.',
  opened: 'Il t’appartient.',
  keyLabel: 'Clé de mon cœur : glisse-la jusqu’à la serrure, ou appuie sur Entrée',
  hint: 'Monte le son, doucement',
}

export const flower = {
  eyebrow: 'Éclosion',
  title: 'Mon amour, en train d’éclore',
  subtitle: 'Fais défiler, ou touche la fleur : elle s’ouvre pour toi, pétale après pétale. Comme mon cœur quand tu es là.',
  tapHint: 'Touche la fleur',
  bloomed: 'Chaque jour, elle s’ouvrira un peu plus. Pour toi.',
}

export const eclipse = {
  eyebrow: 'L’éclipse des regards',
  title: 'Toi, puis moi… puis nous',
  subtitle: 'Touche chaque photo pour la retourner : derrière chacun de tes regards, il y a le mien, qui ne voit que toi.',
  flipHint: 'Touche pour retourner',
  flipBack: 'Touche pour revenir',
  next: 'Photo suivante',
  previous: 'Photo précédente',
  // Recto : Douno. Verso : Moro, avec une citation d'amour.
  cards: [
    {
      douno: photos.douno[0],
      moro: photos.moro[0],
      caption: 'Ton regard',
      quote: 'Le jour où tu m’as regardé, j’ai compris que je n’avais plus besoin de chercher ailleurs.',
    },
    {
      douno: photos.douno[1],
      moro: photos.moro[1],
      caption: 'Ta lumière',
      quote: 'Tu es la seule lumière que je veux voir en premier le matin et en dernier le soir.',
    },
    {
      douno: photos.douno[2],
      moro: photos.moro[2],
      caption: 'Ta force',
      quote: 'Même quand je t’ai déçue, tu es restée debout. C’est pour toi que je veux devenir meilleur.',
    },
  ],
  fusion: {
    moro: photos.moro[3],
    douno: photos.douno[0],
    title: 'La fusion',
    hint: 'Glisse ma photo jusqu’à la tienne',
    keyboardHint: 'ou appuie sur le bouton pour nous rapprocher',
    button: 'Nous rapprocher',
    done: 'Deux regards, un seul cœur.',
    doneMessage: 'Kamsar et Conakry n’ont jamais été aussi proches. Moro & Douno, pour toujours.',
    replay: 'Revoir la fusion',
  },
}

export const hero = {
  dedication: 'Pour toi, Fatoumata Diaraye Douno',
  lines: ['Fatoumata Diaraye,', 'pardonne-moi d’avoir oublié', 'que mon plus beau projet, c’est toi.'],
  message:
    'Ici, à Conakry, je me suis laissé absorber par les écrans, les lignes de code et des journées trop pleines. J’ai répondu tard, j’ai écouté à moitié, et je t’ai laissée seule avec tes doutes. Ce n’est pas l’amour que tu mérites. Alors j’ai construit cette page, ligne après ligne, pour te dire ce que mes silences n’ont pas su dire : tu es ma priorité, mon calme et ma lumière.',
  cta: 'Ouvrir ma lettre',
  soundHint: 'Mets le son, doucement : c’est notre mélodie',
  signature: '— Moro, depuis Conakry',
}

export const journey = {
  eyebrow: 'Le voyage',
  title: 'De Kamsar à Conakry',
  subtitle:
    'Entre nous, il y a une route, quelques villes et beaucoup de kilomètres. Mais chacun d’eux ne mène qu’à un seul endroit : vers toi.',
  cta: 'Rapprocher nos cœurs',
  replay: 'Refaire le voyage',
  touchHint: 'Touche une ville pour lire son message, glisse ton doigt pour semer des étoiles',
  travelling: 'Mon cœur est en route…',
  stops: [
    {
      name: 'Kamsar',
      x: 90,
      y: 80,
      title: 'Ton point de départ',
      message:
        'Là où tu es en ce moment. Là où mon cœur s’envole chaque soir, même quand mes mots n’ont pas su le suivre.',
    },
    {
      name: 'Boffa',
      x: 190,
      y: 210,
      title: 'Le relais du pardon',
      message:
        'Ici, je dépose mes excuses : pour mes silences, mes absences, et chaque fois où tu t’es sentie seule alors que j’étais là.',
    },
    {
      name: 'Dubréka',
      x: 290,
      y: 400,
      title: 'Le relais des promesses',
      message:
        'Ici, je te promets plus d’attention, plus de présence, plus de nous. Pas des mots en l’air : des actes, chaque jour.',
    },
    {
      name: 'Conakry',
      x: 180,
      y: 520,
      title: 'Mes bras',
      message:
        'Ici, je t’attends. Pas seulement moi : une version de moi qui a compris ce qu’il a failli perdre.',
    },
  ],
  arrival: {
    title: 'Distance entre nos cœurs : 0 %',
    message:
      'Viens, Fatoumata Diaraye. Conakry n’a vraiment de couleurs que lorsque tu y es. Ta place est ici, à côté de moi.',
  },
}

export const letters = {
  eyebrow: 'Lettres secrètes',
  title: 'Ce que mon cœur n’a pas su te dire',
  subtitle: 'Touche chaque carte pour l’ouvrir. Chacune garde un aveu, une raison de t’aimer ou une promesse.',
  completed: 'Tu as tout lu… Maintenant, laisse-moi te le prouver, chaque jour.',
  cards: [
    {
      category: 'pardon',
      front: 'Mon premier aveu',
      back: 'Pardon pour les messages laissés sans réponse, pour les « j’arrive » qui n’arrivaient jamais. Tu n’aurais jamais dû te sentir en option. Tu es mon essentiel.',
    },
    {
      category: 'raison',
      front: 'Ton sourire',
      back: 'Il a ce pouvoir étrange de faire taire tout le bruit de Conakry. Quand tu souris, le monde entier se met à l’heure de ton cœur.',
    },
    {
      category: 'promesse',
      front: 'Promesse n°1 · Présence',
      back: 'Chaque soir, mon téléphone sera à toi. Aucune notification ne sera jamais plus importante que ta voix.',
    },
    {
      category: 'pardon',
      front: 'Ce que j’ai compris',
      back: 'Mon absence n’était pas un manque d’amour. Mais un amour qu’on ne montre pas finit par blesser, et je ne veux plus jamais te blesser ainsi.',
    },
    {
      category: 'raison',
      front: 'Ta force',
      back: 'Ta dignité, ta patience, ta façon de rester debout même quand je te déçois. Je t’admire, Diaraye, bien plus que tu ne l’imagines.',
    },
    {
      category: 'promesse',
      front: 'Promesse n°2 · Écoute',
      back: 'T’écouter vraiment, sans écran entre nous, les yeux dans les yeux. Tes mots méritent toute mon attention, pas ce qu’il en reste.',
    },
    {
      category: 'pardon',
      front: 'Sans excuse',
      back: 'Je ne me cacherai ni derrière le travail ni derrière la fatigue. J’ai été négligent. Tu mérites le meilleur de moi, et c’est ce que je veux t’offrir.',
    },
    {
      category: 'raison',
      front: 'Ton nom',
      back: 'Fatoumata Diaraye Douno. Je l’écris dans mon code, je le murmure dans mes prières. Il sonne comme une promesse de paix.',
    },
    {
      category: 'promesse',
      front: 'Promesse n°3 · Toujours',
      back: 'Te choisir chaque jour, dans les jours faciles comme dans les tempêtes. Pas seulement avec des mots : avec des actes.',
    },
  ],
}

export const tech = {
  eyebrow: 'Moro Code Lab',
  title: 'Dans ma langue à moi',
  intro: [
    'Tu sais que je parle couramment le code. C’est même lui qui m’a trop souvent volé à toi.',
    'Alors aujourd’hui, je le mets à ton service. Voici l’algorithme qui tourne désormais en boucle dans ma vie : sans bug, sans pause, sans fin.',
  ],
  filename: 'pardon.js',
  code: [
    '// Moro Code Lab · compilé avec le cœur',
    'import { Moro, Douno } from "notre-histoire";',
    '',
    'const erreurs = ["silences", "retards", "absences"];',
    'erreurs.forEach((e) => Moro.assume(e));',
    '',
    'if (Douno.isLoved) {',
    '  Moro.giveHeart(100);',
    '}',
    '',
    'let attention = 0;',
    'while (Moro.heart.beats) {',
    '  Moro.love.increase();',
    '  attention++;',
    '  if (Douno.triste) Moro.consoler(Douno);',
    '}',
    '',
    'Moro.rapprocher("Kamsar", "Conakry");',
  ],
  run: 'Exécuter le Pardon',
  rerun: 'Exécuter encore',
  output: [
    { text: '$ node pardon.js --coeur=sincere', tone: 'cmd', delay: 0 },
    { text: '▸ Compilation des sentiments…  ✓', tone: 'info', delay: 700 },
    { text: '▸ Erreurs détectées : 3 → assumées, pas excusées', tone: 'warn', delay: 800 },
    { text: '▸ Douno.isLoved === true  ✓ (depuis toujours)', tone: 'info', delay: 800 },
    { text: '▸ Moro.giveHeart(100)  →  100 % du cœur transféré', tone: 'info', delay: 700 },
    { text: '▸ Moro.love.increase() × ∞  ·  attention : 0 → ∞', tone: 'info', delay: 700 },
    { text: '▸ Tests d’amour : 1000 / 1000 réussis', tone: 'success', delay: 800 },
    { text: '✔ Pardon exécuté. En attente de la réponse de Fatoumata Diaraye… ❤', tone: 'final', delay: 900 },
  ],
}

export const kintsugi = {
  eyebrow: 'Kintsugi',
  title: 'Réparer notre cœur avec de l’or',
  subtitle:
    'Au Japon, on répare les objets brisés avec de l’or. Les fissures ne se cachent pas : elles deviennent la plus belle partie de l’histoire. C’est ce que je veux faire de nous.',
  cta: 'Réparer avec de l’or',
  replay: 'Revoir',
  steps: ['Rapprocher les morceaux…', 'Couler l’or dans la fissure…', 'Nous, pour toujours.'],
  caption: 'Nos fissures, réparées à l’or. Plus forts qu’avant.',
  signature: 'Moro & Diaraye',
}

export const openWhen = {
  eyebrow: 'Ouvre-moi quand…',
  title: 'Des lettres pour chaque moment',
  subtitle:
    'Garde-les pour les jours où tu en auras besoin. Je ne serai pas toujours à côté de toi, mais mes mots, eux, le seront.',
  letters: [
    {
      when: 'tu doutes de moi',
      body: 'Alors relis ceci : je ne suis allé nulle part. Même dans mes silences maladroits, c’est toi que je choisissais. Si le doute revient, appelle-moi, même à trois heures du matin. Je répondrai. Je te le dois.',
    },
    {
      when: 'tu es triste',
      body: 'Ferme les yeux et imagine ma main dans la tienne. Tu n’as pas besoin d’être forte avec moi. Pleure si tu en as besoin, puis écris-moi : je veux porter ce poids avec toi, pas te regarder le porter seule.',
    },
    {
      when: 'je te manque',
      body: 'Tu me manques aussi, sans doute plus encore. Regarde le ciel ce soir : c’est le même au-dessus de Kamsar et de Conakry. Bientôt, nous le regarderons ensemble.',
    },
    {
      when: 'tu es fière de toi',
      body: 'Moi, je le suis déjà. De ta force, de ta dignité, de la femme que tu es. Je veux être là pour applaudir chacune de tes victoires, même les plus petites.',
    },
  ],
  close: 'Refermer la lettre',
}

export const coupons = {
  eyebrow: 'Bons d’amour',
  title: 'Des promesses que tu peux encaisser',
  subtitle:
    'Des mots, tu en as assez entendu. Voici des engagements concrets : envoie-moi un bon quand tu veux, et je l’honore. Sans condition, sans date d’expiration.',
  swipeHint: 'Fais glisser pour voir tous les bons',
  use: 'Réclamer',
  used: 'Réclamé ❤',
  validity: 'Valable à vie',
  message: (title) => `Moro, j’utilise mon bon d’amour « ${title} » ❤️`,
  items: [
    {
      icon: 'PhoneOff',
      title: 'Une soirée sans téléphone',
      text: 'Une soirée entière où mon téléphone reste éteint. Juste toi, moi et nos histoires.',
    },
    {
      icon: 'UtensilsCrossed',
      title: 'Un dîner de ton choix',
      text: 'Le restaurant que tu veux à Conakry, le plat que tu veux. Je réserve, j’invite, je t’écoute.',
    },
    {
      icon: 'Sunset',
      title: 'Balade sur la corniche',
      text: 'Au coucher du soleil, main dans la main, face à l’océan. Rien d’autre au programme.',
    },
    {
      icon: 'Ear',
      title: 'Une heure d’écoute',
      text: 'Tu parles, je t’écoute. Sans interrompre, sans juger, sans regarder l’heure.',
    },
    {
      icon: 'PhoneCall',
      title: 'Appel express',
      text: 'Tu m’envoies ce bon et je t’appelle dans les cinq minutes, où que je sois.',
    },
    {
      icon: 'Crown',
      title: 'Joker « Tu as raison »',
      text: 'À utiliser pendant n’importe quelle dispute. Effet immédiat, sans négociation possible.',
    },
  ],
}

export const voice = {
  eyebrow: 'Ma voix',
  title: 'Avant que tu répondes, écoute-moi',
  subtitle: 'Il y a des choses qu’on ne peut pas écrire. Alors je les ai dites, pour toi.',
  from: 'Moro',
  label: 'Message vocal · pour Douno',
  play: 'Écouter mon message',
  pause: 'Pause',
}

export const reconciliation = {
  eyebrow: 'La question',
  title: 'Me pardonnes-tu et acceptes-tu qu’on continue notre histoire ?',
  subtitle: 'Prends ton temps. Mon cœur, lui, connaît déjà la réponse qu’il espère.',
  yes: 'Oui',
  ticketTitle: 'Billet VIP du cœur',
  noLabels: ['Non', 'Tu es sûre ?', 'Vraiment ?', 'Réfléchis encore…', 'Mon cœur va pleurer', 'Dernière chance…', 'Allez, dis oui'],
  attempts: (n) => (n === 1 ? '1 tentative de fuite… le Oui t’attend' : `${n} tentatives de fuite… le Oui grandit`),
  boarding: 'Embarquement immédiat',
  route: { from: 'KMS', fromCity: 'Kamsar', to: 'CKY', toCity: 'Conakry' },
  accepted: {
    title: 'Merci, mon amour.',
    message:
      'Tu viens de rendre à mon cœur toute sa lumière. Je t’attends à Conakry avec un cœur plus attentif, un téléphone qui sonnera pour toi en premier, et une soirée rien que pour nous deux. Préviens-moi quand tu prends la route : je veux suivre chaque kilomètre jusqu’à toi.',
    ticket: [
      { label: 'Passagère', value: 'Fatoumata Diaraye Douno' },
      { label: 'Destination finale', value: 'Dans mes bras' },
      { label: 'Date', value: 'Dès que ton cœur est prêt' },
      { label: 'Classe', value: 'VIP · Reine' },
      { label: 'Siège', value: 'À mes côtés, pour toujours' },
    ],
    reply: 'Ouvrir WhatsApp',
    replyHint: 'Ton message est déjà écrit, il ne reste qu’à l’envoyer :',
    restart: 'Relire la lettre',
  },
}

export const footer = {
  text: 'Codé avec le cœur à Conakry par Moro Sidibe, pour la seule personne qui compte vraiment : Fatoumata Diaraye Douno.',
}
