export const theme = {
  color: {
    surface: '#FFFFFF',
    onSurface: '#0A0A0A',
    surface2: '#F5F5F7',
    surface3: '#E4E7EC',
    inverse: '#0A0A0A',
    onInverse: '#FFFFFF',
    gold: '#D4AF37',
    champagne: '#E7D9A8',
    energy: '#00E5FF',
    energySoft: '#7EDCF3',
    silverLine: 'rgba(10,10,10,0.08)',
    silverLineStrong: 'rgba(10,10,10,0.16)',
    scrim: 'rgba(255,255,255,0.72)',
    glass: 'rgba(255,255,255,0.55)',
    glassStrong: 'rgba(255,255,255,0.82)',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 6, md: 12, lg: 20, xl: 28, pill: 999 },
  font: {
    // System stack fallback (avoids @expo-google-fonts) — feels premium
    display: 'System',
    text: 'System',
  },
} as const;

export const portalMeta: Record<string, { name: string; accent: string; ambient: string; tagline: string; image: string }> = {
  creativity: {
    name: 'Creativity',
    accent: '#B57EDC',
    tagline: "What's trying to come out of your head today?",
    ambient: 'A futuristic creative studio.',
    image: 'https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwY3JlYXRpdmUlMjBhcnQlMjBzdHVkaW8lMjBtaW5pbWFsaXN0fGVufDB8fHx8MTc4NzgzMzE2NHww&ixlib=rb-4.1.0&q=85',
  },
  work: {
    name: 'Work',
    accent: '#0A0A0A',
    tagline: 'What needs attention?',
    ambient: 'Premium futuristic boardroom.',
    image: 'https://images.unsplash.com/photo-1776482128008-2c9cf5bc0edc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwbW9kZXJuJTIwZXhlY3V0aXZlJTIwb2ZmaWNlJTIwZ2xhc3MlMjBhZXN0aGV0aWN8ZW58MHx8fHwxNzg3ODMzMTY0fDA&ixlib=rb-4.1.0&q=85',
  },
  home: {
    name: 'Home',
    accent: '#8FA6B2',
    tagline: 'How is home tonight?',
    ambient: 'Luxury smart home.',
    image: 'https://images.unsplash.com/photo-1564078516393-cf04bd966897?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBzbWFydCUyMGhvbWUlMjBsaXZpbmclMjByb29tJTIwYWVzdGhldGljfGVufDB8fHx8MTc4NzgzMzE2NHww&ixlib=rb-4.1.0&q=85',
  },
  wellbeing: {
    name: 'Wellbeing',
    accent: '#7EC4CF',
    tagline: 'How is your body and mind?',
    ambient: 'Water, light, glass sanctuary.',
    image: 'https://images.unsplash.com/photo-1676302144341-10563603f99a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjB3ZWxsbmVzcyUyMHNhbmN0dWFyeSUyMHNwYSUyMGludGVyaW9yfGVufDB8fHx8MTc4NzgzMzE2NHww&ixlib=rb-4.1.0&q=85',
  },
  relationships: {
    name: 'Relationships',
    accent: '#E8B4B8',
    tagline: "Who's on your mind?",
    ambient: 'Warm, human.',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
  },
  community: {
    name: 'Community',
    accent: '#C9B037',
    tagline: "What's happening around you?",
    ambient: 'City energy.',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  },
  style: {
    name: 'Style',
    accent: '#D4AF37',
    tagline: 'What are you wearing?',
    ambient: 'Luxury dressing room.',
    image: 'https://images.unsplash.com/photo-1662454419622-a41092ecd245?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTV8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBtaW5pbWFsJTIwZHJlc3NpbmclMjByb29tJTIwd2FyZHJvYmUlMjBhZXN0aGV0aWN8ZW58MHx8fHwxNzg3ODMzMTY0fDA&ixlib=rb-4.1.0&q=85',
  },
};

export const PORTAL_IDS = ['creativity', 'work', 'home', 'wellbeing', 'relationships', 'community', 'style'] as const;
