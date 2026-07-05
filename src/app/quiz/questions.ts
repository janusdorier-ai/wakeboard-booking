// Quiz « La Nati en Coupe du Monde » — les 4 dernières éditions.
// Chaque manche = une Coupe du Monde, 3 questions par manche.

export interface QuizQuestion {
  cup: string           // « Afrique du Sud 2010 »
  flag: string          // emoji du pays hôte
  question: string
  choices: string[]     // 4 propositions
  answer: number        // index de la bonne réponse
  fact: string          // « Le saviez-vous ? » affiché après la réponse
}

export const QUESTIONS: QuizQuestion[] = [
  // ── Afrique du Sud 2010 ──
  {
    cup: 'Afrique du Sud 2010',
    flag: '🇿🇦',
    question: 'En 2010, la Suisse bat 1-0 le futur champion du monde dès son entrée en lice. Quelle équipe ?',
    choices: ['L’Italie', 'L’Espagne', 'L’Allemagne', 'Les Pays-Bas'],
    answer: 1,
    fact: 'Ce fut la SEULE défaite de l’Espagne dans tout le tournoi… qu’elle a fini par gagner. Exploit signé Gelson Fernandes !',
  },
  {
    cup: 'Afrique du Sud 2010',
    flag: '🇿🇦',
    question: 'Qui était le sélectionneur de la Nati lors du Mondial 2010 ?',
    choices: ['Köbi Kuhn', 'Vladimir Petković', 'Ottmar Hitzfeld', 'Murat Yakin'],
    answer: 2,
    fact: 'Ottmar Hitzfeld, légende du Bayern et de Dortmund, a dirigé la Nati de 2008 à 2014.',
  },
  {
    cup: 'Afrique du Sud 2010',
    flag: '🇿🇦',
    question: 'Combien de buts la Suisse a-t-elle marqués au total pendant le Mondial 2010 ?',
    choices: ['1', '3', '5', '7'],
    answer: 0,
    fact: 'Un seul but en trois matchs (celui de Gelson Fernandes contre l’Espagne)… et une élimination en phase de groupes malgré l’exploit.',
  },

  // ── Brésil 2014 ──
  {
    cup: 'Brésil 2014',
    flag: '🇧🇷',
    question: 'Au Brésil en 2014, un Suisse claque un triplé contre le Honduras (3-0). Qui ?',
    choices: ['Haris Seferović', 'Xherdan Shaqiri', 'Admir Mehmedi', 'Josip Drmić'],
    answer: 1,
    fact: 'Le « Magic Cube » Shaqiri signe le premier triplé suisse en Coupe du Monde depuis… 1954 !',
  },
  {
    cup: 'Brésil 2014',
    flag: '🇧🇷',
    question: 'Contre l’Équateur, la Suisse arrache la victoire 2-1 dans le temps additionnel. Qui marque à la 93e minute ?',
    choices: ['Blerim Džemaili', 'Granit Xhaka', 'Haris Seferović', 'Valon Behrami'],
    answer: 2,
    fact: 'Contre-attaque éclair partie de la surface suisse : Seferović conclut à la 93e. Un des buts les plus tardifs de l’histoire de la Nati au Mondial.',
  },
  {
    cup: 'Brésil 2014',
    flag: '🇧🇷',
    question: 'En 8e de finale 2014, la Suisse s’incline 1-0 après prolongation sur un but de Di María. Contre qui ?',
    choices: ['Le Brésil', 'L’Allemagne', 'La France', 'L’Argentine'],
    answer: 3,
    fact: 'But de Di María à la 118e… et poteau de Džemaili dans la foulée. L’Argentine ira jusqu’en finale.',
  },

  // ── Russie 2018 ──
  {
    cup: 'Russie 2018',
    flag: '🇷🇺',
    question: 'En 2018, la Suisse tient tête au Brésil (1-1). Qui égalise pour la Nati ?',
    choices: ['Steven Zuber', 'Breel Embolo', 'Mario Gavranović', 'Ricardo Rodríguez'],
    answer: 0,
    fact: 'Sur corner, Zuber devance Miranda et fait 1-1. Le Brésil n’avait plus concédé de but en phase de groupes depuis 2014.',
  },
  {
    cup: 'Russie 2018',
    flag: '🇷🇺',
    question: 'Victoire 2-1 contre la Serbie : deux buteurs suisses célèbrent avec « l’aigle bicéphale ». Lesquels ?',
    choices: ['Seferović et Embolo', 'Xhaka et Shaqiri', 'Džemaili et Behrami', 'Lichtsteiner et Schär'],
    answer: 1,
    fact: 'Le geste, référence au drapeau albanais, leur a valu une amende de la FIFA. Shaqiri avait marqué le but victorieux à la 90e.',
  },
  {
    cup: 'Russie 2018',
    flag: '🇷🇺',
    question: 'La Suisse quitte le Mondial 2018 en 8e de finale, battue 1-0. Par qui ?',
    choices: ['La Croatie', 'L’Angleterre', 'La Suède', 'La Belgique'],
    answer: 2,
    fact: 'Frappe déviée d’Emil Forsberg à la 66e. Quatrième 8e de finale perdu d’affilée pour la Nati en Coupe du Monde.',
  },

  // ── Qatar 2022 ──
  {
    cup: 'Qatar 2022',
    flag: '🇶🇦',
    question: 'Au Qatar, Breel Embolo marque le but victorieux contre le Cameroun (1-0)… mais refuse de célébrer. Pourquoi ?',
    choices: [
      'Il pensait être hors-jeu',
      'Il est né au Cameroun',
      'Il avait promis un but à sa mère',
      'Par superstition',
    ],
    answer: 1,
    fact: 'Né à Yaoundé, Embolo lève simplement les mains en signe de respect pour son pays natal. Image forte du tournoi.',
  },
  {
    cup: 'Qatar 2022',
    flag: '🇶🇦',
    question: 'Match fou contre la Serbie (3-2) pour la qualif : qui inscrit le but décisif ?',
    choices: ['Xherdan Shaqiri', 'Breel Embolo', 'Remo Freuler', 'Ruben Vargas'],
    answer: 2,
    fact: 'Shaqiri ouvre le score (3e Mondial de suite où il marque !), Embolo égalise, et Freuler délivre la Suisse juste après la pause.',
  },
  {
    cup: 'Qatar 2022',
    flag: '🇶🇦',
    question: 'Le 8e de finale contre le Portugal tourne au cauchemar. Quel est le score final ?',
    choices: ['3-0', '4-1', '5-2', '6-1'],
    answer: 3,
    fact: 'Triplé de Gonçalo Ramos, titularisé à la place de… Cristiano Ronaldo. La plus lourde défaite suisse en Coupe du Monde depuis 1954.',
  },
]
