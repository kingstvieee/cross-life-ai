export const theme = {
  color: {
    surface: '#0A0B0E',
    onSurface: '#F3F4F6',
    surface2: '#15171D',
    surface3: '#1F222B',
    inverse: '#FFFFFF',
    onInverse: '#000000',
    gold: '#D4AF37',
    champagne: '#E7D9A8',
    energy: '#00E5FF',
    energySoft: '#7EDCF3',
    emerald: '#1DE9B6',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(255,255,255,0.18)',
    silverLine: 'rgba(255,255,255,0.07)',
    silverLineStrong: 'rgba(255,255,255,0.16)',
    scrim: 'rgba(10,11,14,0.72)',
    glass: 'rgba(21,23,29,0.62)',
    glassStrong: 'rgba(21,23,29,0.85)',
    danger: '#FF5C7A',
    dangerTint: 'rgba(255,23,68,0.14)',
    warn: '#FFD600',
    warnTint: 'rgba(255,214,0,0.12)',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 6, md: 12, lg: 20, xl: 28, pill: 999 },
  font: {
    display: 'System',
    text: 'System',
  },
} as const;

export const IMG = {
  toronto: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNzl8MHwxfHNlYXJjaHwxfHx0b3JvbnRvJTIwc2t5bGluZSUyMGNuJTIwdG93ZXIlMjBkYXJrJTIwbW9vZHl8ZW58MHx8fHwxNzg3OTIxMTMzfDA&ixlib=rb-4.1.0&q=85',
};

export const portalMeta: Record<string, { name: string; accent: string; ambient: string; tagline: string; image: string }> = {
  creativity: {
    name: 'Creativity',
    accent: '#C084FC',
    tagline: "What's trying to come out of your head today?",
    ambient: 'A moody creative studio.',
    image: 'https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwY3JlYXRpdmUlMjBhcnQlMjBzdHVkaW8lMjBtaW5pbWFsaXN0fGVufDB8fHx8MTc4NzgzMzE2NHww&ixlib=rb-4.1.0&q=85',
  },
  work: {
    name: 'Work',
    accent: '#38BDF8',
    tagline: 'What needs attention?',
    ambient: 'Dark executive office at night.',
    image: 'https://images.unsplash.com/photo-1742046335792-060080d72460?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMHdvcmtzcGFjZSUyMGRlc2slMjBkYXJrJTIwY2luZW1hdGljfGVufDB8fHx8MTc4NzkyMTEzM3ww&ixlib=rb-4.1.0&q=85',
  },
  home: {
    name: 'Home',
    accent: '#94A3B8',
    tagline: 'How is home tonight?',
    ambient: 'Cinematic smart home.',
    image: 'https://images.unsplash.com/photo-1640357897497-599b4fc84f51?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBzbWFydCUyMGhvbWUlMjBpbnRlcmlvciUyMGRhcmslMjBtb29keSUyMGxpZ2h0aW5nfGVufDB8fHx8MTc4NzkyMTEzM3ww&ixlib=rb-4.1.0&q=85',
  },
  wellbeing: {
    name: 'Wellbeing',
    accent: '#1DE9B6',
    tagline: 'How is your body and mind?',
    ambient: 'Dark atmospheric sanctuary.',
    image: 'https://images.unsplash.com/photo-1532798442725-41036acc7489?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwxfHxtZWRpdGF0aW9uJTIwYnJlYXRoaW5nJTIwd2VsbG5lc3MlMjBkYXJrJTIwYXRtb3NwaGVyaWN8ZW58MHx8fHwxNzg3OTIxMTMzfDA&ixlib=rb-4.1.0&q=85',
  },
  relationships: {
    name: 'Relationships',
    accent: '#F9A8D4',
    tagline: "Who's on your mind?",
    ambient: 'Warm, human, low light.',
    image: 'https://images.unsplash.com/photo-1541679368093-5c967ac6de11?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBob2xkaW5nJTIwaGFuZHMlMjBkYXJrJTIwY2luZW1hdGljJTIwbW9vZHl8ZW58MHx8fHwxNzg3OTIxMTQwfDA&ixlib=rb-4.1.0&q=85',
  },
  community: {
    name: 'Community',
    accent: '#FBBF24',
    tagline: "What's happening around you?",
    ambient: 'City energy after dark.',
    image: 'https://images.unsplash.com/photo-1765224747196-f4d8e34f5846?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBldmVudCUyMGNvbmNlcnQlMjBkYXJrJTIwYXRtb3NwaGVyaWN8ZW58MHx8fHwxNzg3OTIxMTMzfDA&ixlib=rb-4.1.0&q=85',
  },
  style: {
    name: 'Style',
    accent: '#D4AF37',
    tagline: 'What are you wearing?',
    ambient: 'Editorial dressing room.',
    image: 'https://images.unsplash.com/photo-1580478491436-fd6a937acc9e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBmYXNoaW9uJTIwb3V0Zml0JTIwZWRpdG9yaWFsJTIwZGFya3xlbnwwfHx8fDE3ODc5MjExMzN8MA&ixlib=rb-4.1.0&q=85',
  },
};

export const PORTAL_IDS = ['creativity', 'work', 'home', 'wellbeing', 'relationships', 'community', 'style'] as const;
