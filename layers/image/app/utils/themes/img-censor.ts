export default {
  slots: {
    root: '',
    sidebar: 'space-y-4',
    header: 'flex items-center justify-between',
    title: 'text-[10px] font-bold uppercase tracking-widest text-muted',
    modeGrid: 'grid grid-cols-2 gap-2',
    modeButton: '',
    controls: 'space-y-3',
    propRow: 'flex items-center justify-between',
    propTitle: 'text-[10px] text-muted uppercase font-medium',
    propValue: 'text-[10px] text-muted uppercase font-medium',
    propStack: 'space-y-1.5',
    actionButtons: 'flex gap-2',
    overlay: 'absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair overflow-visible',
    box: 'absolute pointer-events-auto cursor-move group contain-[layout_size_style] [will-change:transform,width,height] outline-dashed outline-[var(--outline-width)] outline-white/50 transition-[outline] duration-200',
    deleteButton: 'absolute pointer-events-auto bg-black text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-500 transition-colors z-50 shadow-lg',
    selectionHighlight: 'absolute inset-0 border-transparent transition-all duration-200',
  } as const,
  variants: {
    interacting: {
      true: {
        selectionHighlight: 'bg-primary/30 border-primary',
      },
    },
    active: {
      true: {
        box: 'outline-solid outline-[var(--active-outline)] outline-white/90 shadow-[0_0_0_var(--shadow-width)_black,0_0_0_4000px_rgba(0,0,0,0.4)]',
      },
      false: {
        box: 'shadow-none',
      },
    },
    blur: {
      true: {},
    },
    pixelate: {
      true: {},
    },
  } as const,
  compoundVariants: [
    {
      active: true,
      interacting: false,
      blur: true,
      class: {
        box: 'backdrop-blur-[var(--intensity)]',
      },
    },
    {
      active: true,
      interacting: false,
      pixelate: true,
      class: {
        box: 'backdrop-blur-[var(--pixel-intensity)] contrast-[200%] grayscale-[50%]',
      },
    },
  ],
}
