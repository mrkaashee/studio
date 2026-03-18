export default {
  slots: {
    root: 'absolute flex items-center justify-center transition-all duration-300 group',
    dot: 'w-full h-full rounded-full border-2 transition-all duration-300',
    glow: 'absolute inset-0 rounded-full bg-primary/20 blur-md opacity-0 scale-75 transition-all duration-300',
  },
  variants: {
    position: {
      'top-left': { root: '-translate-x-1/2 -translate-y-1/2' },
      'top-right': { root: 'translate-x-1/2 -translate-y-1/2' },
      'bottom-left': { root: '-translate-x-1/2 translate-y-1/2' },
      'bottom-right': { root: 'translate-x-1/2 translate-y-1/2' },
      top: { root: '-translate-y-1/2' },
      bottom: { root: 'translate-y-1/2' },
      left: { root: '-translate-x-1/2' },
      right: { root: 'translate-x-1/2' },
    },
    size: {
      sm: { dot: 'w-2.5 h-2.5 border-1.5' },
      md: { dot: 'w-4 h-4 border-2' },
      lg: { dot: 'w-6 h-6 border-3' },
    },
    active: {
      true: {
        root: 'scale-110 z-50',
        glow: 'opacity-100 scale-150',
      },
    },
    customColor: {
      false: {
        dot: 'bg-primary border-white shadow-md shadow-primary/20',
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
} as const
