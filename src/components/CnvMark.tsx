import Image from 'next/image'

// Official CNV logo. Square aspect (~1:1). Drop replacement at /public/cnv-logo.png to swap.
export function CnvMark({ className = 'h-7 w-auto' }: { className?: string }) {
  return (
    <Image
      src="/cnv-logo.png"
      alt="Club Nautique de Versoix"
      width={225}
      height={224}
      priority
      className={className}
    />
  )
}
