import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

export interface FullQuestionData {
  id: string;
  order: number;
  text: string;
  category: "General Knowledge" | "Space" | "Basic Technical Concepts" | "Science and Technology" | "Logical Thinking";
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  durationSeconds: number;
  hintText: string;
  imageUrl?: string;
  visualClueUrl: string;
  explanation: string;
  clueTitle: string;
  clueKeyConcept: string;
  clueDiagramType: string;
}

export const QUESTIONS_DATA: FullQuestionData[] = [
  // --- PART A: MAIN ROUND (Q1 TO Q30) ---
  // Level 1: Warm-Up
  {
    id: "q-01",
    order: 1,
    text: "Which planet would appear to have the longest day if a day is measured by one complete rotation on its axis?",
    category: "Space",
    optionA: "Earth",
    optionB: "Mars",
    optionC: "Venus",
    optionD: "Jupiter",
    correctOption: "C",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "This inner terrestrial planet has an extremely slow retrograde spin: one rotation on its axis takes approximately 243 Earth days—longer than its own year!",
    imageUrl: "/images/questions/q01.jpg",
    visualClueUrl: "/images/questions/q01.jpg",
    explanation: "Venus rotates very slowly in a retrograde (clockwise) direction, taking roughly 243 Earth days to complete a single sidereal rotation on its axis. In comparison, Earth takes 24h, Mars 24.6h, and Jupiter just ~9.9h.",
    clueTitle: "Planetary Axial Rotation Periods",
    clueKeyConcept: "Venus = 243 Earth Days (Retrograde Spin) > Year (225 Days)",
    clueDiagramType: "rotation",
  },
  {
    id: "q-02",
    order: 2,
    text: "A sealed packet of chips is filled with nitrogen. What is the main reason for doing this?",
    category: "Science and Technology",
    optionA: "Nitrogen makes the chips heavier",
    optionB: "Nitrogen helps reduce oxidation of oils in the chips",
    optionC: "Nitrogen prevents all moisture from entering permanently",
    optionD: "Nitrogen chemically strengthens the packet",
    correctOption: "B",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "Fried food oils react readily with atmospheric oxygen in a degradation process known as lipid oxidation (rancidity). Nitrogen is an unreactive inert gas that displaces oxygen.",
    imageUrl: "/images/questions/q02.jpg",
    visualClueUrl: "/images/questions/q02.jpg",
    explanation: "Nitrogen gas is chemically unreactive and acts as a protective blanket by displacing oxygen gas. Without oxygen, the vegetable oils in the chips cannot oxidize, preventing rancidity and preserving flavor and crispness.",
    clueTitle: "Inert Gas Packaging (MAP)",
    clueKeyConcept: "N2 Flushing Displaces O2 → Prevents Lipid Oxidation & Rancidity",
    clueDiagramType: "nitrogen_pack",
  },
  {
    id: "q-03",
    order: 3,
    text: "Which pair contains two metals that are both liquid at ordinary room temperature?",
    category: "Science and Technology",
    optionA: "Mercury and gallium",
    optionB: "Mercury and sodium",
    optionC: "Gallium and aluminium",
    optionD: "Caesium and iron",
    correctOption: "A",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "One is standard liquid metal Hg (-38.8°C melting point). The other is element Ga, which melts at just 29.8°C—liquefying when held in your hand near room temperature.",
    imageUrl: "/images/questions/q03.jpg",
    visualClueUrl: "/images/questions/q03.jpg",
    explanation: "Mercury (Hg) is famously liquid at standard room temperature (melting point -38.83°C). Gallium (Ga) has a remarkably low melting point of 29.76°C, easily liquefying near warm room temperature or body temperature.",
    clueTitle: "Low-Melting Metallic Elements",
    clueKeyConcept: "Hg (mp -38.8°C) & Ga (mp 29.8°C) Near Room Temperature (25°C)",
    clueDiagramType: "liquid_metals",
  },
  {
    id: "q-04",
    order: 4,
    text: "Two identical metal spoons are kept in the same room, one made of copper and the other of stainless steel. Which usually feels colder to the touch?",
    category: "Basic Technical Concepts",
    optionA: "Stainless steel, because it is denser",
    optionB: "Copper, because it conducts heat away from the hand faster",
    optionC: "Both, because their temperatures are equal",
    optionD: "Copper, because its temperature is always lower",
    correctOption: "B",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "Human skin senses the rate of thermal energy transfer (Fourier's law of conduction), not temperature itself. Copper's thermal conductivity (~400 W/m·K) is ~25× higher than stainless steel (~15 W/m·K).",
    imageUrl: "/images/questions/q04.jpg",
    visualClueUrl: "/images/questions/q04.jpg",
    explanation: "Both spoons sit at identical ambient room temperature (~22°C), below body temperature (~37°C). Because copper has a much higher thermal conductivity (k ≈ 400 W/m·K vs k ≈ 15 W/m·K for stainless steel), it draws heat away from skin much faster, triggering cold thermoreceptors.",
    clueTitle: "Thermal Conduction & Sensory Perception",
    clueKeyConcept: "k(Copper) ≈ 400 W/m·K vs k(Steel) ≈ 15 W/m·K → Faster Heat Drain",
    clueDiagramType: "thermal_conduction",
  },
  {
    id: "q-05",
    order: 5,
    text: "Which statement about the Moon is correct?",
    category: "Space",
    optionA: "The Moon produces its own visible light",
    optionB: "The Moon's far side never receives sunlight",
    optionC: "The Moon's phases depend on how much of its sunlit side we can see from Earth",
    optionD: "A lunar eclipse occurs every full moon",
    correctOption: "C",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "Exactly 50% of the Moon's spherical surface is illuminated by sunlight at all times. As the Moon orbits Earth, our geometric vantage point changes the visible portion of that sunlit hemisphere.",
    imageUrl: "/images/questions/q05.jpg",
    visualClueUrl: "/images/questions/q05.jpg",
    explanation: "At all times, half of the Moon is illuminated by solar rays. Lunar phases are an optical geometry effect: as the Moon orbits Earth, observers on Earth see differing portions of that illuminated half (from New Moon to Full Moon).",
    clueTitle: "Lunar Orbit & Geometric Phases",
    clueKeyConcept: "Illuminated Hemisphere (50%) Seen from Shifting Earth Perspective",
    clueDiagramType: "moon_phases",
  },

  // Level 2: Building Confusion
  {
    id: "q-06",
    order: 6,
    text: "A metal object is heated, but no chemical reaction occurs. Which property must increase?",
    category: "Basic Technical Concepts",
    optionA: "Its mass",
    optionB: "The average kinetic energy of its particles",
    optionC: "The number of atoms in it",
    optionD: "The number of protons in each atom",
    correctOption: "B",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "Thermodynamic temperature is the macroscopic physical measurement of microscopic particle motion: KE_avg = (3/2) k_B T.",
    imageUrl: "/images/questions/q06.jpg",
    visualClueUrl: "/images/questions/q06.jpg",
    explanation: "By thermodynamic definition, absolute temperature is directly proportional to the average kinetic energy of the constituent atoms/molecules. Heating increases particle thermal vibrations without altering atomic numbers, mass, or chemical identities.",
    clueTitle: "Thermodynamic Kinetic Theory",
    clueKeyConcept: "T ∝ (1/2) m <v²> → Thermal Energy Directly Increases Atomic Motion",
    clueDiagramType: "kinetic_energy",
  },
  {
    id: "q-07",
    order: 7,
    text: "Why is stainless steel generally more corrosion-resistant than ordinary carbon steel?",
    category: "Science and Technology",
    optionA: "It contains no iron",
    optionB: "Chromium forms a thin protective oxide layer",
    optionC: "Nickel prevents every possible chemical reaction",
    optionD: "Stainless steel cannot react with oxygen",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Stainless steel contains a minimum of 10.5% of this alloying element, which spontaneously reacts with oxygen to form a microscopic, self-healing passive oxide film.",
    imageUrl: "/images/questions/q07.jpg",
    visualClueUrl: "/images/questions/q07.jpg",
    explanation: "Stainless steel contains at least 10.5% Chromium (Cr). In atmospheric oxygen, chromium rapidly oxidizes to form an invisible, self-healing, passivating film of chromium oxide (Cr2O3) just nanometers thick, shielding the iron from rusting.",
    clueTitle: "Passivation in Stainless Steel",
    clueKeyConcept: "Cr + O2 → Self-Healing Cr2O3 Passive Barrier (~2-3 nm thick)",
    clueDiagramType: "passivation",
  },
  {
    id: "q-08",
    order: 8,
    text: "A student says, “The transformer increases voltage, so it must also increase energy.” Which is the best correction?",
    category: "Basic Technical Concepts",
    optionA: "A transformer always increases both voltage and current",
    optionB: "A transformer creates electrical energy from nothing",
    optionC: "Voltage can increase while current decreases; output power cannot exceed input power in an ideal transformer",
    optionD: "Voltage and current must always remain unchanged",
    correctOption: "C",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Recall the foundational Conservation of Energy law: Power = Voltage × Current. In an ideal transformer, P_in = P_out (V_p · I_p = V_s · I_s).",
    imageUrl: "/images/questions/q08.jpg",
    visualClueUrl: "/images/questions/q08.jpg",
    explanation: "Energy conservation dictates that a passive device cannot output more power than it inputs. In a step-up transformer, as secondary voltage increases, secondary current decreases proportionally (P = V·I is conserved, minus small efficiency losses).",
    clueTitle: "Transformer Power Conservation",
    clueKeyConcept: "P_in = P_out → V_p × I_p = V_s × I_s (Voltage Rises, Current Falls)",
    clueDiagramType: "transformer",
  },
  {
    id: "q-09",
    order: 9,
    text: "Which statement about a satellite orbiting Earth is most accurate?",
    category: "Space",
    optionA: "Gravity is absent once the satellite enters orbit",
    optionB: "The satellite is continuously falling, but its sideways velocity makes it keep missing Earth",
    optionC: "The satellite is held up by Earth's atmosphere",
    optionD: "The satellite stops moving at the highest point of its orbit",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Recall Newton's classic orbital cannonball thought experiment: orbital velocity v ≈ 7.8 km/s ensures Earth's surface curves away at the same rate the object falls under gravity.",
    imageUrl: "/images/questions/q09.jpg",
    visualClueUrl: "/images/questions/q09.jpg",
    explanation: "Earth's gravitational field still exerts ~90% of surface gravity at Low Earth Orbit. An orbiting satellite is in continuous free-fall, but its high tangential velocity causes the spherical surface of Earth to curve away beneath it at the exact same rate it falls.",
    clueTitle: "Newtonian Orbital Trajectory",
    clueKeyConcept: "Perpetual Free-Fall: Curvature of Trajectory Matches Earth's Horizon",
    clueDiagramType: "orbit_fall",
  },
  {
    id: "q-10",
    order: 10,
    text: "A solution changes from pH 6 to pH 4. How does its hydrogen-ion concentration change?",
    category: "Science and Technology",
    optionA: "It becomes twice as large",
    optionB: "It becomes 10 times as large",
    optionC: "It becomes 100 times as large",
    optionD: "It becomes 1,000 times as large",
    correctOption: "C",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "pH is a negative base-10 logarithmic scale: pH = -log10[H+]. Every step of 1 pH unit represents a 10× change in concentration.",
    imageUrl: "/images/questions/q10.jpg",
    visualClueUrl: "/images/questions/q10.jpg",
    explanation: "Because pH = -log10[H+], [H+] = 10^(-pH). At pH 6, [H+] = 10^-6 M; at pH 4, [H+] = 10^-4 M. The ratio is 10^-4 / 10^-6 = 10^2 = 100 times higher hydrogen-ion concentration.",
    clueTitle: "Logarithmic pH Concentration Scale",
    clueKeyConcept: "ΔpH = -2 → [H+] Increases by 10^2 = 100×",
    clueDiagramType: "ph_scale",
  },

  // Level 3: Medium to Tricky
  {
    id: "q-11",
    order: 11,
    text: "Venus is hotter than Mercury on average, even though Mercury is closer to the Sun. What is the main reason?",
    category: "Space",
    optionA: "Venus generates more energy through nuclear reactions",
    optionB: "Venus has a dense atmosphere that produces a strong greenhouse effect",
    optionC: "Mercury receives less sunlight than Venus",
    optionD: "Venus rotates faster than Mercury",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Venus has a thick atmosphere with 92× Earth's surface pressure, composed of 96.5% CO2, trapping incoming infrared thermal radiation.",
    imageUrl: "/images/questions/q11.jpg",
    visualClueUrl: "/images/questions/q11.jpg",
    explanation: "Venus is enveloped by a massive, super-dense atmosphere composed of 96.5% carbon dioxide and sulfuric acid cloud decks. This creates a runaway greenhouse effect, trapping solar heat and raising surface temperatures to an oven-like ~465°C, hotter than Mercury.",
    clueTitle: "Runaway Atmospheric Greenhouse Effect",
    clueKeyConcept: "96.5% CO2 Atmosphere (92 bar) Traps Solar Infrared Heat (~465°C)",
    clueDiagramType: "venus_greenhouse",
  },
  {
    id: "q-12",
    order: 12,
    text: "Two objects are dropped from the same height in a vacuum. One is much heavier than the other. What happens?",
    category: "Basic Technical Concepts",
    optionA: "The heavier object falls faster because its weight is greater",
    optionB: "The lighter object falls faster because it has less inertia",
    optionC: "Both fall with the same acceleration",
    optionD: "The heavier object reaches terminal velocity first",
    correctOption: "C",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Apply Newton's second law F = m·a and gravitational force F = G·M·m / r². The mass 'm' of the falling body cancels out identically on both sides of the equation.",
    imageUrl: "/images/questions/q12.jpg",
    visualClueUrl: "/images/questions/q12.jpg",
    explanation: "In a vacuum where air resistance is zero, gravitational acceleration is given by a = F_grav / m = (G·M_earth) / r² = g. Because gravitational mass equals inertial mass, all bodies accelerate downward at the exact same rate (~9.8 m/s²), as famously demonstrated by Galileo and Apollo 15.",
    clueTitle: "Galilean Equivalence in Vacuum",
    clueKeyConcept: "a = F/m = (m·g)/m = g (~9.8 m/s²) → Mass Cancels Out",
    clueDiagramType: "vacuum_fall",
  },
  {
    id: "q-13",
    order: 13,
    text: "Which statement about a catalyst is correct?",
    category: "Science and Technology",
    optionA: "It increases reaction speed by increasing the energy of every molecule",
    optionB: "It lowers activation energy and is regenerated in the overall reaction",
    optionC: "It permanently shifts every chemical equilibrium towards products",
    optionD: "It increases the amount of reactants without being consumed",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Catalysts provide an alternative reaction pathway with a lower potential energy barrier (E_a) without being permanently consumed or altering ΔG.",
    imageUrl: "/images/questions/q13.jpg",
    visualClueUrl: "/images/questions/q13.jpg",
    explanation: "A catalyst accelerates chemical kinetics by providing an alternate reaction pathway with a lower activation energy (E_a). It is regenerated during the catalytic cycle and does not alter equilibrium position (K_eq) or reaction free energy (ΔG).",
    clueTitle: "Catalytic Reaction Coordinate Profile",
    clueKeyConcept: "Lowers Activation Barrier (E_a) & Regenerates Intact",
    clueDiagramType: "catalyst_energy",
  },
  {
    id: "q-14",
    order: 14,
    text: "Why does a diamond generally sparkle more than an ordinary glass piece of similar shape?",
    category: "Science and Technology",
    optionA: "Diamond creates additional light from heat",
    optionB: "Diamond has a higher refractive index, allowing stronger refraction and total internal reflection under suitable conditions",
    optionC: "Glass cannot refract visible light",
    optionD: "Diamond reflects every ray from every angle",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Diamond has a remarkably high refractive index (n ≈ 2.42), which makes its critical angle for Total Internal Reflection (TIR) exceptionally small (θ_c ≈ 24.4°).",
    imageUrl: "/images/questions/q14.jpg",
    visualClueUrl: "/images/questions/q14.jpg",
    explanation: "Diamond has a high refractive index (n ≈ 2.42 vs ~1.5 for glass), producing a tiny critical angle (sin θ_c = 1/n ≈ 24.4°). Light entering the diamond undergoes multiple total internal reflections before exiting through the top facets, producing brilliant scintillation and dispersion.",
    clueTitle: "Total Internal Reflection & Refractive Index",
    clueKeyConcept: "n = 2.42 → Small Critical Angle (θ_c = 24.4°) Traps & Bounces Light",
    clueDiagramType: "diamond_tir",
  },
  {
    id: "q-15",
    order: 15,
    text: "A bird sits on a high-voltage wire. Why is it normally not electrocuted?",
    category: "Basic Technical Concepts",
    optionA: "Its body has infinite resistance",
    optionB: "Its feet are at nearly the same electric potential, so the voltage across its body is small",
    optionC: "The current in every overhead wire is zero",
    optionD: "Birds are naturally insulated against every voltage",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Ohm's law states that current requires an electric potential difference (ΔV = V1 - V2). Both feet touch the same low-resistance wire just inches apart.",
    imageUrl: "/images/questions/q15.jpg",
    visualClueUrl: "/images/questions/q15.jpg",
    explanation: "Electrocution requires current to flow through the body (I = ΔV/R). Because both of the bird's feet grip the same conductor a few centimeters apart, the potential difference between its feet (ΔV) is practically zero, so negligible current diverts into its body.",
    clueTitle: "Equipotential Line & Ohm's Law",
    clueKeyConcept: "V_foot1 ≈ V_foot2 → ΔV ≈ 0 Volts → Current I = ΔV/R ≈ 0 Amps",
    clueDiagramType: "bird_wire",
  },
  {
    id: "q-16",
    order: 16,
    text: "Which observation most directly supports the idea that the universe is expanding?",
    category: "Space",
    optionA: "All stars have the same colour",
    optionB: "Most distant galaxies show cosmological redshift",
    optionC: "The planets orbit the Sun",
    optionD: "The Moon is moving away from Earth",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Discovered by Edwin Hubble in 1929: spectral absorption lines of distant galaxies are shifted toward longer, red wavelengths proportionally to their distance.",
    imageUrl: "/images/questions/q16.jpg",
    visualClueUrl: "/images/questions/q16.jpg",
    explanation: "Cosmological redshift occurs because the metric of space itself is expanding as photons travel toward Earth. This stretches light to longer wavelengths, shifting absorption lines toward the red end of the electromagnetic spectrum, confirming universal cosmic expansion.",
    clueTitle: "Cosmological Redshift & Hubble's Law",
    clueKeyConcept: "Spectral Lines Shifted Red (z > 0) due to Metric Space Expansion",
    clueDiagramType: "redshift",
  },

  // Level 4: Tough Round
  {
    id: "q-17",
    order: 17,
    text: "Two satellites orbit Earth in circular orbits. Satellite P is closer to Earth than satellite Q. Which statement is correct?",
    category: "Space",
    optionA: "P moves more slowly and has a longer orbital period",
    optionB: "P moves faster and has a shorter orbital period",
    optionC: "P moves faster and has a longer orbital period",
    optionD: "Both have the same orbital speed because gravity acts on both",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "Combine centripetal acceleration with Newton's gravity: v = √(GM/r) and Kepler's third law T² ∝ r³. Closer radius 'r' means higher orbital velocity and faster circuit.",
    imageUrl: "/images/questions/q17.jpg",
    visualClueUrl: "/images/questions/q17.jpg",
    explanation: "Orbital speed is inversely related to radius: v = √(GM/r). Because satellite P has a smaller orbital radius (r_P < r_Q), it must travel at a higher speed (v_P > v_Q) to remain in equilibrium. Its shorter orbital perimeter combined with higher speed results in a much shorter period (T_P < T_Q).",
    clueTitle: "Keplerian Orbital Mechanics",
    clueKeyConcept: "v = √(GM/r) & T² ∝ r³ → Smaller Orbit = Faster Velocity & Shorter Period",
    clueDiagramType: "satellite_orbit",
  },
  {
    id: "q-18",
    order: 18,
    text: "Aluminium hydroxide can react with both acids and bases. What does this behaviour demonstrate?",
    category: "Science and Technology",
    optionA: "Neutrality",
    optionB: "Amphoterism",
    optionC: "Oxidation",
    optionD: "Sublimation",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "Derived from the Greek word 'amphoteroi' (meaning 'both'): compounds like Al(OH)3 and ZnO that act as a base in acidic media and an acid in basic media.",
    imageUrl: "/images/questions/q18.jpg",
    visualClueUrl: "/images/questions/q18.jpg",
    explanation: "Amphoterism is the property of a substance enabling it to act as either an acid or a base. Al(OH)3 reacts with hydrochloric acid (HCl) as a base to produce AlCl3 + H2O, and reacts with sodium hydroxide (NaOH) as an acid to form tetrahydroxidoaluminate [Al(OH)4]-.",
    clueTitle: "Amphoteric Chemical Dual-Nature",
    clueKeyConcept: "Al(OH)3 + 3H+ → Al³⁺ + 3H2O  |  Al(OH)3 + OH- → [Al(OH)4]-",
    clueDiagramType: "amphoteric",
  },
  {
    id: "q-19",
    order: 19,
    text: "Why can fertiliser runoff cause fish deaths in a lake even when the fertiliser itself is not directly poisonous to the fish?",
    category: "Science and Technology",
    optionA: "Fertilisers instantly remove all dissolved minerals",
    optionB: "Excess nutrients can trigger algal blooms, followed by oxygen depletion during decomposition",
    optionC: "Algae permanently convert all water into carbon dioxide",
    optionD: "Fertilisers prevent sunlight from reaching the atmosphere",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "This environmental ecological cascade is called eutrophication: nutrient influx stimulates rapid surface algal growth, which aerobic bacteria consume upon death, exhausting dissolved O2.",
    imageUrl: "/images/questions/q19.jpg",
    visualClueUrl: "/images/questions/q19.jpg",
    explanation: "Fertilizer nutrients (phosphorus and nitrogen) cause massive algal blooms. When these algae die and sink, aerobic decomposers (bacteria) consume vast quantities of dissolved oxygen (DO) to break them down, leading to hypoxia/anoxia and widespread fish suffocation.",
    clueTitle: "Eutrophication & Hypoxia Cycle",
    clueKeyConcept: "Nutrient Runoff → Algae Bloom → Bacterial Decay Depletes Dissolved O2",
    clueDiagramType: "eutrophication",
  },
  {
    id: "q-20",
    order: 20,
    text: "Which statement about a microcontroller and a microprocessor is generally correct?",
    category: "Basic Technical Concepts",
    optionA: "Every microprocessor contains all peripherals on the same chip",
    optionB: "A microcontroller commonly integrates processor, memory and peripherals, while a microprocessor-based system may rely more on external components",
    optionC: "A microcontroller cannot execute programs",
    optionD: "A microprocessor cannot perform calculations",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "Think of an Arduino ATmega chip (MCU) containing CPU, RAM, ROM, and ADC inside one package vs an Intel Core or AMD Ryzen chip (MPU) requiring external RAM, SSD, and motherboard bridges.",
    imageUrl: "/images/questions/q20.jpg",
    visualClueUrl: "/images/questions/q20.jpg",
    explanation: "A microcontroller (MCU) is a complete System-on-Chip integrating the CPU core, RAM, Flash memory, timers, and I/O peripherals onto a single silicon die. A microprocessor (MPU) primarily houses the compute/ALU core, depending on external memory and peripheral controllers.",
    clueTitle: "Microcontroller vs Microprocessor Architecture",
    clueKeyConcept: "MCU = All-in-One (CPU+RAM+ROM+I/O) vs MPU = Core requiring External Buses",
    clueDiagramType: "mcu_mpu",
  },
  {
    id: "q-21",
    order: 21,
    text: "Why does the sky appear blue in clear daytime conditions?",
    category: "Science and Technology",
    optionA: "Blue light has the longest wavelength in visible light",
    optionB: "Air molecules scatter shorter visible wavelengths more strongly than longer ones",
    optionC: "The ozone layer reflects only blue light",
    optionD: "The oceans reflect blue light directly onto the sky",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "Lord Rayleigh established that electromagnetic scattering by particles much smaller than light's wavelength is inversely proportional to the 4th power of wavelength: I ∝ 1/λ⁴.",
    imageUrl: "/images/questions/q21.jpg",
    visualClueUrl: "/images/questions/q21.jpg",
    explanation: "Rayleigh scattering intensity scales inversely with the fourth power of wavelength (I ∝ 1/λ⁴). Short visible wavelengths (blue light ~450 nm) scatter nearly 10 times more effectively off atmospheric N2/O2 molecules than long wavelengths (red light ~700 nm), bathing the sky in scattered blue light.",
    clueTitle: "Rayleigh Scattering Law",
    clueKeyConcept: "Scattering Intensity I ∝ 1/λ⁴ → Blue (450 nm) Scatters 10× More than Red",
    clueDiagramType: "rayleigh_sky",
  },
  {
    id: "q-22",
    order: 22,
    text: "Which statement correctly distinguishes nuclear fusion from nuclear fission?",
    category: "Science and Technology",
    optionA: "Fusion splits heavy nuclei; fission joins light nuclei",
    optionB: "Fusion joins light nuclei; fission splits heavy nuclei",
    optionC: "Both involve only rearranging electrons in chemical bonds",
    optionD: "Neither can release energy",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "Think of stars (fusing hydrogen isotopes into helium) vs traditional nuclear power plants (fission splitting Uranium-235).",
    imageUrl: "/images/questions/q22.jpg",
    visualClueUrl: "/images/questions/q22.jpg",
    explanation: "Nuclear fusion combines light atomic nuclei (e.g., Deuterium and Tritium) to create a heavier nucleus (Helium), powering stars. Nuclear fission splits a heavy atomic nucleus (e.g., Uranium-235) into smaller fission fragments, used in conventional nuclear reactors.",
    clueTitle: "Nuclear Binding Energy Curve",
    clueKeyConcept: "Fusion (Light Nuclei Combine) vs Fission (Heavy Nuclei Split)",
    clueDiagramType: "fusion_fission",
  },
  {
    id: "q-23",
    order: 23,
    text: "A transformer operates on alternating current but does not normally work as a conventional transformer on steady direct current. Why?",
    category: "Basic Technical Concepts",
    optionA: "Direct current contains no electric charge",
    optionB: "Steady direct current does not produce the continuously changing magnetic flux needed for normal transformer action",
    optionC: "Direct current travels more slowly than alternating current",
    optionD: "Transformer windings conduct only electrons moving in both directions",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "Faraday's Law of Electromagnetic Induction dictates EMF: ε = -N · (dΦ_B / dt). If flux Φ_B is static/constant, its time derivative dΦ/dt is strictly zero.",
    imageUrl: "/images/questions/q23.jpg",
    visualClueUrl: "/images/questions/q23.jpg",
    explanation: "Transformers operate via mutual induction described by Faraday's Law: an electromotive force (EMF) is induced across the secondary coil only when magnetic flux changes with time (dΦ/dt). Steady DC produces a static magnetic field, yielding zero induced secondary voltage.",
    clueTitle: "Faraday's Law & Time-Varying Magnetic Flux",
    clueKeyConcept: "ε = -N(dΦ/dt) → Steady DC means dΦ/dt = 0 → Induced Voltage = 0",
    clueDiagramType: "dc_transformer",
  },

  // Level 5: Final Challenge
  {
    id: "q-24",
    order: 24,
    text: "A material has a very high refractive index. Which conclusion is justified?",
    category: "Basic Technical Concepts",
    optionA: "It must always appear brighter than every other material",
    optionB: "Light travels more slowly through it than through a material with a lower refractive index, under comparable conditions",
    optionC: "It must absorb all visible light",
    optionD: "It cannot allow total internal reflection",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "The definition of the refractive index of a transparent medium is the ratio of light velocity in vacuum to its phase velocity in the medium: n = c / v.",
    imageUrl: "/images/questions/q24.jpg",
    visualClueUrl: "/images/questions/q24.jpg",
    explanation: "By fundamental optical definition, the refractive index n = c / v, where c is the speed of light in vacuum and v is its phase speed in the medium. Higher n strictly means light propagates at a lower velocity v = c / n through that substance.",
    clueTitle: "Refractive Index & Phase Velocity",
    clueKeyConcept: "n = c / v → Higher n Directly Decreases Speed of Light in Medium",
    clueDiagramType: "refraction_speed",
  },
  {
    id: "q-25",
    order: 25,
    text: "Why does the ozone layer absorb much of the Sun's harmful ultraviolet radiation but allow most visible light to pass through?",
    category: "Science and Technology",
    optionA: "Ozone absorbs all electromagnetic radiation equally",
    optionB: "Ozone's molecular energy transitions strongly absorb certain ultraviolet wavelengths",
    optionC: "Visible light contains no energy",
    optionD: "Ultraviolet radiation cannot travel through gases",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "Photons are absorbed when their quantum energy E = h·ν matches discrete molecular electronic bond transitions (Hartley band: 200–310 nm), which break O3 into O2 + O.",
    imageUrl: "/images/questions/q25.jpg",
    visualClueUrl: "/images/questions/q25.jpg",
    explanation: "Absorption of light depends on quantum molecular resonance. Ozone molecules (O3) possess electronic transitions matching the photon energies of UV-B and UV-C (Hartley band ~200–310 nm), breaking covalent bonds. Visible photons lack the resonant energy to induce this transition and pass through.",
    clueTitle: "Ozone Photodissociation & UV Absorption",
    clueKeyConcept: "O3 + hν(UV) → O2 + O  (Resonant Electronic Transition 200-310 nm)",
    clueDiagramType: "ozone_absorption",
  },
  {
    id: "q-26",
    order: 26,
    text: "A black-hole image shows a dark central region surrounded by bright emission. Which explanation is most accurate?",
    category: "Space",
    optionA: "The dark region is a solid surface photographed directly",
    optionB: "The dark region is the black-hole shadow, shaped by light capture and strong gravitational bending",
    optionC: "The dark region proves that gravity becomes zero there",
    optionD: "The bright ring is the event horizon itself emitting visible light",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "As revealed by the Event Horizon Telescope (M87* and Sgr A*), the central dark silhouette is an apparent optical shadow (~2.6 r_s in radius) bounded by gravitational photon capture.",
    imageUrl: "/images/questions/q26.jpg",
    visualClueUrl: "/images/questions/q26.jpg",
    explanation: "The dark central silhouette is the 'black hole shadow', formed by photons that cross the photon sphere and plunge into the event horizon. The surrounding bright ring is light emitted by the hot accretion disk, warped and gravitationally lensed by extreme spacetime curvature.",
    clueTitle: "Black Hole Shadow & Gravitational Lensing",
    clueKeyConcept: "Light Inside Photon Capture Sphere (r ≈ 2.6 r_s) Plunges into Horizon",
    clueDiagramType: "black_hole",
  },
  {
    id: "q-27",
    order: 27,
    text: "A metal spoon and a wooden spoon have been kept in a room overnight. Their temperatures are the same. Why might the metal spoon feel colder?",
    category: "Basic Technical Concepts",
    optionA: "Metal must be below room temperature",
    optionB: "Metal generally transfers heat away from skin faster than wood",
    optionC: "Wood always produces heat when touched",
    optionD: "Metal has a lower specific heat in every possible case",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "Thermal effusivity: human skin at ~37°C loses thermal energy much faster to materials with high thermal conductivity (metals) than to thermal insulators (wood).",
    imageUrl: "/images/questions/q27.jpg",
    visualClueUrl: "/images/questions/q27.jpg",
    explanation: "At ~22°C room temperature, both objects are cooler than skin temperature (~37°C). Because metal is an efficient thermal conductor, heat transfers rapidly from fingers into the metal, causing skin temperature to drop sharply and triggering cold sensation receptors.",
    clueTitle: "Fourier Heat Flux & Skin Contact",
    clueKeyConcept: "q = -k·(dT/dx) → High k(Metal) Draws Heat Out of Skin Far More Rapidly",
    clueDiagramType: "metal_wood_heat",
  },
  {
    id: "q-28",
    order: 28,
    text: "Why can adding salt to ice make the mixture reach a temperature below 0°C?",
    category: "Science and Technology",
    optionA: "Salt raises the freezing point, making ice colder",
    optionB: "Salt lowers the freezing point, allowing melting to occur while heat is absorbed from the surroundings",
    optionC: "Salt releases cold as a chemical substance",
    optionD: "Salt prevents water molecules from moving",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "Colligative property: salt depresses the freezing point of water. Melting ice is an endothermic phase transition requiring latent heat of fusion (334 J/g).",
    imageUrl: "/images/questions/q28.jpg",
    visualClueUrl: "/images/questions/q28.jpg",
    explanation: "Salt causes freezing-point depression, inducing ice to melt at temperatures below 0°C. Melting is an endothermic phase change that absorbs latent heat of fusion (334 J/g) directly from the solution, plunging the equilibrium temperature down to as low as -21°C.",
    clueTitle: "Freezing Point Depression & Latent Heat",
    clueKeyConcept: "ΔT_f = i·K_f·m + Endothermic Melting Absorbs Latent Heat (down to -21°C)",
    clueDiagramType: "salt_ice",
  },
  {
    id: "q-29",
    order: 29,
    text: "The Sun produces energy by fusing hydrogen into helium. Why can this process release energy?",
    category: "Space",
    optionA: "The final helium nucleus has a greater mass than all its starting particles combined",
    optionB: "Some mass is converted into energy because the products have lower total mass-energy than the initial particles",
    optionC: "Hydrogen atoms burn in oxygen inside the Sun",
    optionD: "The Sun's magnetic field creates matter from nothing",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "Einstein's mass-energy equivalence equation: E = Δm · c². Four individual protons have slightly more rest mass (0.7% more) than one synthesized Helium-4 nucleus.",
    imageUrl: "/images/questions/q29.jpg",
    visualClueUrl: "/images/questions/q29.jpg",
    explanation: "In solar p-p chain fusion, four protons fuse into one Helium-4 nucleus. The resulting 4He nucleus is approximately 0.71% less massive than the four original protons. This mass difference (mass defect Δm) is converted directly into radiant energy according to E = Δm·c² (~26.7 MeV per reaction).",
    clueTitle: "Nuclear Mass Defect & E = Δmc²",
    clueKeyConcept: "4 Protons (4.0313 u) → 1 He Nucleus (4.0015 u) + 26.7 MeV Energy",
    clueDiagramType: "solar_fusion",
  },
  {
    id: "q-30",
    order: 30,
    text: "A distant galaxy's spectral lines appear shifted towards longer wavelengths. Which conclusion is the most reasonable in the usual cosmological context?",
    category: "Space",
    optionA: "The galaxy must be getting hotter",
    optionB: "The light is redshifted, consistent with the expansion of the universe",
    optionC: "The galaxy contains no hydrogen",
    optionD: "The galaxy has stopped emitting radiation",
    correctOption: "B",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "Longer wavelength shift = redshift (z = Δλ/λ0 > 0). In cosmic astrophysics, this is caused by the metric expansion of spacetime stretching photons during transit.",
    imageUrl: "/images/questions/q30.jpg",
    visualClueUrl: "/images/questions/q30.jpg",
    explanation: "When light from distant galaxies travels through an expanding universe, the expansion of spacetime itself stretches the traveling photon wavelengths toward the longer (red) end of the spectrum. This cosmological redshift confirms that space is expanding uniformly.",
    clueTitle: "Cosmic Spectral Redshift",
    clueKeyConcept: "z = (λ_obs - λ_rest) / λ_rest > 0 → Space Expansion Stretches Wavelengths",
    clueDiagramType: "galaxy_redshift",
  },

  // --- PART B: 20 BUFFER QUESTIONS (Q31 TO Q50) ---
  {
    id: "q-31",
    order: 31,
    text: "Which metal is commonly used to galvanise iron?",
    category: "Science and Technology",
    optionA: "Copper",
    optionB: "Zinc",
    optionC: "Tin",
    optionD: "Lead",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "This metal (symbol Zn, atomic number 30) acts as a sacrificial anode because its oxidation potential is more negative than iron, preventing rust.",
    imageUrl: "/images/questions/q31.jpg",
    visualClueUrl: "/images/questions/q31.jpg",
    explanation: "Galvanization is the metallurgical process of applying a protective Zinc coating to iron or steel. Zinc corrodes preferentially (sacrificial cathodic protection), shielding the underlying iron from moisture and oxygen.",
    clueTitle: "Sacrificial Galvanic Coating",
    clueKeyConcept: "Zinc (Zn, E° = -0.76 V) Sacrificially Corrodes to Protect Iron (Fe)",
    clueDiagramType: "galvanization",
  },
  {
    id: "q-32",
    order: 32,
    text: "Why does water boil at a higher temperature inside a pressure cooker?",
    category: "Science and Technology",
    optionA: "Higher pressure raises the boiling point",
    optionB: "Higher pressure lowers the boiling point",
    optionC: "Pressure increases the chemical energy of water molecules",
    optionD: "The cooker converts water into a different substance",
    correctOption: "A",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Boiling occurs when saturated vapor pressure equals ambient pressure. Increasing external pressure traps water molecules, requiring higher thermal energy to vaporize.",
    imageUrl: "/images/questions/q32.jpg",
    visualClueUrl: "/images/questions/q32.jpg",
    explanation: "A liquid boils when its internal vapor pressure equals the surrounding atmospheric pressure. Inside a sealed pressure cooker, steam pressure rises to ~2 atmospheres, raising the boiling point of water from 100°C to ~121°C, cooking food much faster.",
    clueTitle: "Clausius-Clapeyron Vapor-Pressure Equilibrium",
    clueKeyConcept: "P_ambient Rises (~2 atm) → T_boiling Rises from 100°C to ~121°C",
    clueDiagramType: "pressure_cooker",
  },
  {
    id: "q-33",
    order: 33,
    text: "Which gas is dissolved under pressure in most carbonated soft drinks?",
    category: "Science and Technology",
    optionA: "Oxygen",
    optionB: "Nitrogen",
    optionC: "Carbon dioxide",
    optionD: "Hydrogen",
    correctOption: "C",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Henry's Law (C = k·P): this acidic oxide gas reacts with water to form effervescent carbonic acid (H2CO3) that fizzes when the bottle cap is opened.",
    imageUrl: "/images/questions/q33.jpg",
    visualClueUrl: "/images/questions/q33.jpg",
    explanation: "Carbon dioxide (CO2) is injected into soft drinks at high pressure (30–60 psi). It dissolves and reacts with water to form carbonic acid (CO2 + H2O ⇌ H2CO3), providing bubbly fizz, acidic bite, and antimicrobial preservation.",
    clueTitle: "Carbonation & Henry's Law Solubility",
    clueKeyConcept: "CO2 + H2O ⇌ H2CO3 (Carbonic Acid Fizz under High Pressure)",
    clueDiagramType: "carbonation",
  },
  {
    id: "q-34",
    order: 34,
    text: "Which part of the eye controls the size of the pupil?",
    category: "Science and Technology",
    optionA: "Retina",
    optionB: "Iris",
    optionC: "Cornea",
    optionD: "Optic nerve",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "The colored, annular muscular diaphragm that contracts (sphincter pupillae) in bright light and dilates (dilator pupillae) in dim light.",
    imageUrl: "/images/questions/q34.jpg",
    visualClueUrl: "/images/questions/q34.jpg",
    explanation: "The iris is the colored muscular ring surrounding the pupil. It regulates the amount of light entering the eye by adjusting the pupil diameter through antagonistic smooth muscle action: sphincter pupillae (constriction) and dilator pupillae (dilation).",
    clueTitle: "Ocular Pupil Light Reflex",
    clueKeyConcept: "Iris Smooth Muscles Modulate Pupil Aperture Diameter",
    clueDiagramType: "eye_iris",
  },
  {
    id: "q-35",
    order: 35,
    text: "Which planet has an axial tilt so extreme that it rotates almost on its side?",
    category: "Space",
    optionA: "Saturn",
    optionB: "Uranus",
    optionC: "Neptptune",
    optionD: "Mars",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "The seventh planet from the Sun has an axial obliquity of 97.77°, causing its rotation axis to point almost directly into its orbital plane.",
    imageUrl: "/images/questions/q35.jpg",
    visualClueUrl: "/images/questions/q35.jpg",
    explanation: "Uranus has an extraordinary axial tilt of 97.77 degrees, causing it to rotate virtually on its side relative to the plane of the Solar System. This leads to extreme 42-year periods of continuous daylight followed by 42 years of night at its poles.",
    clueTitle: "Planetary Obliquity Comparison",
    clueKeyConcept: "Uranus Axial Tilt = 97.8° (Rotates Sideways along Orbital Plane)",
    clueDiagramType: "uranus_tilt",
  },
  {
    id: "q-36",
    order: 36,
    text: "Which material is most suitable for the core of a conventional electromagnet?",
    category: "Basic Technical Concepts",
    optionA: "Soft iron",
    optionB: "Copper",
    optionC: "Aluminium",
    optionD: "Glass",
    correctOption: "A",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "An ideal core requires very high magnetic permeability (μ) to concentrate field lines, but low coercivity/retentivity so it loses magnetism instantly when current stops.",
    imageUrl: "/images/questions/q36.jpg",
    visualClueUrl: "/images/questions/q36.jpg",
    explanation: "Soft iron has high magnetic permeability (strongly amplifying magnetic flux) and very low retentivity/coercivity. When electric current is cut off, soft iron instantly loses its magnetism, making it ideal for temporary electromagnets and relays.",
    clueTitle: "Electromagnet Magnetic Permeability",
    clueKeyConcept: "Soft Iron: High Permeability (μ_r >> 1) + Low Coercivity (Instantly Demagnetizes)",
    clueDiagramType: "electromagnet_core",
  },
  {
    id: "q-37",
    order: 37,
    text: "Which gas is the largest component of Earth's atmosphere by volume?",
    category: "Science and Technology",
    optionA: "Oxygen",
    optionB: "Carbon dioxide",
    optionC: "Nitrogen",
    optionD: "Argon",
    correctOption: "C",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "This diatomic gas comprises approximately 78.08% of dry atmospheric air, compared to ~20.95% for oxygen.",
    imageUrl: "/images/questions/q37.jpg",
    visualClueUrl: "/images/questions/q37.jpg",
    explanation: "Nitrogen (N2) makes up roughly 78.08% of dry atmospheric volume on Earth. Oxygen follows at ~20.95%, Argon at ~0.93%, and Carbon Dioxide at ~0.04%.",
    clueTitle: "Atmospheric Volumetric Composition",
    clueKeyConcept: "Nitrogen (N2) = 78.08%  |  Oxygen (O2) = 20.95%  |  Argon = 0.93%",
    clueDiagramType: "atmosphere_gas",
  },
  {
    id: "q-38",
    order: 38,
    text: "Why does a solar eclipse not occur at every new moon?",
    category: "Space",
    optionA: "The Moon produces its own light at most new moons",
    optionB: "The Moon's orbit is tilted relative to Earth's orbital plane, so the bodies usually do not align precisely",
    optionC: "The Sun changes its position randomly",
    optionD: "Earth's shadow blocks sunlight during every new moon",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "The Moon's orbital plane is inclined by about 5.14 degrees relative to the ecliptic (Earth's orbital plane around the Sun).",
    imageUrl: "/images/questions/q38.jpg",
    visualClueUrl: "/images/questions/q38.jpg",
    explanation: "The Moon's orbit around Earth is tilted at an angle of roughly 5.14° relative to the ecliptic plane. Consequently, the Moon's shadow usually passes slightly above or below Earth during New Moon, unless it occurs at an orbital intersection node.",
    clueTitle: "5.14° Orbital Inclination & Eclipses",
    clueKeyConcept: "Lunar Orbit Tilted 5.14° → Shadow Misses Earth except at Orbital Nodes",
    clueDiagramType: "solar_eclipse",
  },
  {
    id: "q-39",
    order: 39,
    text: "Which device converts electrical energy mainly into mechanical energy?",
    category: "Basic Technical Concepts",
    optionA: "Generator",
    optionB: "Electric motor",
    optionC: "Transformer",
    optionD: "Rectifier",
    correctOption: "B",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "Lorentz force on current-carrying conductor in a magnetic field (F = I·L × B) produces mechanical rotational torque.",
    imageUrl: "/images/questions/q39.jpg",
    visualClueUrl: "/images/questions/q39.jpg",
    explanation: "An electric motor takes in electrical energy (voltage and current) and utilizes electromagnetic interaction (Lorentz force) to generate rotational kinetic mechanical energy on an output shaft.",
    clueTitle: "Electromechanical Energy Conversion",
    clueKeyConcept: "Electrical Input (V × I) → Lorentz Force (F = I·L×B) → Mechanical Output",
    clueDiagramType: "motor_energy",
  },
  {
    id: "q-40",
    order: 40,
    text: "Which material is a semiconductor widely used in electronic circuits?",
    category: "Basic Technical Concepts",
    optionA: "Copper",
    optionB: "Silicon",
    optionC: "Rubber",
    optionD: "Silver",
    correctOption: "B",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "Group 14 tetravalent metalloid element (atomic number 14) with a bandgap of ~1.12 eV, forming the backbone of microprocessors and solar cells.",
    imageUrl: "/images/questions/q40.jpg",
    visualClueUrl: "/images/questions/q40.jpg",
    explanation: "Silicon (Si, atomic number 14) is the quintessential semiconductor in modern electronics. Its 1.12 eV bandgap allows precise electrical conductivity modulation via doping (N-type and P-type) for transistors, diodes, and ICs.",
    clueTitle: "Semiconductor Bandgap & Silicon Lattice",
    clueKeyConcept: "Silicon (Si, Z=14): Bandgap Eg ≈ 1.12 eV with Tetravalent Doping",
    clueDiagramType: "silicon_chip",
  },
  {
    id: "q-41",
    order: 41,
    text: "Which statement about renewable energy is correct?",
    category: "Science and Technology",
    optionA: "Coal is renewable because it forms naturally",
    optionB: "Wind energy is replenished by natural atmospheric processes",
    optionC: "Petroleum is renewable within a few days",
    optionD: "Natural gas is produced only by solar panels",
    correctOption: "B",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "Differential solar heating of the planet drives ongoing atmospheric pressure gradients and planetary convection loops that never exhaust on human timescales.",
    imageUrl: "/images/questions/q41.jpg",
    visualClueUrl: "/images/questions/q41.jpg",
    explanation: "Wind energy is inexhaustible because it is continually driven by solar radiant heating of Earth's surface, creating atmospheric temperature and pressure gradients that replenish kinetic air currents naturally.",
    clueTitle: "Renewable Wind Convection Loop",
    clueKeyConcept: "Solar Radiance → Atmospheric Pressure Differentials → Perpetual Wind Energy",
    clueDiagramType: "wind_energy",
  },
  {
    id: "q-42",
    order: 42,
    text: "Why does ice float on liquid water?",
    category: "Science and Technology",
    optionA: "Ice is denser than liquid water",
    optionB: "Ice is generally less dense than liquid water",
    optionC: "Ice contains no molecules",
    optionD: "Water becomes a metal when frozen",
    correctOption: "B",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "Water expands upon freezing! Hydrogen bonding locks H2O molecules into a rigid, open hexagonal crystal lattice that is ~9% less dense than the liquid state.",
    imageUrl: "/images/questions/q42.jpg",
    visualClueUrl: "/images/questions/q42.jpg",
    explanation: "Liquid water has an anomalous density peak at 3.98°C. As water freezes into ice, hydrogen bonds stabilize into a rigid hexagonal open lattice that occupies more volume, resulting in a lower density (0.917 g/cm³ vs 1.000 g/cm³) that floats on liquid water.",
    clueTitle: "Ice Hexagonal Lattice & Density Anomaly",
    clueKeyConcept: "Hexagonal Hydrogen-Bonded Open Crystalline Matrix → ρ(Ice) < ρ(Water)",
    clueDiagramType: "ice_density",
  },
  {
    id: "q-43",
    order: 43,
    text: "What is the primary function of a rectifier in a basic power supply?",
    category: "Basic Technical Concepts",
    optionA: "Converting DC into AC",
    optionB: "Converting AC into DC",
    optionC: "Increasing the frequency of light",
    optionD: "Storing magnetic energy permanently",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Household mains supply is bidirectional alternating current (AC). Devices like phones and computers require unidirectional direct current (DC).",
    imageUrl: "/images/questions/q43.jpg",
    visualClueUrl: "/images/questions/q43.jpg",
    explanation: "A rectifier is an electrical circuit (commonly a full-wave diode bridge) that converts bidirectional alternating current (AC) into unidirectional pulsating direct current (DC) for powering electronic circuits.",
    clueTitle: "AC to DC Rectification Circuit",
    clueKeyConcept: "Bidirectional Sine Wave AC (±V) → Diode Bridge → Unidirectional DC (+V)",
    clueDiagramType: "rectifier_wave",
  },
  {
    id: "q-44",
    order: 44,
    text: "Which phenomenon explains the separation of white light into colours by a prism?",
    category: "Science and Technology",
    optionA: "Diffraction only",
    optionB: "Dispersion due to different refraction for different wavelengths",
    optionC: "Nuclear fission",
    optionD: "Magnetic induction",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Snell's Law: refractive index n(λ) varies with wavelength. Higher frequency violet light bends at a sharper angle than red light.",
    imageUrl: "/images/questions/q44.jpg",
    visualClueUrl: "/images/questions/q44.jpg",
    explanation: "Optical dispersion occurs because a glass prism's refractive index n(λ) varies with light wavelength. Short-wavelength violet light experiences a higher refractive index and refracts more sharply than longer-wavelength red light, fanning out into a rainbow spectrum.",
    clueTitle: "Chromatic Dispersion in Optical Prism",
    clueKeyConcept: "n(λ) Depends on Wavelength → Violet Bends More than Red",
    clueDiagramType: "prism_dispersion",
  },
  {
    id: "q-45",
    order: 45,
    text: "Which statement about antibiotics is correct?",
    category: "Science and Technology",
    optionA: "They treat every viral and bacterial infection equally",
    optionB: "They target bacteria or bacterial processes, not viruses themselves",
    optionC: "They work by increasing body temperature",
    optionD: "They are effective against all microorganisms without exception",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Antibiotics target peptidoglycan cell walls or 70S bacterial ribosomes. Viruses have protein capsids and hijack host cellular machinery, rendering antibiotics useless against colds or influenza.",
    imageUrl: "/images/questions/q45.jpg",
    visualClueUrl: "/images/questions/q45.jpg",
    explanation: "Antibiotics selectively target bacterial biochemistry, such as peptidoglycan cell wall synthesis (penicillins) or 70S ribosomes (macrolides/tetracyclines). Viruses lack cellular walls, metabolic enzymes, and ribosomes, making them completely immune to antibiotics.",
    clueTitle: "Selective Toxicity: Bacteria vs Viruses",
    clueKeyConcept: "Targets Peptidoglycan Cell Walls & 70S Ribosomes (Inactive on Viruses)",
    clueDiagramType: "antibiotics",
  },
  {
    id: "q-46",
    order: 46,
    text: "Which particle determines the atomic number of an element?",
    category: "Science and Technology",
    optionA: "Neutron",
    optionB: "Electron",
    optionC: "Proton",
    optionD: "Photon",
    correctOption: "C",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "Represented by the symbol Z in nuclear notation: the number of positively charged subatomic particles in the nucleus.",
    imageUrl: "/images/questions/q46.jpg",
    visualClueUrl: "/images/questions/q46.jpg",
    explanation: "The atomic number (Z) of an atom is defined strictly by the number of positively charged protons located in its nucleus. It determines the element's position on the Periodic Table and its fundamental chemical identity.",
    clueTitle: "Nuclear Structure & Atomic Number Z",
    clueKeyConcept: "Atomic Number Z = Total Number of Protons in the Nucleus",
    clueDiagramType: "atomic_number",
  },
  {
    id: "q-47",
    order: 47,
    text: "Which instrument measures potential difference between two points in a circuit?",
    category: "Basic Technical Concepts",
    optionA: "Ammeter",
    optionB: "Voltmeter",
    optionC: "Barometer",
    optionD: "Hydrometer",
    correctOption: "B",
    difficulty: "EASY",
    durationSeconds: 240,
    hintText: "Connected in parallel across two nodes, featuring an extremely high internal resistance (ideally infinite) to prevent drawing current.",
    imageUrl: "/images/questions/q47.jpg",
    visualClueUrl: "/images/questions/q47.jpg",
    explanation: "A voltmeter is an electrical instrument specifically designed to measure electrical potential difference (voltage, in volts) between two circuit points. It is connected in parallel with components and has very high internal impedance.",
    clueTitle: "Circuit Measurement: Voltmeter in Parallel",
    clueKeyConcept: "Voltmeter: High Internal Resistance R_v → Connected in Parallel (V_A - V_B)",
    clueDiagramType: "voltmeter",
  },
  {
    id: "q-48",
    order: 48,
    text: "What is the main reason Earth's seasons occur?",
    category: "Space",
    optionA: "Earth is much closer to the Sun in summer everywhere",
    optionB: "Earth's axial tilt changes the angle and duration of sunlight received by each hemisphere",
    optionC: "The Sun changes its temperature every six months",
    optionD: "The Moon blocks sunlight differently in each season",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Earth's rotational axis is tilted at 23.44° relative to its orbital plane (obliquity), causing seasonal solar irradiance variations in each hemisphere.",
    imageUrl: "/images/questions/q48.jpg",
    visualClueUrl: "/images/questions/q48.jpg",
    explanation: "Earth's 23.44° axial tilt causes different hemispheres to lean toward the Sun during opposite halves of the year. This alters solar incidence angle (more direct insolation per unit area) and day length, producing the seasonal cycle.",
    clueTitle: "Earth's 23.44° Axial Obliquity & Seasons",
    clueKeyConcept: "23.44° Tilt Alters Solar Angle of Incidence & Daylight Hours",
    clueDiagramType: "earth_seasons",
  },
  {
    id: "q-49",
    order: 49,
    text: "Which statement about a diode under forward bias is generally correct?",
    category: "Basic Technical Concepts",
    optionA: "Its depletion region widens",
    optionB: "Its depletion region narrows and current can flow more easily",
    optionC: "It becomes permanently damaged",
    optionD: "It blocks current under all conditions",
    correctOption: "B",
    difficulty: "MEDIUM",
    durationSeconds: 240,
    hintText: "Connecting the positive external potential to the P-type anode pushes majority carriers toward the PN junction, overcoming the ~0.7V barrier potential.",
    imageUrl: "/images/questions/q49.jpg",
    visualClueUrl: "/images/questions/q49.jpg",
    explanation: "In forward bias (positive potential on P-side anode, negative on N-side cathode), the applied electric field opposes the built-in junction potential. This narrows the depletion region, lowering the potential barrier (~0.7V for Silicon) and allowing substantial current diffusion.",
    clueTitle: "PN Junction Diode Forward Bias",
    clueKeyConcept: "Forward Bias (V > 0.7V): Depletion Zone Narrows → Majority Carrier Current Conducts",
    clueDiagramType: "diode_bias",
  },
  {
    id: "q-50",
    order: 50,
    text: "Which observation is most directly associated with the cosmic microwave background?",
    category: "Space",
    optionA: "Radiation left over from the early universe is observed today mainly in the microwave region",
    optionB: "Microwave radiation is produced only by mobile phones",
    optionC: "It is the reflected light of the Moon",
    optionD: "It is radiation emitted by Earth's oceans",
    correctOption: "A",
    difficulty: "HARD",
    durationSeconds: 240,
    hintText: "Discovered by Arno Penzias and Robert Wilson in 1965: nearly uniform 2.725 K thermal blackbody radiation from the recombination epoch ~380,000 years after the Big Bang.",
    imageUrl: "/images/questions/q50.jpg",
    visualClueUrl: "/images/questions/q50.jpg",
    explanation: "The Cosmic Microwave Background (CMB) is relic thermal blackbody radiation emitted ~380,000 years post-Big Bang during the Recombination Epoch. Cosmic metric expansion over 13.8 billion years has cooled and redshifted this light down to 2.725 Kelvin, peaking in the microwave spectrum.",
    clueTitle: "Cosmic Microwave Background (CMB)",
    clueKeyConcept: "Relic Big Bang Radiation Redshifted to 2.725 K Microwave Blackbody Glow",
    clueDiagramType: "cmb_spectrum",
  },
];

