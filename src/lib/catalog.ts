import type { CaseKitOption, CpuOption, GpuOption, MemoryType, MoboOption, PeripheralKit, PsuOption, RamOption, Socket, SsdOption } from "./types";

/* ============================================================================
 * CATÁLOGO DE PEÇAS — preços de referência (R$, mercado brasileiro)
 * Valores aproximados de lojas como KaBuM!, Pichau e Terabyte. Atualize aqui
 * antes da apresentação ou substitua por uma API de preços no futuro.
 * ==========================================================================*/

export const BUDGET_MIN = 2000;
export const BUDGET_MAX = 20000;

export const CPUS: CpuOption[] = [
  {
    id: "r5-5600g",
    name: "AMD Ryzen 5 5600G (6C/12T, Radeon Vega 7)",
    search: "Ryzen 5 5600G",
    brand: "amd",
    socket: "AM4",
    power: 65,
    gaming: 40,
    multi: 38,
    boxCooler: true,
    igpu: { name: "Radeon Vega 7", gaming: 8, render: 5 },
    price: 629,
    note: "APU com vídeo integrado e cooler box incluso: o caminho mais barato para um PC completo.",
  },
  {
    id: "r5-5600",
    name: "AMD Ryzen 5 5600 (6C/12T)",
    search: "Ryzen 5 5600",
    brand: "amd",
    socket: "AM4",
    power: 65,
    gaming: 50,
    multi: 42,
    boxCooler: true,
    igpu: null,
    price: 599,
    note: "Melhor custo-benefício para jogos em placas AM4 baratas, com cooler incluso.",
  },
  {
    id: "r7-5700x3d",
    name: "AMD Ryzen 7 5700X3D (8C/16T, 3D V-Cache)",
    search: "Ryzen 7 5700X3D",
    brand: "amd",
    socket: "AM4",
    power: 105,
    gaming: 68,
    multi: 56,
    boxCooler: false,
    igpu: null,
    price: 1299,
    note: "O 3D V-Cache entrega FPS de CPU topo de linha mantendo a plataforma AM4 (DDR4) barata.",
  },
  {
    id: "r5-8600g",
    name: "AMD Ryzen 5 8600G (6C/12T, Radeon 760M)",
    search: "Ryzen 5 8600G",
    brand: "amd",
    socket: "AM5",
    power: 65,
    gaming: 56,
    multi: 50,
    boxCooler: true,
    igpu: { name: "Radeon 760M", gaming: 16, render: 9 },
    price: 1149,
    note: "APU AM5 com um dos vídeos integrados mais fortes do mercado — roda e-sports sem placa dedicada.",
  },
  {
    id: "r5-7600",
    name: "AMD Ryzen 5 7600 (6C/12T)",
    search: "Ryzen 5 7600",
    brand: "amd",
    socket: "AM5",
    power: 65,
    gaming: 66,
    multi: 52,
    boxCooler: true,
    igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 },
    price: 1049,
    note: "Porta de entrada da plataforma AM5 com DDR5 e ótimo desempenho por real em jogos.",
  },
  {
    id: "r5-9600x",
    name: "AMD Ryzen 5 9600X (6C/12T, Zen 5)",
    search: "Ryzen 5 9600X",
    brand: "amd",
    socket: "AM5",
    power: 88,
    gaming: 72,
    multi: 58,
    boxCooler: false,
    igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 },
    price: 1399,
    note: "Arquitetura Zen 5 com IPC alto: excelente em jogos com consumo baixo.",
  },
  {
    id: "r7-9700x",
    name: "AMD Ryzen 7 9700X (8C/16T, Zen 5)",
    search: "Ryzen 7 9700X",
    brand: "amd",
    socket: "AM5",
    power: 88,
    gaming: 76,
    multi: 70,
    boxCooler: false,
    igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 },
    price: 1899,
    note: "8 núcleos Zen 5 eficientes: equilibra jogos, compilação e criação de conteúdo.",
  },
  {
    id: "r7-9800x3d",
    name: "AMD Ryzen 7 9800X3D (8C/16T, 3D V-Cache)",
    search: "Ryzen 7 9800X3D",
    brand: "amd",
    socket: "AM5",
    power: 120,
    gaming: 100,
    multi: 76,
    boxCooler: false,
    igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 },
    price: 3199,
    note: "Referência atual em desempenho para jogos graças ao 3D V-Cache de 2ª geração.",
  },
  {
    id: "r9-9900x",
    name: "AMD Ryzen 9 9900X (12C/24T)",
    search: "Ryzen 9 9900X",
    brand: "amd",
    socket: "AM5",
    power: 120,
    gaming: 80,
    multi: 87,
    boxCooler: false,
    igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 },
    price: 2599,
    note: "12 núcleos para render, compilação e virtualização sem abrir mão de desempenho em jogos.",
  },
  {
    id: "r9-9950x",
    name: "AMD Ryzen 9 9950X (16C/32T)",
    search: "Ryzen 9 9950X",
    brand: "amd",
    socket: "AM5",
    power: 170,
    gaming: 84,
    multi: 100,
    boxCooler: false,
    igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 },
    price: 3799,
    note: "16 núcleos Zen 5: topo de linha para render em CPU, VMs e compilação pesada.",
  },
  {
    id: "i3-12100",
    name: "Intel Core i3-12100 (4C/8T, UHD 730)",
    search: "Core i3-12100",
    brand: "intel",
    socket: "LGA1700",
    power: 89,
    gaming: 42,
    multi: 28,
    boxCooler: true,
    igpu: { name: "Intel UHD 730", gaming: 4, render: 3 },
    price: 579,
    note: "Quad-core moderno com vídeo integrado, ideal para estudos e escritório.",
  },
  {
    id: "i5-12400f",
    name: "Intel Core i5-12400F (6C/12T)",
    search: "Core i5-12400F",
    brand: "intel",
    socket: "LGA1700",
    power: 90,
    gaming: 52,
    multi: 45,
    boxCooler: true,
    igpu: null,
    price: 679,
    note: "Seis núcleos de alto desempenho a preço baixo; exige placa de vídeo dedicada (sufixo F).",
  },
  {
    id: "i5-14400f",
    name: "Intel Core i5-14400F (10C/16T)",
    search: "Core i5-14400F",
    brand: "intel",
    socket: "LGA1700",
    power: 148,
    gaming: 62,
    multi: 62,
    boxCooler: true,
    igpu: null,
    price: 1099,
    note: "Núcleos P + E dão fôlego para jogar e fazer stream ao mesmo tempo.",
  },
  {
    id: "i5-14600kf",
    name: "Intel Core i5-14600KF (14C/20T)",
    search: "Core i5-14600KF",
    brand: "intel",
    socket: "LGA1700",
    power: 181,
    gaming: 72,
    multi: 76,
    boxCooler: false,
    igpu: null,
    price: 1549,
    note: "14 núcleos com clocks altos: forte em jogos e em produtividade multitarefa.",
  },
  {
    id: "u5-245k",
    name: "Intel Core Ultra 5 245K (14C/14T)",
    search: "Core Ultra 5 245K",
    brand: "intel",
    socket: "LGA1851",
    power: 159,
    gaming: 70,
    multi: 76,
    boxCooler: false,
    igpu: { name: "Intel Graphics (Xe)", gaming: 11, render: 8 },
    price: 1749,
    note: "Plataforma Intel mais recente (LGA1851), eficiente e com NPU para recursos de IA.",
  },
  {
    id: "u7-265k",
    name: "Intel Core Ultra 7 265K (20C/20T)",
    search: "Core Ultra 7 265K",
    brand: "intel",
    socket: "LGA1851",
    power: 250,
    gaming: 76,
    multi: 91,
    boxCooler: false,
    igpu: { name: "Intel Graphics (Xe)", gaming: 12, render: 9 },
    price: 2299,
    note: "20 núcleos com ótimo custo por núcleo — excelente para render, compilação e Revit.",
  },
  {
    id: "u9-285k",
    name: "Intel Core Ultra 9 285K (24C/24T)",
    search: "Core Ultra 9 285K",
    brand: "intel",
    socket: "LGA1851",
    power: 250,
    gaming: 80,
    multi: 99,
    boxCooler: false,
    igpu: { name: "Intel Graphics (Xe)", gaming: 12, render: 9 },
    price: 3599,
    note: "Topo da Intel para estações de trabalho: 24 núcleos e suporte a DDR5 de alta frequência.",
  },
];

