export default {
  slots: {
    root: 'relative w-full h-full overflow-hidden bg-black select-none touch-none',
    afterImage: 'absolute inset-0 w-full h-full object-contain pointer-events-none',
    beforeWrapper: 'absolute inset-0 w-full h-full overflow-hidden pointer-events-none',
    beforeImage: 'absolute inset-0 w-full h-full object-contain pointer-events-none',
    slider: 'absolute inset-y-0 w-12 -ml-6 cursor-ew-resize flex items-center justify-center z-10 pointer-events-auto',
    divider: 'w-0.5 h-full bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)]',
    handle: 'absolute w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center border-4 border-white/20 backdrop-blur-sm',
    handleIcon: 'flex gap-0.5',
    handleBar: 'w-0.5 h-3 bg-neutral-400 rounded-full',
    labelBefore: 'absolute top-4 left-4 pointer-events-none z-20',
    labelAfter: 'absolute top-4 right-4 pointer-events-none z-20',
    badge: 'opacity-80 backdrop-blur-sm',
    hintWrapper: 'absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-20 transition-opacity duration-300',
    hint: 'text-[10px] uppercase tracking-widest text-white/60 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm',
  },
} as const
