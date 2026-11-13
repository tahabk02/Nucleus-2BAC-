import marieCurieImg from '../assets/images/portrait_marie_curie_1794525106719.jpg';
import henriBecquerelImg from '../assets/images/portrait_henri_becquerel_1794525108011.jpg';
import ernestRutherfordImg from '../assets/images/portrait_ernest_rutherford_1794525107803.jpg';
import frederickSoddyImg from '../assets/images/portrait_frederick_soddy_1794525108606.jpg';
import albertEinsteinImg from '../assets/images/portrait_albert_einstein_1794525108331.jpg';
import { ChapterId } from '../types/lesson';

export interface ScientistProfile {
  id: string;
  name: string;
  lifespan: string;
  role: string;
  portraitSrc: string;
  discovery: string;
  keyFormulaLatex: string;
  quote: string;
  chapters: ChapterId[];
}

export type QuizTopic =
  | 'noyau'
  | 'soddy'
  | 'demi-vie'
  | 'courbes'
  | 'energie';

export interface QuizQuestion {
  id: string;
  chapterId: ChapterId;
  topic: QuizTopic;
  prompt: string;
  promptLatex?: string;
  options: { label: string; latex?: string }[];
  correctIndex: number;
  explanationLatex: string;
  explanationText: string;
}

export const SCIENTISTS: ScientistProfile[] = [
  {
    id: 'rutherford',
    name: 'Ernest Rutherford',
    lifespan: '1871 – 1937',
    role: 'Découvreur du noyau atomique & des rayons α, β',
    portraitSrc: ernestRutherfordImg,
    discovery:
      "En bombardant une feuille d'or par des particules α (1911), il démontre que l'atome est essentiellement vide et concentré dans un noyau positif dense.",
    keyFormulaLatex: '{}^4_2 He^{2+} \\; (\\alpha) \\quad ; \\quad R \\approx R_0 A^{1/3}',
    quote:
      'Toute science est soit de la physique, soit de la collection de timbres.',
    chapters: ['intro-nucleus', 'decay-alpha', 'mass-defect'],
  },
  {
    id: 'einstein',
    name: 'Albert Einstein',
    lifespan: '1879 – 1955',
    role: 'Équivalence masse-énergie',
    portraitSrc: albertEinsteinImg,
    discovery:
      "Établit en 1905 le lien fondamental entre défaut de masse Δm d'un noyau et son énergie de liaison nucléaire E.",
    keyFormulaLatex: 'E = \\Delta m \\cdot c^2',
    quote:
      'La masse d’un corps est une mesure de son contenu énergétique.',
    chapters: ['intro-nucleus', 'decay-gamma', 'mass-defect'],
  },
  {
    id: 'soddy',
    name: 'Frederick Soddy',
    lifespan: '1877 – 1956',
    role: 'Lois de conservation nucléaire & Isotopes',
    portraitSrc: frederickSoddyImg,
    discovery:
      'Formule les lois de déplacement radioactif (conservation de A et Z) et introduit le concept d’isotopes pour des atomes de même Z mais de masse A différente.',
    keyFormulaLatex: '\\sum A_{\\text{réactifs}} = \\sum A_{\\text{produits}} \\quad ; \\quad \\sum Z_{\\text{réactifs}} = \\sum Z_{\\text{produits}}',
    quote:
      'Les isotopes occupent la même case du tableau périodique tout en différant par leur noyau.',
    chapters: ['decay-alpha', 'decay-beta-minus', 'decay-beta-plus'],
  },
  {
    id: 'curie',
    name: 'Marie Curie',
    lifespan: '1867 – 1934',
    role: 'Pionnière de la radioactivité (Polonium & Radium)',
    portraitSrc: marieCurieImg,
    discovery:
      'Invente le terme « radioactivité », isole le Polonium et le Radium, et montre que le rayonnement est une propriété atomique indépendante de la température et de la pression.',
    keyFormulaLatex: 'N(t) = N_0 \\cdot e^{-\\lambda t} \\quad ; \\quad t_{1/2} = \\frac{\\ln 2}{\\lambda}',
    quote:
      'Dans la vie, rien n’est à craindre, tout est à comprendre.',
    chapters: ['decay-gamma', 'decay-law', 'half-life', 'usual-curves'],
  },
  {
    id: 'becquerel',
    name: 'Henri Becquerel',
    lifespan: '1852 – 1908',
    role: 'Découvreur de la radioactivité naturelle (1896)',
    portraitSrc: henriBecquerelImg,
    discovery:
      "Observe fortuitement l'impression d'une plaque photographique par des sels d'uranium dans l'obscurité. L'unité SI de l'activité porte son nom : le Becquerel (Bq).",
    keyFormulaLatex: 'a(t) = -\\frac{dN}{dt} = \\lambda N(t) \\quad [\\text{Bq}]',
    quote:
      'Ces radiations invisibles émanent spontanément des sels d’uranium sans excitation lumineuse.',
    chapters: ['activity-dating', 'segre-diagram', 'usual-curves'],
  },
];

