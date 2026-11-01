"use client";
import { useEffect, useRef, useState } from "react";
import {
  Maximize,
  Volume2,
  VolumeX,
  HelpCircle,
  ArrowLeft,
  RotateCw,
} from "lucide-react";
import Link from "next/link";
import { definition } from "../game-engine/definitions";
import type { Round } from "../game-engine/rules";
type Props = {
  id: string;
  name: string;
  rules: string;
  balance: number | null;
  userId?: string;
  backgroundAssetId?: string;
  onBalance: (n: number) => void;
  notify: (s: string) => void;
};
export default function GamePlayer({
  id,
  name,
  rules,
  balance,
  userId,
  backgroundAssetId,
  onBalance,
  notify,
}: Props) {
  const def = definition(id),
    storageKey = "round:" + userId + ":" + id;
  const mounted = useRef(false);
  const [loadError, setLoadError] = useState("");
  const toneRef = useRef<(kind: string) => void>(() => {});
  const [phase, setPhase] = useState("");
  const [fast, setFast] = useState(false),
    [autoLeft, setAutoLeft] = useState(0);
  const container = useRef<HTMLDivElement>(null),
    stage = useRef<HTMLDivElement>(null),
    engine = useRef<import("phaser").Game | null>(null),
    audio = useRef<AudioContext | null>(null);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [stake, setStake] = useState(10),
    [sound, setSound] = useState(false),
    [help, setHelp] = useState(false),
    [round, setRound] = useState<Round | null>(null),
    [pending, setPending] = useState<{ key: string; stake: number } | null>(
      null,
    );
  useEffect(() => {
    let disposed = false;
    setReady(false);
    setPending(null);
    mounted.current = true;
    setLoadError("");
    Promise.all([
      import("../game-engine/PhaserRenderer"),
      fetch("/api/games/" + encodeURIComponent(id), { cache: "no-store" }).then(
        async (response) => {
          const data = (await response.json()) as {
            game?: { status: string; banner_asset_id?: string; config: string };
          };
          if (!response.ok || data.game?.status !== "published")
            throw new Error("这款游戏目前不可用");
          return data.game;
        },
      ),
    ])
      .then(([{ createGame }, gameData]) => {
        if (disposed || !stage.current) return;
        let symbolAssets: Record<string, string> = {};
        try {
          const config = JSON.parse(gameData.config);
          if (config.symbolAssets && typeof config.symbolAssets === "object")
            symbolAssets = config.symbolAssets;
        } catch {}
        const game = createGame(
          stage.current,
          id,
          gameData.banner_asset_id ?? backgroundAssetId,
          symbolAssets,
        );
        engine.current = game;
        game.events.once("scene-ready", () => setReady(true));
        game.events.on("round-finished", () => {
          setBusy(false);
          setPhase("");
        });
        game.events.on("reel-stopped", () => toneRef.current("stop"));
        game.events.on("bonus-stage", (label: string) => {
          setPhase(label);
          toneRef.current("bonus");
        });
      })
      .catch((error) => {
        if (!disposed) {
          setLoadError(error.message ?? "游戏加载失败");
          notify("游戏加载失败，请刷新重试");
        }
      });
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      try {
        setPending(JSON.parse(saved));
      } catch {
        sessionStorage.removeItem(storageKey);
      }
    }
    return () => {
      disposed = true;
      mounted.current = false;
      engine.current?.destroy(true);
      engine.current = null;
      audio.current?.close();
    };
  }, [id, userId, backgroundAssetId]);
  useEffect(() => {
    if (!sound) return;
    const config = def.audio;
    let index = 0;
    const timer = setInterval(() => {
      const ctx = audio.current;
      if (!ctx || ctx.state !== "running") return;
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = config.wave;
      osc.frequency.value = config.melody[index++ % config.melody.length];
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.018, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.85);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.9);
    }, config.interval);
    return () => clearInterval(timer);
  }, [sound, id]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelp(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  function tone(kind: string) {
    if (!sound) return;
    try {
      const ctx = audio.current ?? new AudioContext();
      audio.current = ctx;
      void ctx.resume();
      const config = def.audio,
        base = config.melody[0];
      const notes =
        kind === "win"
          ? [1, 1.25, 1.5, 2]
          : kind === "bonus"
            ? [1, 1.5, 2]
            : kind === "stop"
              ? [1.5]
              : [1, 0.8];
      for (let i = 0; i < notes.length; i++) {
        const osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.type = config.wave;
        osc.frequency.value = base * notes[i];
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(
          kind === "stop" ? 0.018 : 0.04,
          ctx.currentTime + i * 0.08 + 0.01,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + i * 0.08 + 0.16,
        );
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.18);
      }
    } catch {}
  }
  toneRef.current = tone;
  useEffect(() => {
    engine.current?.events.emit("animation-fast", fast);
  }, [fast, ready]);
  useEffect(() => {
    if (!autoLeft || busy || !ready) return;
    const timer = setTimeout(() => {
      setAutoLeft((n) => Math.max(0, n - 1));
      void spin();
    }, 650);
    return () => clearTimeout(timer);
  }, [autoLeft, busy, ready]);
  async function spin() {
    if (busy || !ready) return;
    if (balance === null) {
      setAutoLeft(0);
      notify("请先登录后体验游戏");
      return;
    }
    if (!pending && balance < stake) {
      setAutoLeft(0);
      notify("积分不足，自动运行已停止");
      return;
    }
    let shouldRetry = true;
    const request = pending ?? { key: crypto.randomUUID(), stake };
    sessionStorage.setItem(storageKey, JSON.stringify(request));
    setPending(request);
    setBusy(true);
    setPhase("正在旋转…");
    engine.current?.events.emit("spin-start");
    tone("spin");
    try {
      const response = await fetch("/api/play/" + id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stake: request.stake, requestKey: request.key }),
      });
      const data = (await response.json()) as {
        error: string;
        round: Round;
        user: { id: string; balance: number } | null;
      };
      if (!mounted.current) {
        if (response.ok) sessionStorage.removeItem(storageKey);
        return;
      }
      if (!response.ok) {
        if (response.status < 500) {
          shouldRetry = false;
          setPending(null);
          sessionStorage.removeItem(storageKey);
        }
        throw new Error(data.error);
      }
      setPending(null);
      sessionStorage.removeItem(storageKey);
      setRound(data.round);
      setPhase(data.round.feature);
      if (data.user && data.user.id === userId) onBalance(data.user.balance);
      else {
        setAutoLeft(0);
        notify("本局已记录，请刷新登录状态");
      }
      engine.current?.events.emit("spin-result", data.round);
      if (data.round.reward > 0) tone("win");
    } catch (error) {
      if (!mounted.current) return;
      engine.current?.events.emit("spin-cancel");
      setBusy(false);
      setPhase("");
      setAutoLeft(0);
      notify(
        (error as Error).message +
          (shouldRetry ? "；可用相同请求ID重试本局" : ""),
      );
    }
  }
  return (
    <div className="player" ref={container}>
      <div className="player-top">
        <Link href={"/game/" + id}>
          <ArrowLeft size={18} />
          退出游戏
        </Link>
        <strong>{name}</strong>
        <span className="chip">原创演示</span>
      </div>
      <div className="game-stage" ref={stage}>
        {!ready && (
          <div className="loading">{loadError || "正在加载独立游戏引擎…"}</div>
        )}
      </div>
      <div className="player-result">
        {round ? (
          <>
            <span aria-live="polite">{phase || round.feature}</span>
            <strong>
              {round.reward > 0
                ? `获得 ${round.reward.toLocaleString()} 积分`
                : "继续探索下一次惊喜"}
            </strong>
          </>
        ) : (
          <>
            <span aria-live="polite">
              {phase || "每一次旋转，开启新的故事"}
            </span>
            <strong>准备就绪</strong>
          </>
        )}
      </div>
      <div className="player-controls">
        <div>
          <small>可用积分</small>
          <b>{balance?.toLocaleString("zh-CN", {minimumFractionDigits:2,maximumFractionDigits:2}) ?? "请先登录"}</b>
        </div>
        <label>
          <small>本局积分</small>
          <select
            value={pending?.stake ?? stake}
            disabled={busy || !!pending}
            onChange={(e) => setStake(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <button className="gold spin" disabled={busy || !ready} onClick={spin}>
          <RotateCw size={22} className={busy ? "rotating" : ""} />
          {busy ? "进行中…" : pending ? "重试本局" : "开始游戏"}
        </button>
        <button
          className="icon-button"
          aria-label="音效开关"
          onClick={() => {
            if (!sound) {
              try {
                audio.current ??= new AudioContext();
                void audio.current.resume();
              } catch {
                notify("浏览器音频不可用");
              }
            }
            setSound(!sound);
          }}
        >
          {sound ? <Volume2 /> : <VolumeX />}
        </button>
        <button
          className="icon-button"
          aria-label="全屏"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else
              void container.current
                ?.requestFullscreen()
                .catch(() => notify("浏览器不支持全屏"));
          }}
        >
          <Maximize />
        </button>
        <button
          className="icon-button"
          aria-label="游戏规则"
          onClick={() => setHelp(true)}
        >
          <HelpCircle />
        </button>
      </div>
      <div className="game-options">
        <button
          className="outline"
          disabled={!ready || (!!pending && !busy) || balance === null}
          onClick={() => setAutoLeft((n) => (n ? 0 : 10))}
        >
          {autoLeft ? `停止自动（余${autoLeft}局）` : "自动10局"}
        </button>
        <button
          className="outline"
          onClick={() => setFast(!fast)}
          aria-pressed={fast}
        >
          {fast ? "快速动画：开" : "快速动画：关"}
        </button>
        <button
          className="outline"
          disabled={!busy}
          onClick={() => engine.current?.events.emit("animation-stop")}
        >
          跳过动画
        </button>
        <Link className="outline" href="/profile/records">
          游戏记录
        </Link>
      </div>
      <p className="disclaimer">
        自动运行最多10局，每局消耗{stake}
        积分；免费揭示如有已合并在本局结果内，不会额外扣分。
      </p>
      <p className="disclaimer">
        积分仅用于体验，无现金价值。原创规则不代表任何授权游戏的原版规则。
      </p>
      {help && (
        <div className="modal-overlay" onClick={() => setHelp(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="游戏规则"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close" onClick={() => setHelp(false)}>
              ×
            </button>
            <h2>{name} · 规则</h2>
            <p>{rules}</p>
            <p>{def.rules}</p>
            <p>
              图标按顺序从0编号：{def.symbols.join(" / ")}
              。每局积分为10/20/50/100；免费阶段仅在规则注明时存在。无充值、提现或现金兑换。所有阶段由服务端同次计算并原子记账。
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
