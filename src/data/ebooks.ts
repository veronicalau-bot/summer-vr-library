export interface EBook {
  id: string
  title: string
  author: string
  description: string
  category: string
  coverColor: string
  accentColor: string
  borrowUrl: string
  qrContent: string
  tags: string[]
  year: number
  pages: number
}

export const ebooks: EBook[] = [
  {
    id: '1',
    title: '海洋生態學',
    author: '陳志遠',
    description: '深入探討海洋生態系統的結構、功能與生物多樣性，涵蓋珊瑚礁、深海生物與海洋保育等主題，幫助讀者理解藍色星球的奧秘。',
    category: '自然科學',
    coverColor: '#1a5276',
    accentColor: '#5dade2',
    borrowUrl: '#borrow-1',
    qrContent: 'https://library.example.com/borrow/1',
    tags: ['海洋', '生態', '環境'],
    year: 2023,
    pages: 312,
  },
  {
    id: '2',
    title: '超越現實的未來視界，AI時代VR科技的終極力量',
    author: '甘開全',
    description: '本書從資本推手、VR產業鏈、VR的商業模式、VR沉浸式體驗、VR變現和VR未來趨勢等六個方面，多層次解讀了虛擬實境VR產業的起源、發展、分化蛻變和未來創新的軌跡。書中透過有趣的故事案例、多位名人關於虛擬實境的言論，以及豐富的數據圖表，深入淺出地闡述VR新秩序──虛擬實境的商業模式與產業趨勢。',
    category: '資訊科技',
    coverColor: '#1a365d',
    accentColor: '#63b3ed',
    borrowUrl: 'https://hkapa-ebook-hyread-com-tw.libproxy.hkapa.edu/bookDetail.jsp?id=251540',
    qrContent: 'https://hkapa-ebook-hyread-com-tw.libproxy.hkapa.edu/bookDetail.jsp?id=251540',
    tags: ['VR', '虛擬實境', 'AI', '科技'],
    year: 2024,
    pages: 268,
  },
  {
    id: '3',
    title: '現代心理學',
    author: '張雅婷',
    description: '結合認知、行為與人本三大學派，探討人類行為、情緒與社會互動的心理機制，以生動案例輔助理解。',
    category: '心理學',
    coverColor: '#7b241c',
    accentColor: '#ec7063',
    borrowUrl: '#borrow-3',
    qrContent: 'https://library.example.com/borrow/3',
    tags: ['心理', '行為', '認知'],
    year: 2022,
    pages: 256,
  },
  {
    id: '4',
    title: '永續發展指南',
    author: '黃建國',
    description: '探討全球氣候變遷、再生能源與循環經濟，引導讀者理解並實踐永續生活方式，從個人到政策全面剖析。',
    category: '環境科學',
    coverColor: '#1d6138',
    accentColor: '#52be80',
    borrowUrl: '#borrow-4',
    qrContent: 'https://library.example.com/borrow/4',
    tags: ['環境', '永續', '氣候'],
    year: 2023,
    pages: 388,
  },
  {
    id: '5',
    title: '數位設計思維',
    author: '吳欣怡',
    description: '從用戶研究到原型設計，系統性介紹 UX/UI 設計流程與設計思維方法論，包含豐富實作練習與案例分析。',
    category: '設計',
    coverColor: '#935116',
    accentColor: '#f0b27a',
    borrowUrl: '#borrow-5',
    qrContent: 'https://library.example.com/borrow/5',
    tags: ['設計', 'UX', '創意'],
    year: 2024,
    pages: 295,
  },
  {
    id: '6',
    title: '全球史觀',
    author: '李秀珍',
    description: '打破國別史框架，以全球視角審視人類文明的發展脈絡、文化交流與歷史變遷，重新詮釋世界史。',
    category: '歷史',
    coverColor: '#6e2f0f',
    accentColor: '#e59866',
    borrowUrl: '#borrow-6',
    qrContent: 'https://library.example.com/borrow/6',
    tags: ['歷史', '文明', '文化'],
    year: 2021,
    pages: 512,
  },
  {
    id: '7',
    title: '量子計算入門',
    author: '王志明',
    description: '以淺顯易懂的方式介紹量子力學基礎與量子計算原理，穿插數學推導與程式範例，適合理工科大學生。',
    category: '物理學',
    coverColor: '#1a4f7a',
    accentColor: '#5dade2',
    borrowUrl: '#borrow-7',
    qrContent: 'https://library.example.com/borrow/7',
    tags: ['量子', '物理', '計算'],
    year: 2024,
    pages: 344,
  },
  {
    id: '8',
    title: '當代文學選集',
    author: '各位作者合著',
    description: '精選二十一世紀華語文學佳作，涵蓋短篇小說、散文與詩歌，展現當代文學的多元面貌與人文關懷。',
    category: '文學',
    coverColor: '#76245a',
    accentColor: '#f1948a',
    borrowUrl: '#borrow-8',
    qrContent: 'https://library.example.com/borrow/8',
    tags: ['文學', '小說', '詩歌'],
    year: 2023,
    pages: 468,
  },
]