export const MOBOS: MoboOption[] = [
  { id: "a520m", name: "ASUS Prime A520M-K", search: "ASUS Prime A520M-K", socket: "AM4", memory: "DDR4", formFactor: "mATX", wifi: false, maxCpuPower: 105, score: 30, price: 379, note: "Chipset A520 de entrada: cumpre o básico com estabilidade para CPUs de 65W." },
  { id: "b550m", name: "Gigabyte B550M Aorus Elite", search: "Gigabyte B550M Aorus Elite", socket: "AM4", memory: "DDR4", formFactor: "mATX", wifi: false, maxCpuPower: 170, score: 55, price: 749, note: "B550 com VRM reforçado e PCIe 4.0 para SSD e placa de vídeo." },
  { id: "a620m", name: "ASRock A620M-HDV/M.2+", search: "ASRock A620M-HDV/M.2+", socket: "AM5", memory: "DDR5", formFactor: "mATX", wifi: false, maxCpuPower: 120, score: 40, price: 649, note: "Entrada mais barata da plataforma AM5, com slot M.2 e DDR5." },
  { id: "b650m", name: "MSI B650M Gaming Plus WiFi", search: "MSI B650M Gaming Plus WiFi", socket: "AM5", memory: "DDR5", formFactor: "mATX", wifi: true, maxCpuPower: 230, score: 65, price: 1099, note: "B650 com Wi-Fi 6E, bom VRM e dois slots M.2 — escolha equilibrada em AM5." },
  { id: "b850", name: "ASUS TUF Gaming B850-Plus WiFi", search: "ASUS TUF Gaming B850-Plus WiFi", socket: "AM5", memory: "DDR5", formFactor: "ATX", wifi: true, maxCpuPower: 250, score: 80, price: 1699, note: "B850 com PCIe 5.0 no M.2, Wi-Fi 7 e VRM robusto para CPUs de 12–16 núcleos." },
  { id: "x870", name: "MSI MAG X870 Tomahawk WiFi", search: "MSI MAG X870 Tomahawk WiFi", socket: "AM5", memory: "DDR5", formFactor: "ATX", wifi: true, maxCpuPower: 300, score: 92, price: 2399, note: "X870 com USB4, PCIe 5.0 na GPU e no SSD e VRM topo para Ryzen 9." },
  { id: "h610m", name: "ASUS Prime H610M-E D4", search: "ASUS Prime H610M-E D4", socket: "LGA1700", memory: "DDR4", formFactor: "mATX", wifi: false, maxCpuPower: 125, score: 28, price: 429, note: "Entrada LGA1700 com DDR4 — barata e suficiente para i3/i5 sem overclock." },
  { id: "b760m-d4", name: "Gigabyte B760M Gaming X DDR4", search: "Gigabyte B760M Gaming X DDR4", socket: "LGA1700", memory: "DDR4", formFactor: "mATX", wifi: false, maxCpuPower: 200, score: 50, price: 849, note: "B760 DDR4 com bom VRM: aproveita memórias DDR4, mais baratas." },
  { id: "b760m-d5", name: "MSI MAG B760M Mortar WiFi", search: "MSI MAG B760M Mortar WiFi", socket: "LGA1700", memory: "DDR5", formFactor: "mATX", wifi: true, maxCpuPower: 253, score: 70, price: 1349, note: "B760 DDR5 com Wi-Fi e VRM sólido para i5/i7 de 14ª geração." },
  { id: "z790", name: "ASUS TUF Gaming Z790-Plus WiFi", search: "ASUS TUF Gaming Z790-Plus WiFi", socket: "LGA1700", memory: "DDR5", formFactor: "ATX", wifi: true, maxCpuPower: 300, score: 85, price: 2099, note: "Z790 libera overclock nos processadores K e tem VRM para i7/i9." },
  { id: "b860m", name: "Gigabyte B860M Aorus Elite WiFi6E", search: "Gigabyte B860M Aorus Elite WiFi6E", socket: "LGA1851", memory: "DDR5", formFactor: "mATX", wifi: true, maxCpuPower: 250, score: 72, price: 1449, note: "B860 da nova plataforma Intel, com Wi-Fi 6E e suporte a DDR5 rápida." },
  { id: "z890", name: "MSI MAG Z890 Tomahawk WiFi", search: "MSI MAG Z890 Tomahawk WiFi", socket: "LGA1851", memory: "DDR5", formFactor: "ATX", wifi: true, maxCpuPower: 300, score: 92, price: 2699, note: "Z890 topo para Core Ultra K, com Thunderbolt 4 e VRM para 250W+." },
];

