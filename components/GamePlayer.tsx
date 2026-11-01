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
import goldenAudio from "../games/golden-god/audio/config";
import dragonAudio from "../games/dragon-world/audio/config";
import phoenixAudio from "../games/phoenix-legend/audio/config";
import type { Round } from "../game-engine/rules";
type Props = {
  id: string;
  name: string;
  rules: string;
  balance: number | null;
  onBalance: (n: number) => void;
  notify: (s: string) => void;
};
export default function GamePlayer({
  id,
  name,
  rules,
  balance,
  onBalance,
  notify,
}: Props) {
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
    import("../game-engine/PhaserRenderer")
      .then(({ createGame }) => {
        if (disposed || !stage.current) return;
        const game = createGame(stage.current, id);
        engine.current = game;
        game.events.once("scene-ready", () => setReady(true));
        game.events.on("round-finished", () => setBusy(false));
      })
      .catch(() => notify("游戏引擎加载失败，请刷新重试"));
    const saved = sessionStorage.getItem("round:" + id);
    if (saved) {
      try {
        setPending(JSON.parse(saved));
      } catch {
        sessionStorage.removeItem("round:" + id);
      }
    }
    return () => {
      disposed = true;
      engine.current?.destroy(true);
      engine.current = null;
      audio.current?.close();
    };
  }, [id]);
  useEffect(() => {
    if (!sound) return;
    const config =
      id === "golden-god"
        ? goldenAudio
        : id === "dragon-world"
          ? dragonAudio
          : phoenixAudio;
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
  function tone(win: boolean) {
    if (!sound) return;
    try {
      const ctx = audio.current ?? new AudioContext();
      audio.current = ctx;
      void ctx.resume();
      const base =
        id === "golden-god" ? 392 : id === "dragon-world" ? 294 : 523;
      for (let i = 0; i < (win ? 5 : 2); i++) {
        const osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.type = id === "dragon-world" ? "triangle" : "sine";
        osc.frequency.value =
          base * (win ? [1, 1.25, 1.5, 2, 2.5][i] : 1 + i * 0.25);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(
          0.06,
          ctx.currentTime + i * 0.1 + 0.02,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + i * 0.1 + 0.25,
        );
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.3);
      }
    } catch {}
  }
  async function spin() {
    if (busy || !ready) return;
    if (balance === null) {
      notify("请先登录后体验游戏");
      return;
    }
    const request = pending ?? { key: crypto.randomUUID(), stake };
    sessionStorage.setItem("round:" + id, JSON.stringify(request));
    setPending(request);
    setBusy(true);
    engine.current?.events.emit("spin-start");
    tone(false);
    try {
      const response = await fetch("/api/play/" + id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stake: request.stake, requestKey: request.key }),
      });
      const data = (await response.json()) as {
        error: string;
        round: Round;
        user: { balance: number };
      };
      if (!response.ok) {
        if (response.status < 500) {
          setPending(null);
          sessionStorage.removeItem("round:" + id);
        }
        throw new Error(data.error);
      }
      setPending(null);
      sessionStorage.removeItem("round:" + id);
      setRound(data.round);
      onBalance(data.user.balance);
      engine.current?.events.emit("spin-result", data.round);
      tone(data.round.reward > 0);
    } catch (error) {
      engine.current?.events.emit("spin-cancel");
      setBusy(false);
      notify((error as Error).message + "；网络异常可点击重试，保留原请求ID");
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
        {!ready && <div className="loading">正在加载独立游戏引擎…</div>}
      </div>
      <div className="player-result">
        {round ? (
          <>
            <span>{round.feature}</span>
            <strong>
              {round.reward > 0
                ? `获得 ${round.reward.toLocaleString()} 积分`
                : "继续探索下一次惊喜"}
            </strong>
          </>
        ) : (
          <>
            <span>每一次旋转，开启新的故事</span>
            <strong>准备就绪</strong>
          </>
        )}
      </div>
      <div className="player-controls">
        <div>
          <small>可用积分</small>
          <b>{balance?.toLocaleString() ?? "请先登录"}</b>
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
            <p>
              单局消耗可选10/20/50/100。黄金财神符号倍率为2/3/4/5/7/10/15/20，每条命中线独立累加；龙腾图标倍率为1/2/3/4/5/6/8/10，奖励=向下取整(积分×路数×图标倍率×(连续列数−2)/3)；凤凰集群奖励=积分×(群大小−4)×(图标序号+1)×连消轮次。完整参数见源码独立规则文件。
            </p>
            <p>没有免费局、充值、提现或现金兑换。服务端决定结果并原子记账。</p>
          </section>
        </div>
      )}
    </div>
  );
}
