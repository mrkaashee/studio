export interface CropResult {
  /** X offset in original image pixels */
  x: number
  /** Y offset in original image pixels */
  y: number
  /** Width of the cropped region in original image pixels */
  width: number
  /** Height of the cropped region in original image pixels */
  height: number
  /** Cropped image as a data URL */
  dataUrl: string
}

export interface AspectPreset {
  label: string
  /** Aspect ratio (width / height). null means free crop. */
  value: number | null
}

export interface CropConfig {
  enabled?: boolean
  aspect?: number | null
  presets?: AspectPreset[]
  shape?: 'rect' | 'round'
  fixed?: boolean
  size?: number
  hideActions?: boolean
}

export type StudioTool = 'crop' | 'none'
export type CropShape = 'rect' | 'round'