export const RAMS: RamOption[] = [
  { id: "ddr4-16", name: "Kingston Fury Beast 16GB (2x8GB) DDR4 3200MHz", search: "Kingston Fury Beast 16GB 2x8 DDR4 3200", memory: "DDR4", capacity: 16, score: 35, price: 279, note: "Kit dual channel DDR4 confiável e barato." },
  { id: "ddr4-32", name: "Corsair Vengeance LPX 32GB (2x16GB) DDR4 3600MHz", search: "Corsair Vengeance LPX 32GB 2x16 DDR4 3600", memory: "DDR4", capacity: 32, score: 62, price: 549, note: "32GB DDR4 em dual channel com latência baixa." },
  { id: "ddr4-64", name: "Kingston Fury Beast 64GB (2x32GB) DDR4 3200MHz", search: "Kingston Fury Beast 64GB 2x32 DDR4 3200", memory: "DDR4", capacity: 64, score: 82, price: 1099, note: "64GB DDR4: muita memória para VMs e projetos grandes pagando pouco." },
  { id: "ddr5-16", name: "Kingston Fury Beast 16GB (2x8GB) DDR5 5600MHz", search: "Kingston Fury Beast 16GB 2x8 DDR5 5600", memory: "DDR5", capacity: 16, score: 45, price: 449, note: "DDR5 5600MHz em dual channel, base da plataforma moderna." },
  { id: "ddr5-32", name: "Kingston Fury Beast 32GB (2x16GB) DDR5 6000MHz CL30", search: "Kingston Fury Beast 32GB 2x16 DDR5 6000 CL30", memory: "DDR5", capacity: 32, score: 75, price: 849, note: "DDR5 6000MHz CL30 — o ponto ideal (sweet spot) para Ryzen AM5 e Core Ultra." },
  { id: "ddr5-64", name: "Corsair Vengeance 64GB (2x32GB) DDR5 6000MHz CL30", search: "Corsair Vengeance 64GB 2x32 DDR5 6000 CL30", memory: "DDR5", capacity: 64, score: 95, price: 1699, note: "64GB DDR5 6000MHz CL30 para estações de trabalho e cenas 3D gigantes." },
];

export const SSDS: SsdOption[] = [
  { id: "nv3-500", name: "Kingston NV3 500GB NVMe PCIe 4.0", search: "Kingston NV3 500GB", capacity: 500, score: 28, kind: "nvme", price: 219, note: "NVMe PCIe 4.0 de entrada: o Windows inicia em segundos." },
  { id: "sn580-1tb", name: "WD Blue SN580 1TB NVMe PCIe 4.0", search: "WD Blue SN580 1TB", capacity: 1000, score: 55, kind: "nvme", price: 399, note: "NVMe PCIe 4.0 eficiente e frio, com ótimo custo por GB." },
  { id: "990evo-2tb", name: "Samsung 990 EVO Plus 2TB NVMe PCIe 4.0", search: "Samsung 990 EVO Plus 2TB", capacity: 2000, score: 76, kind: "nvme", price: 849, note: "2TB com leitura de até 7.250 MB/s — espaço para dezenas de jogos e projetos." },
  { id: "sn850x-2tb", name: "WD Black SN850X 2TB NVMe PCIe 4.0", search: "WD Black SN850X 2TB", capacity: 2000, score: 86, kind: "nvme", price: 1099, note: "Um dos SSDs PCIe 4.0 mais rápidos, com cache generoso e suporte a DirectStorage." },
  { id: "990pro-4tb", name: "Samsung 990 Pro 4TB NVMe PCIe 4.0", search: "Samsung 990 Pro 4TB", capacity: 4000, score: 100, kind: "nvme", price: 2199, note: "4TB de altíssimo desempenho para bibliotecas de assets, renders e VMs." },
];

