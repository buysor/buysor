export type ProductSubcategory = { id: string; ko: string; en: string };
export type ProductCategory = {
  id: string;
  ko: string;
  en: string;
  majorId: string;
  subcategories: ProductSubcategory[];
};
export type ProductMajorCategory = {
  id: string;
  ko: string;
  en: string;
  categories: ProductCategory[];
};

export const PRODUCT_CATEGORY_TREE: ProductMajorCategory[] = [
  {
    id: "digital",
    ko: "디지털 · IT",
    en: "Digital · IT",
    categories: [
      {
        id: "computer",
        majorId: "digital",
        ko: "컴퓨터 · 태블릿",
        en: "Computers · tablets",
        subcategories: [
          { id: "laptop", ko: "노트북", en: "Laptop" },
          { id: "desktop", ko: "데스크탑", en: "Desktop" },
          { id: "monitor", ko: "모니터", en: "Monitor" },
          { id: "tablet", ko: "태블릿", en: "Tablet" },
          { id: "keyboard-mouse", ko: "키보드 · 마우스", en: "Keyboard · mouse" },
          { id: "pc-parts", ko: "PC 부품", en: "PC parts" },
        ],
      },
      {
        id: "mobile",
        majorId: "digital",
        ko: "모바일 · 웨어러블",
        en: "Mobile · wearable",
        subcategories: [
          { id: "smartphone", ko: "스마트폰", en: "Smartphone" },
          { id: "smartwatch", ko: "스마트워치", en: "Smartwatch" },
          { id: "earbuds", ko: "무선 이어폰", en: "Wireless earbuds" },
          { id: "headphones", ko: "헤드폰", en: "Headphones" },
          { id: "charging", ko: "충전기 · 보조배터리", en: "Charging · power bank" },
          { id: "tracker", ko: "스마트태그 · 위치추적", en: "Smart tag · tracker" },
        ],
      },
      {
        id: "display-audio",
        majorId: "digital",
        ko: "TV · 오디오",
        en: "TV · audio",
        subcategories: [
          { id: "tv", ko: "TV", en: "TV" },
          { id: "projector", ko: "프로젝터", en: "Projector" },
          { id: "speaker", ko: "스피커", en: "Speaker" },
          { id: "soundbar", ko: "사운드바", en: "Soundbar" },
          { id: "audio", ko: "오디오 기기", en: "Audio gear" },
          { id: "streaming", ko: "셋톱 · 스트리밍 기기", en: "Streaming device" },
        ],
      },
      {
        id: "creator",
        majorId: "digital",
        ko: "카메라 · 크리에이터",
        en: "Camera · creator",
        subcategories: [
          { id: "camera", ko: "카메라", en: "Camera" },
          { id: "lens", ko: "렌즈", en: "Lens" },
          { id: "actioncam", ko: "액션캠", en: "Action camera" },
          { id: "gimbal", ko: "짐벌", en: "Gimbal" },
          { id: "microphone", ko: "마이크", en: "Microphone" },
          { id: "lighting", ko: "촬영 조명", en: "Studio lighting" },
        ],
      },
    ],
  },
  {
    id: "home",
    ko: "가전 · 생활",
    en: "Home · living",
    categories: [
      {
        id: "home-appliance",
        majorId: "home",
        ko: "생활가전",
        en: "Home appliances",
        subcategories: [
          { id: "refrigerator", ko: "냉장고", en: "Refrigerator" },
          { id: "washer", ko: "세탁기", en: "Washer" },
          { id: "dryer", ko: "건조기", en: "Dryer" },
          { id: "vacuum", ko: "청소기", en: "Vacuum" },
          { id: "air-conditioner", ko: "에어컨", en: "Air conditioner" },
          { id: "air-purifier", ko: "공기청정기", en: "Air purifier" },
        ],
      },
      {
        id: "kitchen",
        majorId: "home",
        ko: "주방가전",
        en: "Kitchen appliances",
        subcategories: [
          { id: "microwave", ko: "전자레인지 · 오븐", en: "Microwave · oven" },
          { id: "dishwasher", ko: "식기세척기", en: "Dishwasher" },
          { id: "coffee", ko: "커피머신", en: "Coffee machine" },
          { id: "airfryer", ko: "에어프라이어", en: "Air fryer" },
          { id: "rice-cooker", ko: "전기밥솥", en: "Rice cooker" },
          { id: "small-kitchen", ko: "소형 주방가전", en: "Small kitchen appliance" },
        ],
      },
      {
        id: "living",
        majorId: "home",
        ko: "가구 · 생활",
        en: "Furniture · living",
        subcategories: [
          { id: "chair", ko: "의자", en: "Chair" },
          { id: "desk", ko: "책상", en: "Desk" },
          { id: "mattress", ko: "매트리스", en: "Mattress" },
          { id: "lighting-home", ko: "조명", en: "Lighting" },
          { id: "storage", ko: "수납 · 정리", en: "Storage" },
          { id: "other-living", ko: "기타 생활제품", en: "Other living products" },
        ],
      },
    ],
  },
  {
    id: "work",
    ko: "공구 · 작업",
    en: "Tools · work",
    categories: [
      {
        id: "power-tools",
        majorId: "work",
        ko: "전동공구",
        en: "Power tools",
        subcategories: [
          { id: "drill-driver", ko: "드릴 · 드라이버", en: "Drill · driver" },
          { id: "impact", ko: "임팩트 · 렌치", en: "Impact · wrench" },
          { id: "rotary-hammer", ko: "해머 · 함마드릴", en: "Rotary hammer" },
          { id: "saw", ko: "원형톱 · 절단기", en: "Saw · cutter" },
          { id: "grinder", ko: "그라인더 · 연마", en: "Grinder · sanding" },
          { id: "nailer", ko: "타카 · 네일러", en: "Nailer" },
        ],
      },
      {
        id: "workshop",
        majorId: "work",
        ko: "작업장비 · 측정",
        en: "Workshop · measuring",
        subcategories: [
          { id: "dust", ko: "집진기", en: "Dust extractor" },
          { id: "laser", ko: "레이저 레벨", en: "Laser level" },
          { id: "measure", ko: "측정공구", en: "Measuring tools" },
          { id: "compressor", ko: "컴프레서", en: "Compressor" },
          { id: "battery", ko: "배터리 · 충전기", en: "Battery · charger" },
          { id: "safety", ko: "보호장비", en: "Safety gear" },
        ],
      },
    ],
  },
  {
    id: "mobility-major",
    ko: "차량 · 이동",
    en: "Vehicle · mobility",
    categories: [
      {
        id: "car",
        majorId: "mobility-major",
        ko: "자동차 용품 · 전장",
        en: "Car gear · electronics",
        subcategories: [
          { id: "dashcam", ko: "블랙박스", en: "Dash cam" },
          { id: "navigation", ko: "내비게이션 · CarPlay", en: "Navigation · CarPlay" },
          { id: "car-electronics", ko: "차량용 전자기기", en: "Car electronics" },
          { id: "tire", ko: "타이어 · 휠", en: "Tire · wheel" },
          { id: "car-care", ko: "세차 · 관리용품", en: "Car care" },
          { id: "car-accessory", ko: "차량 액세서리", en: "Car accessory" },
        ],
      },
      {
        id: "mobility",
        majorId: "mobility-major",
        ko: "퍼스널 모빌리티",
        en: "Personal mobility",
        subcategories: [
          { id: "scooter", ko: "전동킥보드", en: "E-scooter" },
          { id: "bike", ko: "자전거", en: "Bike" },
          { id: "ebike", ko: "전기자전거", en: "E-bike" },
          { id: "helmet", ko: "헬멧 · 보호장비", en: "Helmet · protection" },
          { id: "mobility-battery", ko: "배터리 · 충전", en: "Battery · charging" },
        ],
      },
    ],
  },
];

export const PRODUCT_CATEGORIES: ProductCategory[] = PRODUCT_CATEGORY_TREE.flatMap((major) => major.categories);

export function findCategory(categoryId?: string | null, subcategoryId?: string | null) {
  const category = PRODUCT_CATEGORIES.find((item) => item.id === categoryId) ?? null;
  const major = category ? PRODUCT_CATEGORY_TREE.find((item) => item.id === category.majorId) ?? null : null;
  const subcategory = category?.subcategories.find((item) => item.id === subcategoryId) ?? null;
  return { major, category, subcategory };
}
