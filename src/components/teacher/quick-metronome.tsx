"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Minus, Pause, Play, Plus, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

const MIN_BPM = 40
const MAX_BPM = 240
const BEATS_PER_BAR = 4

function clamp(value: number) {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)))
}

export function QuickMetronome({
  initialBpm = 90,
  className,
}: {
  initialBpm?: number | null
  className?: string
}) {
  const start = clamp(initialBpm ?? 90)
  const [bpm, setBpm] = useState(start)
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)

  const audioRef = useRef<AudioContext | null>(null)
  const nextNoteRef = useRef(0)
  const beatRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bpmRef = useRef(bpm)
  const volumeRef = useRef(volume)
  const tapsRef = useRef<number[]>([])

  bpmRef.current = bpm
  volumeRef.current = muted ? 0 : volume

  useEffect(() => {
    setBpm(clamp(initialBpm ?? 90))
  }, [initialBpm])

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setPlaying(false)
    setBeat(0)
    beatRef.current = 0
  }, [])

  useEffect(() => {
    if (!playing) return

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    const ctx = audioRef.current ?? new AudioCtx()
    audioRef.current = ctx
    void ctx.resume()

    nextNoteRef.current = ctx.currentTime + 0.05
    beatRef.current = 0

    const playClick = (time: number, accent: boolean) => {
      const peak = (accent ? 0.7 : 0.45) * volumeRef.current
      if (peak <= 0.0001) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = accent ? 1100 : 820
      gain.gain.setValueAtTime(0.0001, time)
      gain.gain.exponentialRampToValueAtTime(peak, time + 0.001)
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(time)
      osc.stop(time + 0.06)
    }

    timerRef.current = setInterval(() => {
      const secondsPerBeat = 60 / bpmRef.current
      while (nextNoteRef.current < ctx.currentTime + 0.1) {
        const current = beatRef.current % BEATS_PER_BAR
        playClick(nextNoteRef.current, current === 0)
        const scheduledBeat = current
        const delay = (nextNoteRef.current - ctx.currentTime) * 1000
        window.setTimeout(() => setBeat(scheduledBeat), Math.max(0, delay))
        nextNoteRef.current += secondsPerBeat
        beatRef.current += 1
      }
    }, 25)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [playing])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      void audioRef.current?.close()
    }
  }, [])

  const toggle = () => (playing ? stop() : setPlaying(true))

  const tap = () => {
    const now = performance.now()
    const taps = tapsRef.current.filter((t) => now - t < 2000)
    taps.push(now)
    tapsRef.current = taps
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i])
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
      setBpm(clamp(Math.round(60000 / avg)))
    }
  }

  return (
    <section
      aria-label="Metrônomo rápido"
      className={cn(
        "flex h-full min-h-[28rem] flex-col justify-between gap-6 rounded-2xl bg-[#0B1220] p-6 text-white shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Metrônomo</h2>
          <p className="text-xs text-[#94A3B8]">Sem anúncio, pronto pra aula</p>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: BEATS_PER_BAR }).map((_, index) => (
            <span
              key={index}
              className={
                "size-2 rounded-full transition-colors " +
                (playing && beat === index
                  ? index === 0
                    ? "bg-[#8B5CF6]"
                    : "bg-[#3B82F6]"
                  : "bg-white/15")
              }
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="Diminuir BPM"
          onClick={() => setBpm((value) => clamp(value - 1))}
          className="flex size-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
        >
          <Minus className="size-4" />
        </button>
        <div className="text-center">
          <span className="block text-6xl font-semibold leading-none tracking-tight tabular-nums">
            {bpm}
          </span>
          <span className="text-xs text-[#94A3B8]">BPM</span>
        </div>
        <button
          type="button"
          aria-label="Aumentar BPM"
          onClick={() => setBpm((value) => clamp(value + 1))}
          className="flex size-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <input
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        value={bpm}
        aria-label="Ajustar BPM"
        onChange={(event) => setBpm(clamp(Number(event.target.value)))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#3B82F6]"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={muted || volume === 0 ? "Ativar som" : "Silenciar"}
          onClick={() => setMuted((value) => !value)}
          className="shrink-0 text-[#94A3B8] transition-colors hover:text-white"
        >
          {muted || volume === 0 ? (
            <VolumeX className="size-4" />
          ) : (
            <Volume2 className="size-4" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((muted ? 0 : volume) * 100)}
          aria-label="Volume"
          onChange={(event) => {
            setVolume(Number(event.target.value) / 100)
            setMuted(false)
          }}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#3B82F6]"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggle}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3B82F6] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3B82F6]/90"
        >
          {playing ? (
            <>
              <Pause className="size-4" /> Parar
            </>
          ) : (
            <>
              <Play className="size-4" /> Tocar
            </>
          )}
        </button>
        <button
          type="button"
          onClick={tap}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          Tap
        </button>
      </div>
    </section>
  )
}