export const GPUS: GpuOption[] = [
  { id: "rtx3050", name: "NVIDIA GeForce RTX 3050 6GB", search: "RTX 3050 6GB", brand: "nvidia", vram: 6, power: 70, minPsu: 550, gaming: 24, render: 22, price: 1099, note: "Placa de entrada da NVIDIA com DLSS; boa para e-sports em 1080p." },
  { id: "rx6600", name: "AMD Radeon RX 6600 8GB", search: "Radeon RX 6600 8GB", brand: "amd", vram: 8, power: 132, minPsu: 450, gaming: 34, render: 18, price: 1249, note: "Uma das placas com melhor custo por FPS em 1080p no mercado brasileiro." },
  { id: "b580", name: "Intel Arc B580 12GB", search: "Intel Arc B580", brand: "intel", vram: 12, power: 190, minPsu: 600, gaming: 44, render: 30, price: 1849, note: "12GB de VRAM e XeSS a preço intermediário — ótimo valor em 1080p/1440p." },
  { id: "rtx5060", name: "NVIDIA GeForce RTX 5060 8GB", search: "RTX 5060 8GB", brand: "nvidia", vram: 8, power: 145, minPsu: 550, gaming: 48, render: 46, price: 2099, note: "Arquitetura Blackwell com DLSS 4 e Multi Frame Generation, muito eficiente." },
  { id: "rx9060xt", name: "AMD Radeon RX 9060 XT 16GB", search: "RX 9060 XT 16GB", brand: "amd", vram: 16, power: 160, minPsu: 450, gaming: 53, render: 34, price: 2499, note: "16GB de VRAM e FSR 4: sobra memória para texturas no Ultra." },
  { id: "rtx5060ti", name: "NVIDIA GeForce RTX 5060 Ti 16GB", search: "RTX 5060 Ti 16GB", brand: "nvidia", vram: 16, power: 180, minPsu: 600, gaming: 57, render: 56, price: 2999, note: "16GB de VRAM + DLSS 4: versátil para jogos e para IA/render com CUDA." },
  { id: "rtx5070", name: "NVIDIA GeForce RTX 5070 12GB", search: "RTX 5070 12GB", brand: "nvidia", vram: 12, power: 250, minPsu: 650, gaming: 72, render: 68, price: 3999, note: "Alto nível em 1440p com DLSS 4 e ray tracing competente." },
  { id: "rx9070", name: "AMD Radeon RX 9070 16GB", search: "RX 9070 16GB", brand: "amd", vram: 16, power: 220, minPsu: 650, gaming: 73, render: 46, price: 4099, note: "16GB e excelente desempenho de rasterização em 1440p com consumo controlado." },
  { id: "rx9070xt", name: "AMD Radeon RX 9070 XT 16GB", search: "RX 9070 XT 16GB", brand: "amd", vram: 16, power: 304, minPsu: 750, gaming: 80, render: 50, price: 4699, note: "Rasterização de classe alta e 16GB de VRAM: forte para 1440p Ultra e 4K com FSR 4." },
  { id: "rtx5070ti", name: "NVIDIA GeForce RTX 5070 Ti 16GB", search: "RTX 5070 Ti 16GB", brand: "nvidia", vram: 16, power: 300, minPsu: 750, gaming: 84, render: 82, price: 6199, note: "16GB de VRAM e CUDA/OptiX: referência para 1440p com alto FPS, 4K e render 3D." },
  { id: "rtx5080", name: "NVIDIA GeForce RTX 5080 16GB", search: "RTX 5080 16GB", brand: "nvidia", vram: 16, power: 360, minPsu: 850, gaming: 92, render: 90, price: 7999, note: "Placa entusiasta para 4K com ray tracing e render por GPU de cenas pesadas." },
];

export const PSUS: PsuOption[] = [
  { id: "cv450", name: "Corsair CV450 450W 80 Plus Bronze", search: "Corsair CV450", watts: 450, rating: "80 Plus Bronze", score: 20, price: 269, note: "Fonte 80 Plus Bronze honesta para PCs sem placa de vídeo dedicada." },
  { id: "a550bn", name: "MSI MAG A550BN 550W 80 Plus Bronze", search: "MSI MAG A550BN", watts: 550, rating: "80 Plus Bronze", score: 30, price: 329, note: "80 Plus Bronze com proteções completas (OVP/OCP/SCP)." },
  { id: "cx650", name: "Corsair CX650 650W 80 Plus Bronze", search: "Corsair CX650", watts: 650, rating: "80 Plus Bronze", score: 45, price: 429, note: "Linha consagrada da Corsair, estável para GPUs intermediárias." },
  { id: "a750gl", name: "MSI MAG A750GL PCIE5 750W 80 Plus Gold", search: "MSI MAG A750GL PCIE5", watts: 750, rating: "80 Plus Gold", score: 65, price: 629, note: "80 Plus Gold com conector 12V-2x6 (PCIe 5.0) nativo para GPUs modernas." },
  { id: "rm850e", name: "Corsair RM850e 850W 80 Plus Gold ATX 3.1", search: "Corsair RM850e", watts: 850, rating: "80 Plus Gold", score: 80, price: 849, note: "ATX 3.1 totalmente modular, 80 Plus Gold e ventoinha silenciosa (modo zero RPM)." },
  { id: "rm1000x", name: "Corsair RM1000x 1000W 80 Plus Gold ATX 3.1", search: "Corsair RM1000x", watts: 1000, rating: "80 Plus Gold", score: 92, price: 1299, note: "1000W Gold ATX 3.1 com folga de sobra para GPUs topo e upgrades futuros." },
];

