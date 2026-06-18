export default function QualityCheck({ qualityCheck }) {
  return (
    <div className="bg-sage-light/20 rounded-3xl p-6 border border-sage-light/40 animate-slide-up-delay-3">
      <h3 className="font-semibold text-brown mb-4 flex items-center gap-2">
        ✅ Kvalitetskontroll
      </h3>
      <ul className="space-y-2.5">
        {qualityCheck.items.map((item, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
              ${item.ok ? 'bg-sage text-white' : 'bg-red-400 text-white'}`}>
              {item.ok ? '✓' : '✗'}
            </span>
            <span className={item.ok ? 'text-brown' : 'text-red-600'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
