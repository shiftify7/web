export const LANDMARK_ALT: Record<string, { src: string; alt: string }> = {
  delhi: { src: '/locations/delhi.webp', alt: 'India Gate, Delhi' },
  gurgaon: { src: '/locations/gurgaon.webp', alt: 'DLF Cyber Hub, Gurgaon' },
  noida: { src: '/locations/noida.webp', alt: 'Noida Sector 78–76 skyline' },
  mumbai: { src: '/locations/mumbai.webp', alt: 'Gateway of India, Mumbai' },
  bengaluru: { src: '/locations/bengaluru.webp', alt: 'Vidhana Soudha, Bengaluru' },
};

export function landmarkFor(slug: string) {
  return LANDMARK_ALT[slug] || null;
}