export const CHAPTER_QUIZZES: QuizQuestion[] = [
  {
    id: 'q-intro-1',
    chapterId: 'intro-nucleus',
    topic: 'noyau',
    prompt: 'Deux isotopes d’un même élément chimique possèdent :',
    options: [
      { label: 'Le même nombre de masse A, mais Z différent' },
      { label: 'Le même numéro atomique Z, mais A différent' },
      { label: 'Le même nombre de neutrons N, mais Z différent' },
      { label: 'La même énergie de liaison exactement' },
    ],
    correctIndex: 1,
    explanationLatex: '{}^{12}_6 C,\\; {}^{13}_6 C,\\; {}^{14}_6 C \\implies \\text{Même } Z = 6, \\; A \\text{ différent}',
    explanationText:
      'Les isotopes partagent le même nombre de protons Z (même élément chimique) mais ont un nombre différent de neutrons N, donc de nucléons A.',
  },
  {
    id: 'q-intro-2',
    chapterId: 'intro-nucleus',
    topic: 'energie',
    prompt: "L'expression du défaut de masse Δm d'un noyau ^A_Z X est :",
    options: [
      { label: 'Δm', latex: 'm_{\\text{noyau}} - [Z m_p + N m_n]' },
      { label: 'Δm', latex: '[Z m_p + (A-Z) m_n] - m_{\\text{noyau}}' },
      { label: 'Δm', latex: '[A m_p + Z m_n] - m_{\\text{noyau}}' },
    ],
    correctIndex: 1,
    explanationLatex: '\\Delta m = [Z m_p + (A-Z) m_n] - m_{\\text{noyau}} > 0 \\; ; \\; E_\\ell = \\Delta m \\cdot c^2',
    explanationText:
      'La masse du noyau lié est toujours inférieure à la somme des masses de ses nucléons séparés.',
  },
  {
    id: 'q-alpha-1',
    chapterId: 'decay-alpha',
    topic: 'soddy',
    prompt: "D'après les lois de Soddy, quel est le noyau fils issu de la désintégration α de l'Uranium 238 ?",
    promptLatex: '{}^{238}_{92} U \\longrightarrow {}^A_Z Y + {}^4_2 He',
    options: [
      { label: 'Y', latex: '{}^{234}_{90} Th' },
      { label: 'Y', latex: '{}^{238}_{90} Th' },
      { label: 'Y', latex: '{}^{234}_{94} Pu' },
      { label: 'Y', latex: '{}^{236}_{90} Th' },
    ],
    correctIndex: 0,
    explanationLatex: '238 = A + 4 \\Rightarrow A = 234 \\quad ; \\quad 92 = Z + 2 \\Rightarrow Z = 90',
    explanationText:
      'La radioactivité α diminue A de 4 et Z de 2 (ΔA = −4, ΔZ = −2).',
  },
  {
    id: 'q-alpha-2',
    chapterId: 'decay-alpha',
    topic: 'soddy',
    prompt: "Selon les lois de conservation de Soddy, déterminer le nombre x de particules α et y de particules β⁻ :",
    promptLatex: '{}^{238}_{92} U \\longrightarrow {}^{206}_{82} Pb + x\\,{}^{4}_{2} He + y\\,{}^{0}_{-1} e',
    options: [
      { label: 'x = 6 et y = 8' },
      { label: 'x = 8 et y = 6' },
      { label: 'x = 8 et y = 4' },
      { label: 'x = 7 et y = 6' },
    ],
    correctIndex: 1,
    explanationLatex: '238 = 206 + 4x \\Rightarrow x = 8 \\quad ; \\quad 92 = 82 + 2(8) - y \\Rightarrow y = 6',
    explanationText:
      'La conservation de A donne x = (238 − 206)/4 = 8 désintégrations α, puis la conservation de Z donne y = 82 + 16 − 92 = 6 désintégrations β⁻.',
  },
  {
    id: 'q-bm-1',
    chapterId: 'decay-beta-minus',
    topic: 'soddy',
    prompt: 'Quel est le mécanisme interne responsable de la radioactivité β⁻ dans le noyau ?',
    options: [
      { label: 'p → n', latex: '{}^1_1 p \\to {}^1_0 n + {}^0_{+1} e' },
      { label: 'n → p', latex: '{}^1_0 n \\to {}^1_1 p + {}^0_{-1} e' },
      { label: 'He', latex: '{}^4_2 He \\to 2{}^1_1 p + 2{}^1_0 n' },
    ],
    correctIndex: 1,
    explanationLatex: '{}^1_0 n \\longrightarrow {}^1_1 p + {}^0_{-1} e \\quad (\\Delta A = 0,\\; \\Delta Z = +1)',
    explanationText:
      'Un neutron se transforme en proton en émettant un électron ⁰₋₁e : A reste constant et Z augmente de 1.',
  },
  {
    id: 'q-bm-2',
    chapterId: 'decay-beta-minus',
    topic: 'soddy',
    prompt: 'Appliquer les lois de Soddy à la désintégration β⁻ du Carbone 14 :',
    promptLatex: '{}^{14}_{6} C \\longrightarrow {}^A_Z N + {}^{0}_{-1} e',
    options: [
      { label: 'A = 14 et Z = 5' },
      { label: 'A = 13 et Z = 7' },
      { label: 'A = 14 et Z = 7' },
      { label: 'A = 15 et Z = 6' },
    ],
    correctIndex: 2,
    explanationLatex: '14 = A + 0 \\Rightarrow A = 14 \\quad ; \\quad 6 = Z - 1 \\Rightarrow Z = 7',
    explanationText:
      'Le nombre de masse A reste inchangé (14) et le numéro atomique Z augmente de +1 pour conserver la charge totale (6 = 7 − 1).',
  },
  {
    id: 'q-bp-1',
    chapterId: 'decay-beta-plus',
    topic: 'soddy',
    prompt: 'Compléter l’équation de désintégration β⁺ du Phosphore 30 :',
    promptLatex: '{}^{30}_{15} P \\longrightarrow {}^A_Z Si + {}^0_{+1} e',
    options: [
      { label: 'A = 30, Z = 16' },
      { label: 'A = 29, Z = 14' },
      { label: 'A = 30, Z = 14' },
      { label: 'A = 31, Z = 14' },
    ],
    correctIndex: 2,
    explanationLatex: '30 = A + 0 \\Rightarrow A = 30 \\quad ; \\quad 15 = Z + 1 \\Rightarrow Z = 14',
    explanationText:
      'Lors d’une désintégration β⁺, un positon ⁰₊₁e est émis : ΔA = 0 et ΔZ = −1.',
  },
  {
    id: 'q-bp-2',
    chapterId: 'decay-beta-plus',
    topic: 'soddy',
    prompt: 'Dans un noyau riche en protons (sous la vallée de stabilité), la radioactivité β⁺ résulte de :',
    options: [
      { label: 'p → n', latex: '{}^1_1 p \\longrightarrow {}^1_0 n + {}^0_{+1} e' },
      { label: 'n → p', latex: '{}^1_0 n \\longrightarrow {}^1_1 p + {}^0_{-1} e' },
      { label: 'Emission alpha', latex: '{}^4_2 He \\text{ émis par fission}' },
    ],
    correctIndex: 0,
    explanationLatex: '{}^1_1 p \\longrightarrow {}^1_0 n + {}^0_{+1} e \\quad (\\text{Positon } e^+)',
    explanationText:
      'Un proton excédentaire se transforme en neutron en émettant un positon ⁰₊₁e afin de ramener le noyau vers la zone de stabilité.',
  },
  {
    id: 'q-gamma-1',
    chapterId: 'decay-gamma',
    topic: 'soddy',
    prompt: 'Lors d’une désexcitation nucléaire accompagnée d’un rayonnement γ :',
    options: [
      { label: 'ΔA = −4 et ΔZ = −2' },
      { label: 'ΔA = 0 et ΔZ = +1' },
      { label: 'ΔA = 0 et ΔZ = 0' },
    ],
    correctIndex: 2,
    explanationLatex: '{}^A_Z X^* \\longrightarrow {}^A_Z X + \\gamma \\quad (\\Delta A = 0,\\; \\Delta Z = 0)',
    explanationText:
      'Le noyau excité X* libère uniquement un photon γ sans changer son nombre de protons Z ni de nucléons A.',
  },
  {
    id: 'q-decay-1',
    chapterId: 'decay-law',
    topic: 'demi-vie',
    prompt: 'À l’instant t = τ = 1/λ, quel pourcentage des noyaux initiaux N₀ reste-t-il non désintégré ?',
    options: [
      { label: '50% de N₀' },
      { label: '63% de N₀' },
      { label: '37% de N₀' },
      { label: '25% de N₀' },
    ],
    correctIndex: 2,
    explanationLatex: 'N(\\tau) = N_0 \\cdot e^{-\\lambda \\cdot (1/\\lambda)} = N_0 \\cdot e^{-1} \\approx 0{,}37\\,N_0',
    explanationText:
      'À t = τ, 37% des noyaux restent (et 63% se sont désintégrés). La tangente à t = 0 coupe l’axe du temps à t = τ.',
  },
  {
    id: 'q-decay-2',
    chapterId: 'decay-law',
    topic: 'demi-vie',
    prompt: 'Graphiquement, comment repère-t-on la constante de temps τ sur la courbe N(t) ?',
    options: [
      { label: 'L’abscisse où N(t) = N₀ / 2' },
      { label: 'L’intersection de la tangente à t = 0 avec l’axe du temps' },
      { label: 'L’abscisse où N(t) = 0' },
    ],
    correctIndex: 1,
    explanationLatex: '\\left.\\frac{dN}{dt}\\right|_{t=0} = -\\lambda N_0 = -\\frac{N_0}{\\tau} \\implies N_{\\text{tan}}(\\tau) = 0',
    explanationText:
      'La tangente tracée à t = 0 décroît linéairement et coupe l’axe des abscisses exactement à l’instant t = τ = 1/λ.',
  },
  {
    id: 'q-half-1',
    chapterId: 'half-life',
    topic: 'demi-vie',
    prompt: 'Si un échantillon contient N₀ noyaux à t = 0, combien en reste-t-il après t = 3 · t₁/₂ ?',
    options: [
      { label: 'N₀ / 3' },
      { label: 'N₀ / 6' },
      { label: 'N₀ / 8' },
      { label: 'N₀ / 9' },
    ],
    correctIndex: 2,
    explanationLatex: 'N(3\\,t_{1/2}) = \\frac{N_0}{2^3} = \\frac{N_0}{8} = 12{,}5\\%\\,N_0',
    explanationText:
      'À chaque demi-vie t₁/₂, le nombre de noyaux radioactifs restants est divisé par 2.',
  },
  {
    id: 'q-half-2',
    chapterId: 'half-life',
    topic: 'demi-vie',
    prompt: 'Quelle relation relie la demi-vie t₁/₂ à la constante radioactive λ et à τ ?',
    options: [
      { label: 'Formule 1', latex: 't_{1/2} = \\lambda \\cdot \\ln(2)' },
      { label: 'Formule 2', latex: 't_{1/2} = \\frac{\\ln(2)}{\\lambda} = \\tau \\cdot \\ln(2)' },
      { label: 'Formule 3', latex: 't_{1/2} = \\frac{\\tau}{\\ln(2)}' },
    ],
    correctIndex: 1,
    explanationLatex: 'N(t_{1/2}) = \\frac{N_0}{2} = N_0 e^{-\\lambda t_{1/2}} \\implies t_{1/2} = \\frac{\\ln 2}{\\lambda} = \\tau\\ln 2',
    explanationText:
      'Comme e^(−λ t₁/₂) = 1/2, on obtient λ · t₁/₂ = ln(2), d’où t₁/₂ = ln(2)/λ = τ · ln(2).',
  },
  {
    id: 'q-half-3',
    chapterId: 'half-life',
    topic: 'demi-vie',
    prompt: 'Quelle proportion des noyaux s’est DÉSINTÉGRÉE (N_D) au bout d’une durée t = 2 · t₁/₂ ?',
    options: [
      { label: '25% de N₀' },
      { label: '50% de N₀' },
      { label: '75% de N₀' },
      { label: '87,5% de N₀' },
    ],
    correctIndex: 2,
    explanationLatex: 'N(2t_{1/2}) = \\frac{N_0}{4} \\implies N_D = N_0 - \\frac{N_0}{4} = \\frac{3}{4}N_0 = 75\\%',
    explanationText:
      'Il reste 1/4 des noyaux initiaux (25%), donc 3/4 (75%) ont déjà subi une désintégration.',
  },
  {
    id: 'q-act-1',
    chapterId: 'activity-dating',
    topic: 'demi-vie',
    prompt: 'Quelle formule permet de calculer l’âge t d’un échantillon par datation radioactive ?',
    options: [
      { label: 'Formule 1', latex: 't = \\frac{\\ln(a(t)/a_0)}{\\ln(2)} \\cdot t_{1/2}' },
      { label: 'Formule 2', latex: 't = \\frac{\\ln(a_0/a(t))}{\\ln(2)} \\cdot t_{1/2}' },
      { label: 'Formule 3', latex: 't = \\frac{\\ln(2)}{\\ln(a_0/a(t))} \\cdot t_{1/2}' },
    ],
    correctIndex: 1,
    explanationLatex: 'a(t) = a_0 e^{-\\lambda t} \\implies t = \\frac{\\ln(a_0/a(t))}{\\lambda} = \\frac{\\ln(a_0/a(t))}{\\ln(2)}\\cdot t_{1/2}',
    explanationText:
      'Comme a₀ > a(t), le logarithme ln(a₀/a(t)) est positif et donne directement l’âge t > 0.',
  },
  {
    id: 'q-segre-1',
    chapterId: 'segre-diagram',
    topic: 'soddy',
    prompt: 'Sur le diagramme de Segré (N en fonction de Z), où se trouvent les différents isotopes d’un même élément ?',
    options: [
      { label: 'Sur la bissectrice N = Z' },
      { label: 'Sur une même droite horizontale (N = const)' },
      { label: 'Sur une même droite verticale (Z = const)' },
    ],
    correctIndex: 2,
    explanationLatex: '\\text{Isotopes} \\iff \\text{même } Z \\implies \\text{droite verticale } Z = \\text{const}',
    explanationText:
      'Tous les isotopes d’un élément ont le même Z et s’alignent donc parallèlement à l’axe des ordonnées N.',
  },
  {
    id: 'q-usual-1',
    chapterId: 'usual-curves',
    topic: 'courbes',
    prompt: 'Sur le graphe de ln N(t) en fonction du temps t, que vaut le coefficient directeur de la droite ?',
    promptLatex: '\\ln N(t) = -\\lambda t + \\ln N_0',
    options: [
      { label: '+λ' },
      { label: '−λ' },
      { label: 'ln(2) · λ' },
      { label: '1 / λ' },
    ],
    correctIndex: 1,
    explanationLatex: '\\text{Pente} = \\frac{\\ln N_2 - \\ln N_1}{t_2 - t_1} = -\\lambda \\quad \\text{et} \\quad t_{\\text{intercept}} = \\frac{\\ln N_0}{\\lambda}',
    explanationText:
      'La droite ln N(t) = −λt + ln N₀ est décroissante de pente −λ et coupe l’axe du temps à t = ln(N₀)/λ.',
  },
  {
    id: 'q-mass-1',
    chapterId: 'mass-defect',
    topic: 'energie',
    prompt: "Comment compare-t-on la masse d'un noyau lié m(ᴬ_Z X) à la somme des masses de ses nucléons séparés ?",
    options: [
      { label: 'm(X) > Z·m_p + N·m_n' },
      { label: 'm(X) < Z·m_p + N·m_n (défaut Δm > 0)' },
      { label: 'm(X) = Z·m_p + N·m_n exactement' },
    ],
    correctIndex: 1,
    explanationLatex: '\\Delta m = [Z m_p + N m_n] - m(X) > 0 \\implies E_\\ell = \\Delta m \\cdot c^2',
    explanationText:
      'Un noyau lié possède une masse inférieure à celle de ses nucléons isolés : la différence Δm correspond à l’énergie de liaison E_l = Δm·c².',
  },
];