export const CASE_KITS: CaseKitOption[] = [
  { id: "kit-box", name: "Gabinete Montech AIR 100 Lite + Cooler box do processador", search: "Montech AIR 100 Lite", coolerSearch: null, maxTdp: 95, formFactors: ["mATX"], usesBoxCooler: true, cooling: 22, silence: 15, price: 219, note: "Gabinete compacto com boa ventilação frontal, aproveitando o cooler que já vem com o processador." },
  { id: "kit-budget", name: "Gabinete Montech X3 Mesh + Cooler DeepCool AG400", search: "Montech X3 Mesh", coolerSearch: "DeepCool AG400", maxTdp: 180, formFactors: ["mATX", "ATX"], usesBoxCooler: false, cooling: 38, silence: 25, price: 449, note: "Frontal mesh com 6 fans inclusos e cooler tower de 4 heatpipes." },
  { id: "kit-entry", name: "Gabinete Montech AIR 903 Base + Cooler DeepCool AK400", search: "Montech AIR 903 Base", coolerSearch: "DeepCool AK400", maxTdp: 200, formFactors: ["mATX", "ATX"], usesBoxCooler: false, cooling: 50, silence: 40, price: 649, note: "Ótimo fluxo de ar com 3 fans de 140mm e cooler tower silencioso." },
  { id: "kit-mid", name: "Gabinete Lian Li Lancool 207 + Cooler Thermalright Peerless Assassin 120 SE", search: "Lian Li Lancool 207", coolerSearch: "Thermalright Peerless Assassin 120 SE", maxTdp: 245, formFactors: ["mATX", "ATX"], usesBoxCooler: false, cooling: 72, silence: 58, price: 899, note: "Fluxo de ar excelente e cooler dual tower que rivaliza com water coolers." },
  { id: "kit-aio", name: "Gabinete NZXT H6 Flow + Water Cooler Arctic Liquid Freezer III Pro 360", search: "NZXT H6 Flow", coolerSearch: "Arctic Liquid Freezer III Pro 360", maxTdp: 320, formFactors: ["mATX", "ATX"], usesBoxCooler: false, cooling: 95, silence: 72, price: 1699, note: "Water cooler de 360mm para CPUs de alto consumo e visual panorâmico." },
  { id: "kit-silent", name: "Gabinete Fractal Design North + Cooler Noctua NH-D15 G2", search: "Fractal Design North", coolerSearch: "Noctua NH-D15 G2", maxTdp: 260, formFactors: ["mATX", "ATX"], usesBoxCooler: false, cooling: 88, silence: 100, price: 2299, note: "Combinação referência em silêncio: frontal em madeira/mesh e um dos coolers a ar mais silenciosos do mercado." },
];

export const PERIPHERAL_KITS: Record<string, PeripheralKit> = {
  basic: { id: "basic", name: "Kit Essencial: Monitor AOC 24B30HM2 24\" 100Hz + Combo Logitech MK235 sem fio", search: "Monitor AOC 24B30HM2", price: 899, note: "Monitor Full HD com 100Hz e combo teclado/mouse sem fio — confortável para estudo e trabalho." },
  g1080: { id: "g1080", name: "Kit Gamer 1080p: Monitor AOC Gaming 24G30E 24\" 180Hz + HyperX Alloy Origins Core + Logitech G203", search: "Monitor AOC 24G30E", price: 1599, note: "Monitor de 180Hz para aproveitar o FPS alto, teclado mecânico e mouse leve." },
  dual: { id: "dual", name: "Kit Dual Monitor: 2x Dell SE2425H 24\" IPS + Combo Logitech MK540", search: "Monitor Dell SE2425H", price: 1899, note: "Dois monitores IPS para código, documentação e reuniões lado a lado." },
  g1440: { id: "g1440", name: "Kit Gamer 1440p: Monitor LG UltraGear 27GS75Q 27\" QHD 180Hz + Redragon Kumara Pro + Logitech G305", search: "LG UltraGear 27GS75Q", price: 2399, note: "Monitor QHD IPS de 180Hz: o casamento ideal para uma GPU de 1440p." },
  creator: { id: "creator", name: "Kit Criador 4K: Monitor LG 27UP850 27\" 4K IPS + Logitech MX Keys S + MX Master 3S", search: "LG 27UP850", price: 3899, note: "Painel 4K IPS com ampla cobertura de cores, ideal para arquitetura e render." },
  g4k: { id: "g4k", name: "Kit Gamer 4K: Monitor LG UltraGear 27GR93U 27\" 4K 144Hz + HyperX Alloy Origins + Logitech G Pro X Superlight", search: "LG UltraGear 27GR93U", price: 4699, note: "Monitor 4K de 144Hz para extrair tudo de uma GPU topo de linha." },
};

export const STORES = [
  { id: "kabum", label: "KaBuM!", url: (q: string) => `https://www.kabum.com.br/busca/${encodeURIComponent(q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))}` },
  { id: "pichau", label: "Pichau", url: (q: string) => `https://www.pichau.com.br/search?q=${encodeURIComponent(q)}` },
  { id: "terabyte", label: "Terabyte", url: (q: string) => `https://www.terabyteshop.com.br/busca?str=${encodeURIComponent(q)}` },
];