// Helper to generate SVG visual clue
function generateSvgClue(q: FullQuestionData): string {
  const primaryColor = "#2563EB";
  const accentColor = "#06B6D4";
  const bgGradientStart = "#0B1528";
  const bgGradientEnd = "#1E293B";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="100%" height="100%">
  <defs>
    <linearGradient id="bg-${q.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradientStart}"/>
      <stop offset="100%" stop-color="${bgGradientEnd}"/>
    </linearGradient>
    <linearGradient id="badge-${q.id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${accentColor}"/>
    </linearGradient>
    <filter id="shadow-${q.id}" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Background Card -->
  <rect width="600" height="360" rx="16" fill="url(#bg-${q.id})" stroke="#334155" stroke-width="2"/>

  <!-- Top Header Bar -->
  <g transform="translate(24, 28)">
    <rect width="130" height="26" rx="6" fill="url(#badge-${q.id})"/>
    <text x="65" y="17" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" letter-spacing="1.5" text-anchor="middle">VISION BOOST</text>
    
    <text x="145" y="18" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">QUESTION #${q.order} • ${q.category.toUpperCase()}</text>
  </g>

  <!-- Title -->
  <text x="24" y="86" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="800">${escapeXml(q.clueTitle)}</text>

  <!-- Central Diagram Canvas Box -->
  <rect x="24" y="104" width="552" height="175" rx="12" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" filter="url(#shadow-${q.id})"/>

  <!-- Technical Schematic Elements based on clueDiagramType -->
  <g transform="translate(40, 120)">
    <!-- Grid guidelines -->
    <line x1="0" y1="35" x2="520" y2="35" stroke="#1E293B" stroke-dasharray="4,4"/>
    <line x1="0" y1="75" x2="520" y2="75" stroke="#1E293B" stroke-dasharray="4,4"/>
    <line x1="0" y1="115" x2="520" y2="115" stroke="#1E293B" stroke-dasharray="4,4"/>

    <!-- Key Indicator Badges -->
    <circle cx="28" cy="70" r="18" fill="#1E3A8A" stroke="#3B82F6" stroke-width="2"/>
    <text x="28" y="75" fill="#60A5FA" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle">⚡</text>

    <!-- Formula / Key Concept Banner -->
    <rect x="62" y="25" width="445" height="92" rx="8" fill="#1E293B" fill-opacity="0.6" stroke="#3B82F6" stroke-width="1"/>
    
    <text x="78" y="55" fill="#38BDF8" font-family="monospace" font-size="12" font-weight="bold">KEY CONCEPT DIAGRAM:</text>
    <text x="78" y="82" fill="#F1F5F9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">${escapeXml(q.clueKeyConcept)}</text>
    <text x="78" y="102" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11">Deduce the mechanism to evaluate the 4 combat options.</text>
  </g>

  <!-- Bottom Hint Footer -->
  <rect x="24" y="295" width="552" height="42" rx="8" fill="#1E293B" fill-opacity="0.8"/>
  <circle cx="44" cy="316" r="10" fill="#3B82F6"/>
  <text x="44" y="320" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">💡</text>
  <text x="64" y="320" fill="#E2E8F0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600">CLUE: Look for the relationship governing ${escapeXml(q.category)} principles.</text>
</svg>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function main() {
  console.log("🐂 Starting 50 Questions Seeding Process...");

  // 1. Ensure public/clues directory
  const cluesDir = path.join(process.cwd(), "public", "clues");
  if (!fs.existsSync(cluesDir)) {
    fs.mkdirSync(cluesDir, { recursive: true });
  }

  // 2. Generate all 50 SVGs
  console.log("🎨 Generating 50 SVG Visual Clues in public/clues/...");
  for (const q of QUESTIONS_DATA) {
    const filename = `q${q.order.toString().padStart(2, "0")}.svg`;
    const filePath = path.join(cluesDir, filename);
    const svgContent = generateSvgClue(q);
    fs.writeFileSync(filePath, svgContent, "utf-8");
  }
  console.log("✅ 50 SVG Visual Clues successfully generated!");

  // 3. Write src/data/demoQuestions.ts
  const demoQuestionsPath = path.join(process.cwd(), "src", "data", "demoQuestions.ts");
  const demoQuestionsContent = `// THE BIG BULL - 50 Official Championship Competition Questions
export interface DemoQuestionDef {
  id: string;
  order?: number;
  text: string;
  category: "General Knowledge" | "Space" | "Basic Technical Concepts" | "Science and Technology" | "Logical Thinking";
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  imageUrl?: string;
  visualClueUrl?: string;
  hintText: string;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  durationSeconds: number;
}

export const DEMO_QUESTIONS: DemoQuestionDef[] = ${JSON.stringify(
    QUESTIONS_DATA.map((q) => ({
      id: q.id,
      order: q.order,
      text: q.text,
      category: q.category,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      imageUrl: q.imageUrl || q.visualClueUrl,
          visualClueUrl: q.visualClueUrl,
      hintText: q.hintText,
      explanation: q.explanation,
      difficulty: q.difficulty,
      durationSeconds: q.durationSeconds,
    })),
    null,
    2
  )};
`;
  fs.writeFileSync(demoQuestionsPath, demoQuestionsContent, "utf-8");
  console.log("✅ src/data/demoQuestions.ts updated with all 50 questions!");

  // 4. Update Prisma Database (Neon PostgreSQL)
  console.log("💾 Syncing with Prisma Database (Neon PostgreSQL)...");
  const prisma = new PrismaClient();

  try {
    for (const q of QUESTIONS_DATA) {
      await prisma.question.upsert({
        where: { id: q.id },
        update: {
          text: q.text,
          category: q.category,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          imageUrl: q.imageUrl || q.visualClueUrl,
          visualClueUrl: q.visualClueUrl,
          hintText: q.hintText,
          explanation: q.explanation,
          difficulty: q.difficulty,
          durationSeconds: q.durationSeconds,
          isActive: true,
        },
        create: {
          id: q.id,
          text: q.text,
          category: q.category,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          imageUrl: q.imageUrl || q.visualClueUrl,
          visualClueUrl: q.visualClueUrl,
          hintText: q.hintText,
          explanation: q.explanation,
          difficulty: q.difficulty,
          durationSeconds: q.durationSeconds,
          isActive: true,
        },
      });
    }
    console.log(`✅ Successfully upserted all ${QUESTIONS_DATA.length} questions into Prisma DB!`);

    // Reset game questions link
    const game = await prisma.game.findFirst();
    if (game) {
      await prisma.game.update({ where: { id: game.id }, data: { defaultQuestionDuration: 240 } });
      await prisma.gameQuestion.deleteMany({ where: { gameId: game.id } });
      for (let i = 0; i < QUESTIONS_DATA.length; i++) {
        await prisma.gameQuestion.create({
          data: {
            gameId: game.id,
            questionId: QUESTIONS_DATA[i].id,
            orderIndex: i,
            durationSeconds: 240,
            status: "PENDING",
          },
        });
      }
      console.log(`✅ Linked all ${QUESTIONS_DATA.length} questions to active game ${game.id}!`);
    }
  } catch (err: any) {
    console.error("⚠️ Prisma sync error:", err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log("🎉 Seeding complete! All 50 questions & lifelines are ready.");
}

main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
