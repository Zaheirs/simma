/** Tanda SIMMA: bintang delapan sudut (motif Islami) berwarna emas dengan huruf S. Dipakai bila logo madrasah belum diunggah. */
export function BrandMark({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {filled && <rect width="48" height="48" rx="10" fill="#14532D" />}
      <g fill="none" stroke="#C9A227" strokeWidth="2">
        <rect x="11" y="11" width="26" height="26" />
        <rect x="11" y="11" width="26" height="26" transform="rotate(45 24 24)" />
      </g>
      <text x="24" y="30.5" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="17" fill="#FFFFFF">S</text>
    </svg>
  );
}