export const googleShoppingUrl = (q: string) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`;

/* ============================================================================
 * PEÇAS DE REFERÊNCIA — modelos mais antigos ou fora do catálogo de venda.
 * Não entram nas recomendações; servem para avaliar configurações digitadas
 * ou lidas de um PDF (orçamentos de loja, PCs usados, etc.).
 * ==========================================================================*/

type ReferenceCpu = Omit<CpuOption, "price" | "note" | "id"> & { note?: string };
type ReferenceGpu = Omit<GpuOption, "price" | "note" | "id"> & { note?: string };

const referenceCpu = (cpu: ReferenceCpu): CpuOption => ({ id: `ref-${cpu.search.toLowerCase().replace(/\W+/g, "-")}`, price: 0, note: "", ...cpu });
const referenceGpu = (gpu: ReferenceGpu): GpuOption => ({ id: `ref-${gpu.search.toLowerCase().replace(/\W+/g, "-")}`, price: 0, note: "", ...gpu });

export const REFERENCE_CPUS: CpuOption[] = [
  referenceCpu({ name: "AMD Ryzen 5 3600 (6C/12T)", search: "Ryzen 5 3600", brand: "amd", socket: "AM4", power: 65, gaming: 40, multi: 38, boxCooler: true, igpu: null }),
  referenceCpu({ name: "AMD Ryzen 5 5500 (6C/12T)", search: "Ryzen 5 5500", brand: "amd", socket: "AM4", power: 65, gaming: 44, multi: 40, boxCooler: true, igpu: null }),
  referenceCpu({ name: "AMD Ryzen 7 5700X (8C/16T)", search: "Ryzen 7 5700X", brand: "amd", socket: "AM4", power: 65, gaming: 55, multi: 55, boxCooler: false, igpu: null }),
  referenceCpu({ name: "AMD Ryzen 7 5800X3D (8C/16T)", search: "Ryzen 7 5800X3D", brand: "amd", socket: "AM4", power: 105, gaming: 70, multi: 56, boxCooler: false, igpu: null }),
  referenceCpu({ name: "AMD Ryzen 5 7600X (6C/12T)", search: "Ryzen 5 7600X", brand: "amd", socket: "AM5", power: 105, gaming: 68, multi: 54, boxCooler: false, igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 } }),
  referenceCpu({ name: "AMD Ryzen 7 7700 (8C/16T)", search: "Ryzen 7 7700", brand: "amd", socket: "AM5", power: 65, gaming: 70, multi: 66, boxCooler: true, igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 } }),
  referenceCpu({ name: "AMD Ryzen 7 7800X3D (8C/16T)", search: "Ryzen 7 7800X3D", brand: "amd", socket: "AM5", power: 120, gaming: 92, multi: 68, boxCooler: false, igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 } }),
  referenceCpu({ name: "AMD Ryzen 9 7950X (16C/32T)", search: "Ryzen 9 7950X", brand: "amd", socket: "AM5", power: 170, gaming: 80, multi: 95, boxCooler: false, igpu: { name: "Radeon Graphics (2 CUs)", gaming: 3, render: 2 } }),
  referenceCpu({ name: "Intel Core i3-10100F (4C/8T)", search: "Core i3-10100F", brand: "intel", socket: "LGA1200", power: 65, gaming: 32, multi: 22, boxCooler: true, igpu: null }),
  referenceCpu({ name: "Intel Core i5-10400F (6C/12T)", search: "Core i5-10400F", brand: "intel", socket: "LGA1200", power: 65, gaming: 40, multi: 36, boxCooler: true, igpu: null }),
  referenceCpu({ name: "Intel Core i5-11400F (6C/12T)", search: "Core i5-11400F", brand: "intel", socket: "LGA1200", power: 65, gaming: 46, multi: 40, boxCooler: true, igpu: null }),
  referenceCpu({ name: "Intel Core i3-12100F (4C/8T)", search: "Core i3-12100F", brand: "intel", socket: "LGA1700", power: 89, gaming: 42, multi: 28, boxCooler: true, igpu: null }),
  referenceCpu({ name: "Intel Core i5-12400 (6C/12T)", search: "Core i5-12400", brand: "intel", socket: "LGA1700", power: 90, gaming: 52, multi: 45, boxCooler: true, igpu: { name: "Intel UHD 730", gaming: 4, render: 3 } }),
  referenceCpu({ name: "Intel Core i5-12600K (10C/16T)", search: "Core i5-12600K", brand: "intel", socket: "LGA1700", power: 150, gaming: 62, multi: 62, boxCooler: false, igpu: { name: "Intel UHD 770", gaming: 5, render: 4 } }),
  referenceCpu({ name: "Intel Core i5-13400F (10C/16T)", search: "Core i5-13400F", brand: "intel", socket: "LGA1700", power: 148, gaming: 60, multi: 60, boxCooler: true, igpu: null }),
  referenceCpu({ name: "Intel Core i7-12700K (12C/20T)", search: "Core i7-12700K", brand: "intel", socket: "LGA1700", power: 190, gaming: 66, multi: 78, boxCooler: false, igpu: { name: "Intel UHD 770", gaming: 5, render: 4 } }),
  referenceCpu({ name: "Intel Core i7-13700K (16C/24T)", search: "Core i7-13700K", brand: "intel", socket: "LGA1700", power: 253, gaming: 74, multi: 88, boxCooler: false, igpu: { name: "Intel UHD 770", gaming: 5, render: 4 } }),
  referenceCpu({ name: "Intel Core i7-14700K (20C/28T)", search: "Core i7-14700K", brand: "intel", socket: "LGA1700", power: 253, gaming: 76, multi: 92, boxCooler: false, igpu: { name: "Intel UHD 770", gaming: 5, render: 4 } }),
  referenceCpu({ name: "Intel Core i9-14900K (24C/32T)", search: "Core i9-14900K", brand: "intel", socket: "LGA1700", power: 253, gaming: 80, multi: 98, boxCooler: false, igpu: { name: "Intel UHD 770", gaming: 5, render: 4 } }),
];

export const REFERENCE_GPUS: GpuOption[] = [
  referenceGpu({ name: "NVIDIA GeForce GTX 1650 4GB", search: "GTX 1650", brand: "nvidia", vram: 4, power: 75, minPsu: 300, gaming: 16, render: 12 }),
  referenceGpu({ name: "NVIDIA GeForce GTX 1660 Super 6GB", search: "GTX 1660 Super", brand: "nvidia", vram: 6, power: 125, minPsu: 450, gaming: 24, render: 16 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 2060 6GB", search: "RTX 2060", brand: "nvidia", vram: 6, power: 160, minPsu: 500, gaming: 30, render: 26 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 3060 12GB", search: "RTX 3060", brand: "nvidia", vram: 12, power: 170, minPsu: 550, gaming: 34, render: 34 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 3060 Ti 8GB", search: "RTX 3060 Ti", brand: "nvidia", vram: 8, power: 200, minPsu: 600, gaming: 42, render: 38 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 3070 8GB", search: "RTX 3070", brand: "nvidia", vram: 8, power: 220, minPsu: 650, gaming: 48, render: 44 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 3080 10GB", search: "RTX 3080", brand: "nvidia", vram: 10, power: 320, minPsu: 750, gaming: 62, render: 58 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 4060 8GB", search: "RTX 4060", brand: "nvidia", vram: 8, power: 115, minPsu: 550, gaming: 40, render: 38 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 4060 Ti 8GB", search: "RTX 4060 Ti", brand: "nvidia", vram: 8, power: 160, minPsu: 550, gaming: 46, render: 44 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 4070 12GB", search: "RTX 4070", brand: "nvidia", vram: 12, power: 200, minPsu: 650, gaming: 60, render: 58 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 4070 Super 12GB", search: "RTX 4070 Super", brand: "nvidia", vram: 12, power: 220, minPsu: 650, gaming: 66, render: 64 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 4070 Ti Super 16GB", search: "RTX 4070 Ti Super", brand: "nvidia", vram: 16, power: 285, minPsu: 700, gaming: 74, render: 72 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 4080 Super 16GB", search: "RTX 4080 Super", brand: "nvidia", vram: 16, power: 320, minPsu: 750, gaming: 88, render: 84 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 4090 24GB", search: "RTX 4090", brand: "nvidia", vram: 24, power: 450, minPsu: 850, gaming: 98, render: 98 }),
  referenceGpu({ name: "NVIDIA GeForce RTX 5090 32GB", search: "RTX 5090", brand: "nvidia", vram: 32, power: 575, minPsu: 1000, gaming: 100, render: 100 }),
  referenceGpu({ name: "AMD Radeon RX 580 8GB", search: "RX 580", brand: "amd", vram: 8, power: 185, minPsu: 500, gaming: 20, render: 10 }),
  referenceGpu({ name: "AMD Radeon RX 6500 XT 4GB", search: "RX 6500 XT", brand: "amd", vram: 4, power: 107, minPsu: 400, gaming: 15, render: 8 }),
  referenceGpu({ name: "AMD Radeon RX 6650 XT 8GB", search: "RX 6650 XT", brand: "amd", vram: 8, power: 180, minPsu: 500, gaming: 40, render: 20 }),
  referenceGpu({ name: "AMD Radeon RX 6700 XT 12GB", search: "RX 6700 XT", brand: "amd", vram: 12, power: 230, minPsu: 650, gaming: 46, render: 26 }),
  referenceGpu({ name: "AMD Radeon RX 7600 8GB", search: "RX 7600", brand: "amd", vram: 8, power: 165, minPsu: 550, gaming: 40, render: 22 }),
  referenceGpu({ name: "AMD Radeon RX 7700 XT 12GB", search: "RX 7700 XT", brand: "amd", vram: 12, power: 245, minPsu: 700, gaming: 55, render: 30 }),
  referenceGpu({ name: "AMD Radeon RX 7800 XT 16GB", search: "RX 7800 XT", brand: "amd", vram: 16, power: 263, minPsu: 700, gaming: 64, render: 38 }),
  referenceGpu({ name: "AMD Radeon RX 7900 XT 20GB", search: "RX 7900 XT", brand: "amd", vram: 20, power: 315, minPsu: 750, gaming: 78, render: 46 }),
  referenceGpu({ name: "Intel Arc A750 8GB", search: "Arc A750", brand: "intel", vram: 8, power: 225, minPsu: 600, gaming: 38, render: 22 }),
];

/** Chipsets conhecidos → socket, para reconhecer placas-mãe em textos/PDFs. */
export const CHIPSETS: Record<string, { socket: Socket; score: number; maxCpuPower: number }> = {
  a320: { socket: "AM4", score: 20, maxCpuPower: 90 },
  b350: { socket: "AM4", score: 30, maxCpuPower: 105 },
  b450: { socket: "AM4", score: 40, maxCpuPower: 120 },
  x470: { socket: "AM4", score: 55, maxCpuPower: 150 },
  a520: { socket: "AM4", score: 30, maxCpuPower: 105 },
  b550: { socket: "AM4", score: 55, maxCpuPower: 170 },
  x570: { socket: "AM4", score: 70, maxCpuPower: 200 },
  a620: { socket: "AM5", score: 40, maxCpuPower: 120 },
  b650: { socket: "AM5", score: 65, maxCpuPower: 230 },
  b650e: { socket: "AM5", score: 72, maxCpuPower: 230 },
  x670: { socket: "AM5", score: 85, maxCpuPower: 300 },
  x670e: { socket: "AM5", score: 88, maxCpuPower: 300 },
  b850: { socket: "AM5", score: 80, maxCpuPower: 250 },
  x870: { socket: "AM5", score: 92, maxCpuPower: 300 },
  x870e: { socket: "AM5", score: 95, maxCpuPower: 300 },
  h410: { socket: "LGA1200", score: 20, maxCpuPower: 65 },
  b460: { socket: "LGA1200", score: 35, maxCpuPower: 125 },
  h510: { socket: "LGA1200", score: 25, maxCpuPower: 65 },
  b560: { socket: "LGA1200", score: 45, maxCpuPower: 150 },
  z490: { socket: "LGA1200", score: 65, maxCpuPower: 250 },
  z590: { socket: "LGA1200", score: 70, maxCpuPower: 250 },
  h610: { socket: "LGA1700", score: 28, maxCpuPower: 125 },
  b660: { socket: "LGA1700", score: 50, maxCpuPower: 200 },
  b760: { socket: "LGA1700", score: 55, maxCpuPower: 220 },
  z690: { socket: "LGA1700", score: 80, maxCpuPower: 300 },
  z790: { socket: "LGA1700", score: 85, maxCpuPower: 300 },
  b860: { socket: "LGA1851", score: 72, maxCpuPower: 250 },
  z890: { socket: "LGA1851", score: 92, maxCpuPower: 300 },
};

/* ============================================================================
 * PEÇAS SINTÉTICAS — usadas quando o texto/PDF só informa a especificação
 * (ex.: "16GB DDR4", "SSD 480GB", "Fonte 500W") e não o modelo exato.
 * ==========================================================================*/

export function genericRam(capacity: number, memory: MemoryType): RamOption {
  const base = capacity >= 64 ? 82 : capacity >= 32 ? 62 : capacity >= 16 ? 35 : capacity >= 8 ? 15 : 5;
  return {
    id: `generic-ram-${capacity}-${memory}`,
    name: `Memória ${capacity}GB ${memory}`,
    search: `Memória ${capacity}GB ${memory}`,
    memory,
    capacity,
    score: Math.min(100, memory === "DDR5" ? base + 12 : base),
    price: 0,
    note: "",
  };
}

export function genericStorage(capacity: number, kind: SsdOption["kind"]): SsdOption {
  const base = capacity >= 4000 ? 90 : capacity >= 2000 ? 72 : capacity >= 1000 ? 52 : capacity >= 480 ? 28 : 12;
  const factor = kind === "nvme" ? 1 : kind === "sata" ? 0.75 : 0.35;
  const label = kind === "nvme" ? "SSD NVMe" : kind === "sata" ? "SSD SATA" : "HD (disco mecânico)";
  return {
    id: `generic-ssd-${capacity}-${kind}`,
    name: `${label} ${capacity >= 1000 ? `${capacity / 1000}TB` : `${capacity}GB`}`,
    search: `${label} ${capacity >= 1000 ? `${capacity / 1000}TB` : `${capacity}GB`}`,
    capacity,
    kind,
    score: Math.round(base * factor),
    price: 0,
    note: "",
  };
}

export function genericPsu(watts: number, rating: string | null): PsuOption {
  const quality = rating ? ({ white: 10, bronze: 25, silver: 35, gold: 50, platinum: 60, titanium: 65 } as Record<string, number>)[rating] ?? 15 : 10;
  return {
    id: `generic-psu-${watts}`,
    name: `Fonte ${watts}W${rating ? ` 80 Plus ${rating[0].toUpperCase()}${rating.slice(1)}` : ""}`,
    search: `Fonte ${watts}W${rating ? ` 80 Plus ${rating}` : ""}`,
    watts,
    rating: rating ? `80 Plus ${rating[0].toUpperCase()}${rating.slice(1)}` : "Sem certificação informada",
    score: Math.min(100, quality + Math.min(35, Math.round(watts / 25))),
    price: 0,
    note: "",
  };
}

export function genericMobo(chipset: string, memory: MemoryType, mATX: boolean, wifi: boolean): MoboOption | null {
  const info = CHIPSETS[chipset];
  if (!info) return null;
  return {
    id: `generic-mobo-${chipset}`,
    name: `Placa-mãe chipset ${chipset.toUpperCase()}${mATX ? "M" : ""}`,
    search: `Placa-mãe ${chipset.toUpperCase()}`,
    socket: info.socket,
    memory,
    formFactor: mATX ? "mATX" : "ATX",
    wifi,
    maxCpuPower: info.maxCpuPower,
    score: info.score,
    price: 0,
    note: "",
  };
}

export function genericCooler(kind: "water" | "air" | "box"): CaseKitOption {
  const data = {
    water: { name: "Water cooler (informado no documento)", maxTdp: 280, cooling: 85, silence: 60 },
    air: { name: "Cooler a ar (informado no documento)", maxTdp: 180, cooling: 45, silence: 40 },
    box: { name: "Cooler box do processador", maxTdp: 95, cooling: 22, silence: 15 },
  }[kind];
  return {
    id: `generic-cooler-${kind}`,
    search: data.name,
    coolerSearch: null,
    formFactors: ["mATX", "ATX"],
    usesBoxCooler: kind === "box",
    price: 0,
    note: "",
    ...data,
  };
}
