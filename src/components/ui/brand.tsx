export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-violet-600 text-lg font-black text-white shadow-lg shadow-violet-600/25">
        T
      </div>
      <span
        className={`text-lg font-bold tracking-tight ${
          inverted ? 'text-white' : 'text-zinc-950 dark:text-white'
        }`}
      >
        taskflow
      </span>
    </div>
  )
}
