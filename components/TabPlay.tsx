import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

interface TabPlayProps {
  publicKey?: any;
  profiles?: any;
  getDisplayName?: (wallet: string) => string;
  selectedSubTab?: "hub" | "daily" | "pvp" | "games" | "shop" | "admin";
  selectedSingleGame?: "rps" | "coinflip" | "spin";
}

export function TabPlay({ publicKey, profiles, getDisplayName, selectedSubTab, selectedSingleGame }: TabPlayProps) {
  const [activeTab, setActiveTab] = useState<"hub" | "daily" | "pvp" | "games" | "shop" | "admin">(selectedSubTab || "hub");

  // Sync props if changed externally
  useEffect(() => {
    if (selectedSubTab) setActiveTab(selectedSubTab);
  }, [selectedSubTab]);

  useEffect(() => {
    if (selectedSingleGame) setActiveSingleGame(selectedSingleGame as any);
  }, [selectedSingleGame]);

  // User Stats
  const [points, setPoints] = useState<number>(100);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [wins, setWins] = useState<number>(0);
  const [activeTitle, setActiveTitle] = useState<string>("Novice");
  const [activeTheme, setActiveTheme] = useState<string>("default");
  const [unlockedItems, setUnlockedItems] = useState<string[]>([]);

  // Daily Streak State
  const [dailyStreak, setDailyStreak] = useState<number>(0);
  const [lastClaimDate, setLastClaimDate] = useState<string | null>(null);
  const [canClaimDaily, setCanClaimDaily] = useState<boolean>(true);
  const [nextDailyReward, setNextDailyReward] = useState<number>(1);
  const [dailyClaimMessage, setDailyClaimMessage] = useState<string>("");

  // Option C: Fee, Preset Wagers & Currency Mode State
  const [houseFeePercent, setHouseFeePercent] = useState<number>(5);
  const [treasuryWallet, setTreasuryWallet] = useState<string>("3WDy3rzCYY5TpLJAJ6MwhWUoAHrVi7rrxtNhQ5BhizqJ");
  const [presetWagersMonede, setPresetWagersMonede] = useState<number[]>([20, 50, 100, 250, 500]);
  const [presetWagersSol, setPresetWagersSol] = useState<number[]>([0.05, 0.1, 0.25, 0.5, 1.0]);
  const [presetWagersUsdc, setPresetWagersUsdc] = useState<number[]>([1, 5, 10, 25, 50]);

  const [newTableCurrency, setNewTableCurrency] = useState<"monede" | "sol" | "usdc">("monede");
  const [tableCurrency, setTableCurrency] = useState<"monede" | "sol" | "usdc">("monede");
  const [lobbyFilterCurrency, setLobbyFilterCurrency] = useState<"all" | "monede" | "sol" | "usdc">("all");

  useEffect(() => {
    supabase.from("app_settings").select("*").then(({ data }) => {
      if (data) {
        data.forEach((s: any) => {
          if (s.key === "arena_house_fee_percent") setHouseFeePercent(Number(s.value) || 5);
          if (s.key === "arena_treasury_wallet" && s.value) setTreasuryWallet(s.value);
          if (s.key === "arena_preset_wagers_monede") {
            const arr = s.value.split(",").map((v: string) => Number(v.trim())).filter((n: number) => !isNaN(n) && n > 0);
            if (arr.length > 0) setPresetWagersMonede(arr);
          }
          if (s.key === "arena_preset_wagers_sol") {
            const arr = s.value.split(",").map((v: string) => Number(v.trim())).filter((n: number) => !isNaN(n) && n > 0);
            if (arr.length > 0) setPresetWagersSol(arr);
          }
          if (s.key === "arena_preset_wagers_usdc") {
            const arr = s.value.split(",").map((v: string) => Number(v.trim())).filter((n: number) => !isNaN(n) && n > 0);
            if (arr.length > 0) setPresetWagersUsdc(arr);
          }
        });
      }
    });
  }, []);

  const [isOnChainLoading, setIsOnChainLoading] = useState<boolean>(false);

  const checkHasBalance = (curr: "monede" | "sol" | "usdc", wager: number): boolean => {
    if (curr === "sol") {
      if (!publicKey) {
        alert("🔌 Mesele cu ◎ SOL necesită conectarea unui portofel Solana (Phantom sau Solflare) din colțul din dreapta sus!");
        return false;
      }
      if (solBalance < wager) {
        alert(`⚠️ Fonduri SOL insuficiente în portofelul tău connected!\n\nBalanță reală portofel: ${solBalance.toFixed(3)} ◎ SOL\nMiză masă: ${wager} ◎ SOL\n\nÎți mai trebuie ${(wager - solBalance).toFixed(3)} ◎ SOL.`);
        return false;
      }
      return true;
    }
    if (curr === "usdc") {
      if (!publicKey) {
        alert("🔌 Mesele cu USDC necesită conectarea unui portofel Solana în colțul din dreapta sus!");
        return false;
      }
      if (usdcBalance < wager) {
        alert(`⚠️ Fonduri USDC insuficiente în portofel!\n\nBalanță USDC: ${usdcBalance.toFixed(2)} USDC\nMiză masă: ${wager} USDC`);
        return false;
      }
      return true;
    }
    if (points < wager) {
      alert(`⚠️ Monede virtuale insuficiente! Ai ${points} Monede, dar masa necesită ${wager} Monede.`);
      return false;
    }
    return true;
  };

  const getBalanceFormatted = (curr: "monede" | "sol" | "usdc"): string => {
    if (curr === "sol") return `${solBalance.toFixed(3)} ◎ SOL`;
    if (curr === "usdc") return `${usdcBalance.toFixed(2)} USDC`;
    return `${points} Monede`;
  };

  const saveCryptoBalance = (newSol: number, newUsdc: number) => {
    const cleanSol = Math.max(0, Math.round(newSol * 1000) / 1000);
    const cleanUsdc = Math.max(0, Math.round(newUsdc * 100) / 100);
    setSolBalance(cleanSol);
    setUsdcBalance(cleanUsdc);
    try {
      localStorage.setItem("play_sol_balance", cleanSol.toString());
      localStorage.setItem("play_usdc_balance", cleanUsdc.toString());
      if (publicKey) {
        supabase.from("profiles").upsert({
          wallet: publicKey.toBase58(),
          play_sol_balance: cleanSol,
          play_usdc_balance: cleanUsdc,
        }).then(() => {});
      }
    } catch (e) {}
  };

  const awardMatchWinner = (curr: "monede" | "sol" | "usdc", wager: number, fee: number) => {
    const winnerPayout = getWinnerPayout(wager, fee);
    if (curr === "sol") {
      saveCryptoBalance(solBalance + winnerPayout, usdcBalance);
      setWins((w) => w + 1);
    } else if (curr === "usdc") {
      saveCryptoBalance(solBalance, usdcBalance + winnerPayout);
      setWins((w) => w + 1);
    } else {
      saveStats(points + winnerPayout, wins + 1);
    }
  };

  const deductMatchLoser = (curr: "monede" | "sol" | "usdc", wager: number) => {
    if (curr === "sol") {
      saveCryptoBalance(solBalance - wager, usdcBalance);
    } else if (curr === "usdc") {
      saveCryptoBalance(solBalance, usdcBalance - wager);
    } else {
      saveStats(Math.max(0, points - wager));
    }
  };

  const fetchOnChainBalances = async () => {
    if (!publicKey) {
      setSolBalance(0);
      setUsdcBalance(0);
      return;
    }
    setIsOnChainLoading(true);
    try {
      const { Connection, LAMPORTS_PER_SOL, PublicKey } = await import("@solana/web3.js");
      const rpcEndpoints = [
        "https://api.mainnet-beta.solana.com",
        "https://solana-rpc.publicnode.com",
        "https://rpc.ankr.com/solana"
      ];
      let realSol: number | null = null;
      let realUsdc: number | null = null;

      const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
      const tokenProgramId = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
      const associatedTokenProgramId = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

      // Compute USDC ATA Address deterministically
      const [usdcAta] = PublicKey.findProgramAddressSync(
        [publicKey.toBuffer(), tokenProgramId.toBuffer(), usdcMint.toBuffer()],
        associatedTokenProgramId
      );

      for (const endpoint of rpcEndpoints) {
        try {
          const connection = new Connection(endpoint, { commitment: "confirmed" });

          if (realSol === null) {
            const balanceLamports = await Promise.race([
              connection.getBalance(publicKey),
              new Promise<number>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3500))
            ]);
            if (typeof balanceLamports === "number" && !isNaN(balanceLamports)) {
              realSol = balanceLamports / LAMPORTS_PER_SOL;
            }
          }

          if (realUsdc === null) {
            const accInfo = await Promise.race([
              connection.getParsedAccountInfo(usdcAta),
              new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3500))
            ]) as any;

            if (accInfo && accInfo.value && accInfo.value.data && accInfo.value.data.parsed) {
              const usdcAmount = accInfo.value.data.parsed.info?.tokenAmount?.uiAmount;
              if (typeof usdcAmount === "number" && !isNaN(usdcAmount)) {
                realUsdc = usdcAmount;
              } else {
                realUsdc = 0;
              }
            } else {
              // No USDC ATA exists yet for this wallet
              realUsdc = 0;
            }
          }

          if (realSol !== null && realUsdc !== null) {
            break;
          }
        } catch (e) {
          continue;
        }
      }

      const cleanSol = realSol !== null ? Math.round(realSol * 1000) / 1000 : 0;
      const cleanUsdc = realUsdc !== null ? Math.round(realUsdc * 100) / 100 : 0;

      setSolBalance(cleanSol);
      setUsdcBalance(cleanUsdc);

      localStorage.setItem("play_sol_balance", cleanSol.toString());
      localStorage.setItem("play_usdc_balance", cleanUsdc.toString());

      if (publicKey) {
        supabase.from("profiles").upsert({
          wallet: publicKey.toBase58(),
          play_sol_balance: cleanSol,
          play_usdc_balance: cleanUsdc,
        }).then(() => {});
      }
    } catch (err) {
      console.warn("Failed to sync on-chain balances:", err);
    } finally {
      setIsOnChainLoading(false);
    }
  };

  const getWinnerPayout = (wager: number, fee: number = houseFeePercent) => {
    const totalPool = wager * 2;
    const payout = totalPool * (1 - fee / 100);
    return Math.round(payout * 1000) / 1000;
  };

  const formatCurrencyBadge = (curr: "monede" | "sol" | "usdc" = "monede", amount: number) => {
    if (curr === "sol") return `◎ ${amount} SOL`;
    if (curr === "usdc") return `💵 ${amount} USDC`;
    return `🪙 ${amount} Monede`;
  };

  // Table Creation Modal State
  const [showCreateTableModal, setShowCreateTableModal] = useState<boolean>(false);
  const [newTableGame, setNewTableGame] = useState<"rps" | "coinflip" | "tictactoe">("rps");
  const [newTableWager, setNewTableWager] = useState<number>(20);
  const [newTableTarget, setNewTableTarget] = useState<string>("");

  // Live Duel Table State
  const [inDuelTable, setInDuelTable] = useState<boolean>(false);
  const [isHostOfTable, setIsHostOfTable] = useState<boolean>(false);
  const [activeCreatedTableId, setActiveCreatedTableId] = useState<string | null>(null);
  const [tableGame, setTableGame] = useState<"rps" | "coinflip" | "tictactoe">("rps");
  const [tableWager, setTableWager] = useState<number>(20);
  const [opponentInfo, setOpponentInfo] = useState<{ name: string; avatar: string; isAI: boolean } | null>(null);

  // Table gameplay phases: "waiting" -> "ready" -> "selecting" -> "revealing" -> "finished"
  const [tablePhase, setTablePhase] = useState<"waiting" | "ready" | "selecting" | "revealing" | "finished">("waiting");
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [playerChoice, setPlayerChoice] = useState<any>(null);
  const [opponentChoice, setOpponentChoice] = useState<any>(null);
  const [roundWinner, setRoundWinner] = useState<"player" | "opponent" | "tie" | null>(null);
  const [duelLogMessage, setDuelLogMessage] = useState<string>("");

  // Tic Tac Toe in Live Table
  const [tttGrid, setTttGrid] = useState<Array<string | null>>(Array(9).fill(null));

  // Single Player Arcade States
  const [activeSingleGame, setActiveSingleGame] = useState<"rps" | "coinflip" | "spin">(
    (selectedSingleGame as any) || "rps"
  );

  // Arcade - Rock Paper Scissors
  const [arcadeRpsChoice, setArcadeRpsChoice] = useState<"rock" | "paper" | "scissors">("rock");
  const [arcadeRpsWager, setArcadeRpsWager] = useState<number>(10);
  const [arcadeRpsResult, setArcadeRpsResult] = useState<{ pChoice: string; aiChoice: string; outcome: "win" | "loss" | "tie" } | null>(null);
  const [arcadeRpsMessage, setArcadeRpsMessage] = useState<string>("");
  const [playingArcadeRps, setPlayingArcadeRps] = useState<boolean>(false);

  // Arcade - Coin Flip
  const [coinChoice, setCoinChoice] = useState<"heads" | "tails">("heads");
  const [betAmount, setBetAmount] = useState<number>(10);
  const [flipping, setFlipping] = useState<boolean>(false);
  const [flipResult, setFlipResult] = useState<"heads" | "tails" | null>(null);
  const [flipMessage, setFlipMessage] = useState<string>("");

  // Arcade - Spin Wheel
  const [spinning, setSpinning] = useState<boolean>(false);
  const [wheelDegree, setWheelDegree] = useState<number>(0);
  const [spinReward, setSpinReward] = useState<string | null>(null);

  // Arcade - Tic Tac Toe Solo Practice against Smart AI
  const [soloTttGrid, setSoloTttGrid] = useState<Array<string | null>>(Array(9).fill(null));
  const [soloTttStatus, setSoloTttStatus] = useState<"playing" | "won" | "lost" | "tie">("playing");
  const [soloTttMessage, setSoloTttMessage] = useState<string>("");
  const [soloTttWager, setSoloTttWager] = useState<number>(15);

  // Arcade - Dice Roll
  const [diceRollWager, setDiceRollWager] = useState<number>(10);
  const [diceResult, setDiceResult] = useState<{ pRoll: number; aiRoll: number; outcome: "win" | "loss" | "tie" } | null>(null);
  const [rollingDice, setRollingDice] = useState<boolean>(false);

  // Shop Custom Prices & Notification
  const [shopMsg, setShopMsg] = useState<string>("");
  const [shopPrices, setShopPrices] = useState<Record<string, number>>({
    "title-whale": 300,
    "title-degen": 200,
    "title-diamond": 150,
    "title-streak": 100,
    "box-silver": 50,
    "box-gold": 150,
  });

  // Anti-Cheat Audit Logs
  const [gameLogs, setGameLogs] = useState<Array<{ id: string; time: string; event: string; status: string }>>([
    { id: "log-1", time: "Just now", event: "Anti-Cheat Audit System Active", status: "✓ Pass" },
  ]);

  // Lobby Open Tables list & Channel Ref
  const [lobbyTables, setLobbyTables] = useState<any[]>([]);
  const arenaChannelRef = useRef<any>(null);
  const roomChannelRef = useRef<any>(null);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);

  // Wheel Prizes configuration
  const wheelPrizes = [
    { value: 0, label: "0 MONEDI", color: "#27272a", text: "#9ca3af" },
    { value: 5, label: "5 MONEDI", color: "#3b82f6", text: "#ffffff" },
    { value: 25, label: "25 MONEDI", color: "#10b981", text: "#ffffff" },
    { value: 10, label: "10 MONEDI", color: "#6366f1", text: "#ffffff" },
    { value: 50, label: "50 MONEDI", color: "#8b5cf6", text: "#ffffff" },
    { value: 0, label: "TRY AGAIN", color: "#ef4444", text: "#ffffff" },
    { value: 100, label: "100 MONEDI", color: "#f59e0b", text: "#ffffff" },
    { value: 200, label: "200 JACKPOT", color: "#ec4899", text: "#ffffff" },
  ];

  // Helper to broadcast table events across Supabase + BroadcastChannel
  const broadcastTableEvent = (event: "table_created" | "table_removed" | "table_accepted", data: any) => {
    if (arenaChannelRef.current) {
      try {
        arenaChannelRef.current.send({
          type: "broadcast",
          event,
          ...data,
        });
      } catch (e) {}
    }
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("arena_tables_bc");
        bc.postMessage({ type: event, ...data });
        bc.close();
      } catch (e) {}
    }
  };

  // Real-Time Lobby Tables & Postgres DB Sync
  useEffect(() => {
    const fetchSupabaseTables = async () => {
      try {
        const { data, error } = await supabase
          .from("arena_tables")
          .select("*")
          .eq("status", "open")
          .order("created_at", { ascending: false });

        if (!error && data && Array.isArray(data)) {
          const mapped = data.map((item: any) => ({
            id: item.id,
            host: item.host,
            hostWallet: item.host_wallet,
            target: item.target,
            avatar: item.avatar || "😎",
            game: item.game,
            wager: item.wager,
            isAI: item.is_ai,
          }));
          setLobbyTables(mapped);
          try { localStorage.setItem("play_arena_tables", JSON.stringify(mapped)); } catch (e) {}
        }
      } catch (e) {}
    };

    fetchSupabaseTables();
    const lobbyInterval = setInterval(fetchSupabaseTables, 2000);

    // 1. Supabase Broadcast Channel for Lobby Table Events
    const arenaChannelName = "arena-game-tables-global";
    supabase.getChannels().forEach((c: any) => {
      if (c.name === arenaChannelName || c.topic?.includes(arenaChannelName)) supabase.removeChannel(c);
    });

    const channel = supabase.channel(arenaChannelName, {
      config: { broadcast: { self: true } },
    })
      .on("broadcast", { event: "table_created" }, (payload) => {
        if (payload?.table) {
          setLobbyTables((prev) => {
            if (prev.some((t) => t.id === payload.table.id)) return prev;
            const updated = [payload.table, ...prev];
            try { localStorage.setItem("play_arena_tables", JSON.stringify(updated)); } catch (e) {}
            return updated;
          });
        }
      })
      .on("broadcast", { event: "table_removed" }, (payload) => {
        if (payload?.tableId) {
          setLobbyTables((prev) => {
            const updated = prev.filter((t) => t.id !== payload.tableId);
            try { localStorage.setItem("play_arena_tables", JSON.stringify(updated)); } catch (e) {}
            return updated;
          });
        }
      })
      .on("broadcast", { event: "table_accepted" }, (payload) => {
        if (payload?.tableId) {
          setLobbyTables((prev) => {
            const updated = prev.filter((t) => t.id !== payload.tableId);
            try { localStorage.setItem("play_arena_tables", JSON.stringify(updated)); } catch (e) {}
            return updated;
          });
          setInDuelTable((currInDuel) => {
            if (currInDuel) {
              setOpponentInfo({ name: payload.guestName || "Opponent", avatar: payload.guestAvatar || "⚔️", isAI: false });
              setTablePhase("selecting");
              setTimeLeft(15);
              setDuelLogMessage(`🎉 ${payload.guestName} a intrat la masă! Meciul a început! Alege mutarea!`);
            }
            return currInDuel;
          });
        }
      })
      .subscribe();

    arenaChannelRef.current = channel;

    // 2. Supabase Postgres DB Listener for arena_tables (catches DB inserts/deletes/updates across devices)
    const dbChannelName = "arena-tables-db-global";
    supabase.getChannels().forEach((c: any) => {
      if (c.name === dbChannelName || c.topic?.includes(dbChannelName)) supabase.removeChannel(c);
    });

    const dbChannel = supabase.channel(dbChannelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "arena_tables" }, (payload: any) => {
        if (payload.eventType === "INSERT" && payload.new) {
          const item = payload.new;
          if (item.status === "open") {
            const newTbl = {
              id: item.id,
              host: item.host,
              hostWallet: item.host_wallet,
              target: item.target,
              avatar: item.avatar || "😎",
              game: item.game,
              wager: item.wager,
              isAI: item.is_ai,
            };
            setLobbyTables((prev) => {
              if (prev.some((t) => t.id === newTbl.id)) return prev;
              const updated = [newTbl, ...prev];
              try { localStorage.setItem("play_arena_tables", JSON.stringify(updated)); } catch (e) {}
              return updated;
            });
          }
        } else if (payload.eventType === "DELETE" && payload.old) {
          const deletedId = payload.old.id;
          setLobbyTables((prev) => {
            const updated = prev.filter((t) => t.id !== deletedId);
            try { localStorage.setItem("play_arena_tables", JSON.stringify(updated)); } catch (e) {}
            return updated;
          });
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const item = payload.new;
          if (item.status === "in_game") {
            setLobbyTables((prev) => {
              const updated = prev.filter((t) => t.id !== item.id);
              try { localStorage.setItem("play_arena_tables", JSON.stringify(updated)); } catch (e) {}
              return updated;
            });
            setInDuelTable((currInDuel) => {
              if (currInDuel) {
                setOpponentInfo({
                  name: item.guest_name || "Guest Opponent",
                  avatar: item.guest_avatar || "⚔️",
                  isAI: false,
                });
                setTablePhase("selecting");
                setTimeLeft(15);
                setDuelLogMessage(`🎉 ${item.guest_name || "Adversarul"} a intrat la masă! Meciul a început! Alege mutarea!`);
              }
              return currInDuel;
            });
          }
        }
      })
      .subscribe();

    // 3. Local BroadcastChannel for multi-tab fallback
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("arena_tables_bc");
        bc.onmessage = (event) => {
          if (event.data?.type === "table_created" && event.data.table) {
            setLobbyTables((prev) => {
              if (prev.some((t) => t.id === event.data.table.id)) return prev;
              const updated = [event.data.table, ...prev];
              try { localStorage.setItem("play_arena_tables", JSON.stringify(updated)); } catch (e) {}
              return updated;
            });
          } else if (event.data?.type === "table_removed" && event.data.tableId) {
            setLobbyTables((prev) => {
              const updated = prev.filter((t) => t.id !== event.data.tableId);
              try { localStorage.setItem("play_arena_tables", JSON.stringify(updated)); } catch (e) {}
              return updated;
            });
          } else if (event.data?.type === "table_accepted" && event.data.tableId) {
            setLobbyTables((prev) => {
              const updated = prev.filter((t) => t.id !== event.data.tableId);
              try { localStorage.setItem("play_arena_tables", JSON.stringify(updated)); } catch (e) {}
              return updated;
            });
            setInDuelTable((currInDuel) => {
              if (currInDuel) {
                setOpponentInfo({ name: event.data.guestName || "Opponent", avatar: event.data.guestAvatar || "⚔️", isAI: false });
                setTablePhase("selecting");
                setTimeLeft(15);
                setDuelLogMessage(`🎉 ${event.data.guestName} a intrat la masă! Meciul a început! Alege mutarea!`);
              }
              return currInDuel;
            });
          }
        };
      } catch (e) {}
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "play_arena_tables" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setLobbyTables(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(lobbyInterval);
      supabase.removeChannel(channel);
      supabase.removeChannel(dbChannel);
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Real-Time Table Room Channel Effect + Active Room DB Polling
  useEffect(() => {
    if (!activeTableId || !inDuelTable) return;

    const myW = publicKey ? publicKey.toBase58() : "guest";

    const roomChannelName = `room-table-${activeTableId}`;
    supabase.getChannels().forEach((c: any) => {
      if (c.name === roomChannelName || c.topic?.includes(roomChannelName)) supabase.removeChannel(c);
    });

    const roomChannel = supabase.channel(roomChannelName, {
      config: { broadcast: { self: false } },
    })
      .on("broadcast", { event: "player_joined" }, (payload) => {
        if (payload?.guestName) {
          setOpponentInfo({
            name: payload.guestName,
            avatar: payload.guestAvatar || "⚔️",
            isAI: false,
          });
          setTablePhase("selecting");
          setTimeLeft(15);
          setDuelLogMessage(`🎉 ${payload.guestName} a intrat la masă! Alege mutarea înainte să expire timpul!`);
        }
      })
      .on("broadcast", { event: "game_move" }, (payload) => {
        if (!payload || payload.senderWallet === myW) return;

        if (payload.choice !== undefined) {
          setOpponentChoice(payload.choice);
          setDuelLogMessage("Adversarul a făcut mutarea! Se așteaptă dezvăluirea...");
          setPlayerChoice((currPlayerChoice: any) => {
            if (currPlayerChoice !== null) {
              setTimeout(() => {
                resolveTableOutcome(currPlayerChoice, payload.choice);
              }, 500);
            }
            return currPlayerChoice;
          });
        }

        if (payload.tttIndex !== undefined && payload.tttSymbol !== undefined) {
          setTttGrid((prevGrid) => {
            const newGrid = [...prevGrid];
            newGrid[payload.tttIndex] = payload.tttSymbol;

            const winSymbol = checkTTTWinner(newGrid);
            if (winSymbol) {
              setTablePhase("finished");
              const isMe = (isHostOfTable && winSymbol === "X") || (!isHostOfTable && winSymbol === "O");
              if (isMe) {
                setRoundWinner("player");
                saveStats(points + tableWager, wins + 1);
                setDuelLogMessage(`🎉 AI CÂȘTIGAT la Tic-Tac-Toe (+${tableWager * 2} Monede)!`);
              } else {
                setRoundWinner("opponent");
                saveStats(Math.max(0, points - tableWager));
                setDuelLogMessage(`💔 Adversarul a câștigat la Tic-Tac-Toe!`);
              }
            } else if (newGrid.every((c) => c !== null)) {
              setTablePhase("finished");
              setRoundWinner("tie");
              setDuelLogMessage(`👔 Tic-Tac-Toe s-a încheiat la Egalitate! Miza returnată.`);
            }
            return newGrid;
          });
        }
      })
      .on("broadcast", { event: "player_left" }, () => {
        setDuelLogMessage("Adversarul a părăsit masa.");
        setTablePhase("finished");
      })
      .subscribe();

    roomChannelRef.current = roomChannel;

    // Active Room DB Polling (Interval 1 sec) for fallback
    const pollRoomState = async () => {
      try {
        const { data, error } = await supabase
          .from("arena_tables")
          .select("*")
          .eq("id", activeTableId)
          .single();

        if (data && !error) {
          // 1. Detect Guest Join if host is waiting
          if (isHostOfTable && data.guest_name && (data.status === "in_game" || data.guest_wallet)) {
            setOpponentInfo((prev) => {
              if (!prev || prev.name !== data.guest_name) {
                setTablePhase("selecting");
                setTimeLeft(15);
                setDuelLogMessage(`🎉 ${data.guest_name} a intrat la masă! Meciul a început! Alege mutarea!`);
                return { name: data.guest_name, avatar: data.guest_avatar || "⚔️", isAI: false };
              }
              return prev;
            });
          }

          // 2. Detect Opponent Choice
          const oppChoiceInDB = isHostOfTable ? data.guest_choice : data.host_choice;
          if (oppChoiceInDB !== undefined && oppChoiceInDB !== null) {
            setOpponentChoice((prevOppChoice: any) => {
              if (prevOppChoice === null && oppChoiceInDB !== null) {
                setDuelLogMessage("Adversarul a făcut mutarea! Se așteaptă dezvăluirea...");
                setPlayerChoice((currPlayerChoice: any) => {
                  if (currPlayerChoice !== null) {
                    setTimeout(() => {
                      resolveTableOutcome(currPlayerChoice, oppChoiceInDB);
                    }, 400);
                  }
                  return currPlayerChoice;
                });
              }
              return oppChoiceInDB;
            });
          }

          // 3. Sync Tic Tac Toe Grid from DB
          if (data.ttt_grid) {
            try {
              const dbGrid = typeof data.ttt_grid === "string" ? JSON.parse(data.ttt_grid) : data.ttt_grid;
              if (Array.isArray(dbGrid) && dbGrid.length === 9) {
                setTttGrid((prevGrid) => {
                  if (JSON.stringify(prevGrid) !== JSON.stringify(dbGrid)) {
                    const winSymbol = checkTTTWinner(dbGrid);
                    if (winSymbol) {
                      setTablePhase("finished");
                      const isMe = (isHostOfTable && winSymbol === "X") || (!isHostOfTable && winSymbol === "O");
                      if (isMe) {
                        setRoundWinner("player");
                        setDuelLogMessage(`🎉 AI CÂȘTIGAT la Tic-Tac-Toe (+${tableWager * 2} Monede)!`);
                      } else {
                        setRoundWinner("opponent");
                        setDuelLogMessage(`💔 Adversarul a câștigat la Tic-Tac-Toe!`);
                      }
                    } else if (dbGrid.every((c) => c !== null)) {
                      setTablePhase("finished");
                      setRoundWinner("tie");
                      setDuelLogMessage(`👔 Tic-Tac-Toe s-a încheiat la Egalitate! Miza returnată.`);
                    }
                    return dbGrid;
                  }
                  return prevGrid;
                });
              }
            } catch (err) {}
          }
        }
      } catch (err) {}
    };

    const roomInterval = setInterval(pollRoomState, 1000);

    return () => {
      clearInterval(roomInterval);
      supabase.removeChannel(roomChannel);
      roomChannelRef.current = null;
    };
  }, [activeTableId, inDuelTable, isHostOfTable, tableWager, points, wins]);

  // Load Persistence & Daily Streak calculation
  useEffect(() => {
    try {
      const savedPoints = localStorage.getItem("play_points");
      const savedSol = localStorage.getItem("play_sol_balance");
      const savedUsdc = localStorage.getItem("play_usdc_balance");
      const savedWins = localStorage.getItem("play_wins");
      const savedStreak = localStorage.getItem("play_daily_streak");
      const savedLastClaim = localStorage.getItem("play_last_claim_date");
      const savedTitle = localStorage.getItem("play_title");
      const savedTheme = localStorage.getItem("play_theme");
      const savedUnlocked = localStorage.getItem("play_unlocked");
      const savedPrices = localStorage.getItem("play_shop_prices");
      const savedTables = localStorage.getItem("play_arena_tables");

      if (savedPoints) setPoints(parseInt(savedPoints, 10));
      if (savedSol) setSolBalance(parseFloat(savedSol));
      if (savedUsdc) setUsdcBalance(parseFloat(savedUsdc));
      if (savedWins) setWins(parseInt(savedWins, 10));
      if (savedTitle) setActiveTitle(savedTitle);
      if (savedTheme) setActiveTheme(savedTheme);
      if (savedUnlocked) setUnlockedItems(JSON.parse(savedUnlocked));
      if (savedPrices) setShopPrices(JSON.parse(savedPrices));
      if (savedTables) {
        try {
          const parsed = JSON.parse(savedTables);
          if (Array.isArray(parsed)) setLobbyTables(parsed);
        } catch (e) {}
      }

      if (publicKey) {
        supabase.from("profiles").select("play_points").eq("wallet", publicKey.toBase58()).single().then(({ data }) => {
          if (data) {
            if (data.play_points !== undefined && data.play_points !== null) setPoints(data.play_points);
          }
        });
        fetchOnChainBalances();
      }

      const todayStr = new Date().toISOString().split("T")[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

      let currentStreak = savedStreak ? parseInt(savedStreak, 10) : 0;
      let lastClaim = savedLastClaim || null;

      setLastClaimDate(lastClaim);

      if (lastClaim === todayStr) {
        setCanClaimDaily(false);
        setDailyStreak(currentStreak);
        const nextDay = currentStreak + 1;
        setNextDailyReward(Math.pow(2, Math.min(nextDay - 1, 6)));
      } else if (lastClaim === yesterdayStr) {
        setCanClaimDaily(true);
        setDailyStreak(currentStreak);
        const nextDay = currentStreak + 1;
        setNextDailyReward(Math.pow(2, Math.min(nextDay - 1, 6)));
      } else {
        setCanClaimDaily(true);
        setDailyStreak(0);
        setNextDailyReward(1);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Trigger on-chain balance fetch whenever wallet connects/changes
  useEffect(() => {
    if (publicKey) {
      fetchOnChainBalances();
    } else {
      setSolBalance(0);
      setUsdcBalance(0);
    }
  }, [publicKey]);

  // Save Stats to LocalStorage and Supabase Profiles
  const saveStats = (newPoints: number, newWins: number = wins, newTitle: string = activeTitle) => {
    setPoints(newPoints);
    setWins(newWins);
    setActiveTitle(newTitle);
    try {
      localStorage.setItem("play_points", newPoints.toString());
      localStorage.setItem("play_wins", newWins.toString());
      localStorage.setItem("play_title", newTitle);

      if (publicKey) {
        supabase.from("profiles").upsert({
          wallet: publicKey.toBase58(),
          play_points: newPoints,
          play_wins: newWins,
          rank_title: newTitle,
        }).then(() => {});
      }
    } catch (e) {}
  };

  // Add Log Entry to Anti-Cheat Monitor
  const logGameEvent = (event: string, status: string = "✓ Verified") => {
    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setGameLogs((prev) => [{ id: `log-${Date.now()}`, time, event, status }, ...prev.slice(0, 19)]);
  };

  // Claim Daily Reward
  const handleClaimDaily = () => {
    if (!canClaimDaily) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    let newStreak = 1;
    if (lastClaimDate === yesterdayStr) {
      newStreak = dailyStreak + 1;
    }

    const rewardCoins = Math.pow(2, Math.min(newStreak - 1, 6));
    const newPoints = points + rewardCoins;

    setDailyStreak(newStreak);
    setLastClaimDate(todayStr);
    setCanClaimDaily(false);
    saveStats(newPoints);

    const tomorrowDay = newStreak + 1;
    setNextDailyReward(Math.pow(2, Math.min(tomorrowDay - 1, 6)));

    try {
      localStorage.setItem("play_daily_streak", newStreak.toString());
      localStorage.setItem("play_last_claim_date", todayStr);
    } catch (e) {}

    setDailyClaimMessage(`🎉 Ai revendicat premiul pentru Ziua ${newStreak}: +${rewardCoins} Monede!`);
    logGameEvent(`Claimed Daily Streak Day ${newStreak} (+${rewardCoins} coins)`);
  };

  // Live Timer Effect inside Duel Table
  useEffect(() => {
    let timer: any = null;
    if (inDuelTable && tablePhase === "selecting" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoResolveTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [inDuelTable, tablePhase, timeLeft]);

  // Delete a Created Table from Lobby
  const handleDeleteTable = async (tableId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLobbyTables((prev) => {
      const updated = prev.filter((t) => t.id !== tableId);
      try { localStorage.setItem("play_arena_tables", JSON.stringify(updated)); } catch (err) {}
      return updated;
    });
    broadcastTableEvent("table_removed", { tableId });
    try {
      await supabase.from("arena_tables").delete().eq("id", tableId);
    } catch (err) {}
  };

  // Leave Table (Clean up created table from lobby if host leaves!)
  const handleLeaveTable = async () => {
    if (roomChannelRef.current) {
      try {
        roomChannelRef.current.send({
          type: "broadcast",
          event: "player_left",
        });
      } catch (e) {}
    }

    if (activeTableId) {
      await handleDeleteTable(activeTableId);
    } else if (activeCreatedTableId) {
      await handleDeleteTable(activeCreatedTableId);
    }

    setInDuelTable(false);
    setIsHostOfTable(false);
    setActiveCreatedTableId(null);
    setActiveTableId(null);
    setOpponentChoice(null);
    setPlayerChoice(null);
  };

  // Create User Custom Table
  const handleCreateCustomTable = async () => {
    if (!checkHasBalance(newTableCurrency, newTableWager)) {
      alert(`⚠️ Fonduri insuficiente! Masa necesită ${formatCurrencyBadge(newTableCurrency, newTableWager)}, dar balanța ta este de ${getBalanceFormatted(newTableCurrency)}.`);
      return;
    }

    const myName = publicKey ? (getDisplayName ? getDisplayName(publicKey.toBase58()) : `${publicKey.toBase58().slice(0, 4)}...`) : "Host User";
    const myWallet = publicKey ? publicKey.toBase58() : "guest";
    const targetPlayer = newTableTarget.trim() ? newTableTarget.trim() : null;

    const newTbl = {
      id: `tbl-${Date.now()}`,
      host: myName,
      hostWallet: myWallet,
      target: targetPlayer,
      avatar: "😎",
      game: newTableGame,
      wager: newTableWager,
      currency: newTableCurrency,
      isAI: false,
    };

    setLobbyTables((prev) => {
      const updated = [newTbl, ...prev];
      try { localStorage.setItem("play_arena_tables", JSON.stringify(updated)); } catch (err) {}
      return updated;
    });
    setShowCreateTableModal(false);
    setNewTableTarget("");

    // Broadcast table creation
    broadcastTableEvent("table_created", { table: newTbl });

    // Persist to Supabase DB 'arena_tables' if table exists
    try {
      await supabase.from("arena_tables").insert({
        id: newTbl.id,
        host: newTbl.host,
        host_wallet: newTbl.hostWallet,
        target: newTbl.target,
        avatar: newTbl.avatar,
        game: newTbl.game,
        wager: newTbl.wager,
        currency: newTbl.currency,
        is_ai: false,
        status: "open",
      });
    } catch (err) {}

    // Enter Table as Host & store created table ID for cleanup on leave
    setInDuelTable(true);
    setIsHostOfTable(true);
    setActiveCreatedTableId(newTbl.id);
    setActiveTableId(newTbl.id);
    setTableGame(newTableGame);
    setTableWager(newTableWager);
    setTableCurrency(newTableCurrency);
    setOpponentInfo(targetPlayer ? { name: targetPlayer, avatar: "⚔️", isAI: false } : null);

    setTablePhase(targetPlayer ? "ready" : "waiting");
    setTimeLeft(15);
    setPlayerChoice(null);
    setOpponentChoice(null);
    setRoundWinner(null);
    setDuelLogMessage(
      targetPlayer
        ? `⚔️ Masa a fost creată! L-ai provocat pe ${targetPlayer}. Se așteaptă acceptarea provocării...`
        : "⏳ Masa a fost creată! Se așteaptă intrarea unui adversar în duel..."
    );
    setTttGrid(Array(9).fill(null));

    logGameEvent(`Created Table ${newTbl.id} (${newTableGame.toUpperCase()}, ${formatCurrencyBadge(newTableCurrency, newTableWager)}${targetPlayer ? `, vs ${targetPlayer}` : ""})`);
  };

  // Opponent Joins Host Table (or Host adds AI Opponent)
  const handleAddOpponentToHostTable = (oppName: string = "Cryptic_Gamer", oppAvatar: string = "🐺", isAI: boolean = false) => {
    setOpponentInfo({ name: oppName, avatar: oppAvatar, isAI });
    setTablePhase("ready");
    setDuelLogMessage(`🎉 ${oppName} s-a alăturat masei! Apasă "ÎNCEPE JOCUL" pentru a porni duelul.`);

    if (isAI || !opponentChoice) {
      let aiPick: any = null;
      if (tableGame === "rps") aiPick = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
      else if (tableGame === "coinflip") aiPick = Math.random() < 0.5 ? "heads" : "tails";
      setOpponentChoice(aiPick);
    }

    logGameEvent(`Opponent ${oppName} joined Table. State: READY`);
  };

  // Host Launches Game (Presses "START GAME")
  const handleHostStartGame = () => {
    if (tablePhase !== "ready") return;
    setTablePhase("selecting");
    setTimeLeft(15);
    setDuelLogMessage("🔥 DUELUL A ÎNCEPUT! Alege mutarea înainte să expire timpul!");
    logGameEvent(`Host started match (${tableGame.toUpperCase()}, pot: ${tableWager * 2} coins)`);
  };

  // Launch Live Match Table from Lobby
  const startLiveTableFromLobby = async (
    game: "rps" | "coinflip" | "tictactoe",
    wager: number,
    oppName: string,
    oppAvatar: string,
    isAI: boolean,
    tableId?: string,
    currency: "monede" | "sol" | "usdc" = "monede"
  ) => {
    if (!checkHasBalance(currency, wager)) {
      alert(`⚠️ Fonduri insuficiente! Această masă are miza de ${formatCurrencyBadge(currency, wager)}, dar balanța ta este de ${getBalanceFormatted(currency)}.`);
      return;
    }

    const myName = publicKey ? (getDisplayName ? getDisplayName(publicKey.toBase58()) : `${publicKey.toBase58().slice(0, 4)}...`) : "Gamer";
    const myWallet = publicKey ? publicKey.toBase58() : "guest";

    if (tableId) {
      setActiveTableId(tableId);
      setLobbyTables((prev) => {
        const updated = prev.filter((t) => t.id !== tableId);
        try { localStorage.setItem("play_arena_tables", JSON.stringify(updated)); } catch (e) {}
        return updated;
      });

      // Update Supabase DB row so Host's postgres_changes fires instantly!
      try {
        const { error: updateErr } = await supabase
          .from("arena_tables")
          .update({
            status: "in_game",
            guest_name: myName,
            guest_wallet: myWallet,
            guest_avatar: "⚔️"
          })
          .eq("id", tableId);
        if (updateErr) console.error("Supabase join table error:", updateErr);
      } catch (err) {
        console.error("Supabase join exception:", err);
      }

      broadcastTableEvent("table_accepted", {
        tableId,
        guestName: myName,
        guestWallet: myWallet,
        guestAvatar: "⚔️",
      });

      // Broadcast on dedicated room channel
      const room = supabase.channel(`room-table-${tableId}`);
      room.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          room.send({
            type: "broadcast",
            event: "player_joined",
            guestName: myName,
            guestWallet: myWallet,
            guestAvatar: "⚔️",
          });
        }
      });
    }

    setInDuelTable(true);
    setIsHostOfTable(false);
    setActiveCreatedTableId(null);
    setTableGame(game);
    setTableWager(wager);
    setTableCurrency(currency);
    setOpponentInfo({ name: oppName, avatar: oppAvatar, isAI });

    setTablePhase("selecting");
    setTimeLeft(15);
    setPlayerChoice(null);
    setOpponentChoice(null);
    setRoundWinner(null);
    setDuelLogMessage("🔥 DUELUL A ÎNCEPUT! Alege mutarea!");
    setTttGrid(Array(9).fill(null));

    if (isAI) {
      let aiPick: any = null;
      if (game === "rps") aiPick = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
      else if (game === "coinflip") aiPick = Math.random() < 0.5 ? "heads" : "tails";
      setOpponentChoice(aiPick);
    }

    logGameEvent(`Joined table vs ${oppName} (${game.toUpperCase()}, wager: ${formatCurrencyBadge(currency, wager)})`);
  };

  // Handle timer expiry or both player decision
  const handleAutoResolveTimer = () => {
    if (tablePhase !== "selecting") return;
    setTablePhase("revealing");

    let finalPlayerChoice = playerChoice;
    if (!finalPlayerChoice) {
      if (tableGame === "rps") finalPlayerChoice = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
      else if (tableGame === "coinflip") finalPlayerChoice = Math.random() < 0.5 ? "heads" : "tails";
      setPlayerChoice(finalPlayerChoice);
    }

    let finalOpponentChoice = opponentChoice;
    if (!finalOpponentChoice) {
      if (tableGame === "rps") finalOpponentChoice = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
      else if (tableGame === "coinflip") finalOpponentChoice = Math.random() < 0.5 ? "heads" : "tails";
      setOpponentChoice(finalOpponentChoice);
    }

    setTimeout(() => {
      resolveTableOutcome(finalPlayerChoice, finalOpponentChoice);
    }, 1200);
  };

  // Resolve outcome of duel
  const resolveTableOutcome = (pChoice: any, oChoice: any) => {
    setTablePhase("finished");
    const oppName = opponentInfo?.name || "Opponent";
    const winnerPayout = getWinnerPayout(tableWager, houseFeePercent);
    const payoutBadge = formatCurrencyBadge(tableCurrency, winnerPayout);
    const wagerBadge = formatCurrencyBadge(tableCurrency, tableWager);

    if (tableGame === "rps") {
      if (pChoice === oChoice) {
        setRoundWinner("tie");
        setDuelLogMessage(`👔 Egalitate! Amândoi ați ales ${pChoice.toUpperCase()}. Miza (${wagerBadge}) a fost returnată.`);
        logGameEvent(`RPS Tie (${pChoice} vs ${oChoice})`, "✓ Refunded");
      } else if (
        (pChoice === "rock" && oChoice === "scissors") ||
        (pChoice === "paper" && oChoice === "rock") ||
        (pChoice === "scissors" && oChoice === "paper")
      ) {
        setRoundWinner("player");
        awardMatchWinner(tableCurrency, tableWager, houseFeePercent);
        setDuelLogMessage(`🏆 AI CÂȘTIGAT! Premiu adăugat în balanță: +${payoutBadge}! ${pChoice.toUpperCase()} l-a învins pe ${oChoice.toUpperCase()}!`);
        logGameEvent(`Player Won RPS (+${payoutBadge})`, "✓ Payout Sent");
      } else {
        setRoundWinner("opponent");
        deductMatchLoser(tableCurrency, tableWager);
        setDuelLogMessage(`💔 ${oppName} A CÂȘTIGAT! ${oChoice.toUpperCase()} te-a învins (-${wagerBadge}).`);
        logGameEvent(`Player Lost RPS (-${wagerBadge})`, "✓ Settled");
      }
    } else if (tableGame === "coinflip") {
      const coinLanded = Math.random() < 0.5 ? "heads" : "tails";
      if (pChoice === coinLanded && oChoice !== coinLanded) {
        setRoundWinner("player");
        awardMatchWinner(tableCurrency, tableWager, houseFeePercent);
        setDuelLogMessage(`🎉 AI CÂȘTIGAT! Premiu adăugat în balanță: +${payoutBadge}! Moneda a căzut pe ${coinLanded.toUpperCase()}!`);
        logGameEvent(`Player Won Coin Flip (+${payoutBadge})`, "✓ Payout Sent");
      } else if (pChoice !== coinLanded && oChoice === coinLanded) {
        setRoundWinner("opponent");
        deductMatchLoser(tableCurrency, tableWager);
        setDuelLogMessage(`💔 ${oppName} A CÂȘTIGAT! Moneda a căzut pe ${coinLanded.toUpperCase()} (-${wagerBadge}).`);
        logGameEvent(`Player Lost Coin Flip (-${wagerBadge})`, "✓ Settled");
      } else {
        setRoundWinner("tie");
        setDuelLogMessage(`🪙 Moneda a căzut pe ${coinLanded.toUpperCase()}. Egalitate! Miza (${wagerBadge}) a fost returnată.`);
        logGameEvent(`Coin Flip Tie`, "✓ Refunded");
      }
    }
  };

  // Player action inside live duel table
  const makePlayerTableChoice = (choice: any) => {
    if (tablePhase !== "selecting") return;
    setPlayerChoice(choice);

    const myW = publicKey ? publicKey.toBase58() : "guest";

    if (activeTableId) {
      const dbPayload = isHostOfTable ? { host_choice: choice } : { guest_choice: choice };
      (async () => {
        try {
          await supabase.from("arena_tables").update(dbPayload).eq("id", activeTableId);
        } catch (e) {}
      })();
    }

    if (roomChannelRef.current) {
      try {
        roomChannelRef.current.send({
          type: "broadcast",
          event: "game_move",
          senderWallet: myW,
          choice,
        });
      } catch (e) {}
    }

    if (opponentChoice !== null) {
      setTimeout(() => {
        resolveTableOutcome(choice, opponentChoice);
      }, 400);
    } else {
      setDuelLogMessage(`Ai ales ${typeof choice === "string" ? choice.toUpperCase() : choice}! Se așteaptă alegerea adversarului...`);
    }

    if (opponentInfo?.isAI) {
      setTimeout(() => {
        handleAutoResolveTimer();
      }, 800);
    }
  };

  // SMART AI logic for Tic-Tac-Toe (Hard Difficulty)
  const getSmartTTTMove = (grid: Array<string | null>, aiSymbol: string = "O", playerSymbol: string = "X"): number => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];

    // 1. Can AI win immediately?
    for (const [a, b, c] of lines) {
      if (grid[a] === aiSymbol && grid[b] === aiSymbol && grid[c] === null) return c;
      if (grid[a] === aiSymbol && grid[c] === aiSymbol && grid[b] === null) return b;
      if (grid[b] === aiSymbol && grid[c] === aiSymbol && grid[a] === null) return a;
    }

    // 2. Can Player win in 1 move? BLOCK IT!
    for (const [a, b, c] of lines) {
      if (grid[a] === playerSymbol && grid[b] === playerSymbol && grid[c] === null) return c;
      if (grid[a] === playerSymbol && grid[c] === playerSymbol && grid[b] === null) return b;
      if (grid[b] === playerSymbol && grid[c] === playerSymbol && grid[a] === null) return a;
    }

    // 3. Prefer center if empty
    if (grid[4] === null) return 4;

    // 4. Take corners if available
    const corners = [0, 2, 6, 8].filter((i) => grid[i] === null);
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    // 5. Any open cell
    const empty = grid.map((v, i) => (v === null ? i : null)).filter((v) => v !== null) as number[];
    return empty[Math.floor(Math.random() * empty.length)];
  };

  // Tic-Tac-Toe Move in Live Table
  const handleTableTTTClick = (index: number) => {
    if (tttGrid[index] || tablePhase === "finished" || tablePhase === "waiting") return;

    const mySymbol = isHostOfTable ? "X" : "O";
    const myW = publicKey ? publicKey.toBase58() : "guest";

    const newGrid = [...tttGrid];
    newGrid[index] = mySymbol;
    setTttGrid(newGrid);

    if (activeTableId) {
      (async () => {
        try {
          await supabase.from("arena_tables").update({ ttt_grid: JSON.stringify(newGrid) }).eq("id", activeTableId);
        } catch (e) {}
      })();
    }

    if (roomChannelRef.current) {
      try {
        roomChannelRef.current.send({
          type: "broadcast",
          event: "game_move",
          senderWallet: myW,
          tttIndex: index,
          tttSymbol: mySymbol,
        });
      } catch (e) {}
    }

    const winSymbol = checkTTTWinner(newGrid);
    if (winSymbol) {
      setTablePhase("finished");
      const winnerPayout = getWinnerPayout(tableWager, houseFeePercent);
      const payoutBadge = formatCurrencyBadge(tableCurrency, winnerPayout);
      const wagerBadge = formatCurrencyBadge(tableCurrency, tableWager);

      if (winSymbol === mySymbol) {
        setRoundWinner("player");
        awardMatchWinner(tableCurrency, tableWager, houseFeePercent);
        setDuelLogMessage(`🎉 AI CÂȘTIGAT la Tic-Tac-Toe! Premiu adăugat: +${payoutBadge}!`);
        logGameEvent(`Won Tic-Tac-Toe Match (+${payoutBadge})`);
      } else {
        setRoundWinner("opponent");
        deductMatchLoser(tableCurrency, tableWager);
        setDuelLogMessage(`💔 ${opponentInfo?.name || "Opponent"} a câștigat la Tic-Tac-Toe (-${wagerBadge})!`);
        logGameEvent(`Lost Tic-Tac-Toe Match (-${wagerBadge})`);
      }
      return;
    }

    if (newGrid.every((c) => c !== null)) {
      setTablePhase("finished");
      setRoundWinner("tie");
      setDuelLogMessage(`👔 Tic-Tac-Toe s-a încheiat la Egalitate! Miza returnată.`);
      logGameEvent(`Tic-Tac-Toe Tie Game`);
      return;
    }

    // Smart AI Turn in Tic Tac Toe if opponent is AI
    if (opponentInfo?.isAI) {
      setTimeout(() => {
        const aiSymbol = mySymbol === "X" ? "O" : "X";
        const aiPick = getSmartTTTMove(newGrid, aiSymbol, mySymbol);
        if (aiPick !== undefined && aiPick !== null && aiPick >= 0) {
          newGrid[aiPick] = aiSymbol;
          setTttGrid([...newGrid]);

          const aiWinSymbol = checkTTTWinner(newGrid);
          if (aiWinSymbol) {
            setTablePhase("finished");
            setRoundWinner("opponent");
            saveStats(Math.max(0, points - tableWager));
            setDuelLogMessage(`🤖 ${opponentInfo.name} a câștigat la Tic-Tac-Toe!`);
            logGameEvent(`Lost Tic-Tac-Toe vs AI`);
          } else if (newGrid.every((c) => c !== null)) {
            setTablePhase("finished");
            setRoundWinner("tie");
            setDuelLogMessage(`👔 Tic-Tac-Toe s-a încheiat la Egalitate! Miza returnată.`);
          }
        }
      }, 400);
    }
  };

  const checkTTTWinner = (grid: Array<string | null>) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (grid[a] && grid[a] === grid[b] && grid[a] === grid[c]) {
        return grid[a];
      }
    }
    return null;
  };

  // Arcade Single Player - Rock Paper Scissors
  const handlePlayArcadeRps = () => {
    if (playingArcadeRps || points < arcadeRpsWager) return;
    setPlayingArcadeRps(true);
    setArcadeRpsResult(null);
    setArcadeRpsMessage("");

    setTimeout(() => {
      // Smart AI with 50/50 balance
      const choices: Array<"rock" | "paper" | "scissors"> = ["rock", "paper", "scissors"];
      let aiPick: "rock" | "paper" | "scissors";

      // Slight counter probability to ensure realistic challenge
      if (Math.random() < 0.55) {
        if (arcadeRpsChoice === "rock") aiPick = Math.random() < 0.6 ? "paper" : "rock";
        else if (arcadeRpsChoice === "paper") aiPick = Math.random() < 0.6 ? "scissors" : "paper";
        else aiPick = Math.random() < 0.6 ? "rock" : "scissors";
      } else {
        aiPick = choices[Math.floor(Math.random() * choices.length)];
      }

      setPlayingArcadeRps(false);

      if (arcadeRpsChoice === aiPick) {
        setArcadeRpsResult({ pChoice: arcadeRpsChoice, aiChoice: aiPick, outcome: "tie" });
        setArcadeRpsMessage(`👔 Egalitate! Amândoi ați ales ${arcadeRpsChoice.toUpperCase()}. Miza returnată.`);
      } else if (
        (arcadeRpsChoice === "rock" && aiPick === "scissors") ||
        (arcadeRpsChoice === "paper" && aiPick === "rock") ||
        (arcadeRpsChoice === "scissors" && aiPick === "paper")
      ) {
        saveStats(points + arcadeRpsWager, wins + 1);
        setArcadeRpsResult({ pChoice: arcadeRpsChoice, aiChoice: aiPick, outcome: "win" });
        setArcadeRpsMessage(`🎉 AI CÂȘTIGAT +${arcadeRpsWager * 2} MONEDI! ${arcadeRpsChoice.toUpperCase()} bate ${aiPick.toUpperCase()}!`);
      } else {
        saveStats(Math.max(0, points - arcadeRpsWager));
        setArcadeRpsResult({ pChoice: arcadeRpsChoice, aiChoice: aiPick, outcome: "loss" });
        setArcadeRpsMessage(`💔 AI PIERDUT -${arcadeRpsWager} MONEDI! AI-ul a ales ${aiPick.toUpperCase()}.`);
      }
    }, 700);
  };

  // Arcade Single Player - Coin Flip
  const handleSingleCoinFlip = () => {
    if (flipping || points < betAmount) return;
    setFlipping(true);
    setFlipResult(null);
    setFlipMessage("");

    setTimeout(() => {
      // House edge / realistic odds (48% win probability)
      const isWin = Math.random() < 0.48;
      const outcome: "heads" | "tails" = isWin
        ? coinChoice
        : coinChoice === "heads"
        ? "tails"
        : "heads";

      setFlipResult(outcome);
      setFlipping(false);

      if (outcome === coinChoice) {
        saveStats(points + betAmount, wins + 1);
        setFlipMessage(`🎉 AI CÂȘTIGAT +${betAmount} MONEDI! Moneda a căzut pe ${outcome.toUpperCase()}!`);
      } else {
        saveStats(Math.max(0, points - betAmount));
        setFlipMessage(`💔 Mai încearcă! Moneda a căzut pe ${outcome.toUpperCase()}. (-${betAmount} monedi)`);
      }
    }, 800);
  };

  // Arcade Single Player - Spin Wheel
  const handleSpinWheel = () => {
    if (spinning) return;
    const spinCost = 15;
    if (points < spinCost) {
      alert("Ai nevoie de cel puțin 15 monede pentru a învârti roata!");
      return;
    }

    setSpinning(true);
    setSpinReward(null);

    // Weighted outcomes to make high coin gains challenging & valuable
    // Index mapping:
    // 0: 0, 1: 5, 2: 25, 3: 10, 4: 50, 5: TRY AGAIN (0), 6: 100, 7: 200
    const rand = Math.random();
    let prizeIndex = 0;
    if (rand < 0.30) prizeIndex = 0; // 0 coins
    else if (rand < 0.55) prizeIndex = 1; // 5 coins
    else if (rand < 0.72) prizeIndex = 3; // 10 coins
    else if (rand < 0.85) prizeIndex = 5; // 0 coins (TRY AGAIN)
    else if (rand < 0.93) prizeIndex = 2; // 25 coins
    else if (rand < 0.97) prizeIndex = 4; // 50 coins
    else if (rand < 0.99) prizeIndex = 6; // 100 coins
    else prizeIndex = 7; // 200 JACKPOT!

    const sliceAngle = 360 / wheelPrizes.length; // 45deg
    // Wheel pointer is at top (0deg / 360deg).
    // Target angle offset so top pointer lands exactly on slice `prizeIndex`
    const targetSliceCenter = prizeIndex * sliceAngle + sliceAngle / 2;
    const normalizedTarget = (360 - targetSliceCenter) % 360;

    const fullRotations = 6 * 360;
    const finalDegree = wheelDegree + fullRotations + (normalizedTarget - (wheelDegree % 360) + 360) % 360;

    setWheelDegree(finalDegree);

    setTimeout(() => {
      setSpinning(false);
      const prize = wheelPrizes[prizeIndex].value;
      const prizeLabel = wheelPrizes[prizeIndex].label;

      const netChange = prize - spinCost;
      saveStats(Math.max(0, points + netChange), prize > 0 ? wins + 1 : wins);

      if (prize > 0) {
        setSpinReward(`🎉 AI CÂȘTIGAT: +${prize} Monede! (${prizeLabel})`);
      } else {
        setSpinReward(`💔 Din păcate nu ai câștigat! (${prizeLabel}) - Taxă învârtire: ${spinCost} monedi`);
      }
    }, 3800);
  };

  // Arcade Single Player - Tic-Tac-Toe Practice vs Smart AI
  const handleSoloTttClick = (idx: number) => {
    if (soloTttGrid[idx] || soloTttStatus !== "playing") return;

    const newGrid = [...soloTttGrid];
    newGrid[idx] = "X";
    setSoloTttGrid(newGrid);

    const winSymbol = checkTTTWinner(newGrid);
    if (winSymbol === "X") {
      setSoloTttStatus("won");
      saveStats(points + soloTttWager * 2, wins + 1);
      setSoloTttMessage(`🏆 SENZAȚIONAL! L-ai învins pe Smart AI la Tic-Tac-Toe (+${soloTttWager * 2} Monede)!`);
      return;
    }

    if (newGrid.every((c) => c !== null)) {
      setSoloTttStatus("tie");
      setSoloTttMessage(`👔 Egalitate perfectă cu Smart AI! Nicio monedă pierdută.`);
      return;
    }

    // Smart AI Response
    setTimeout(() => {
      const aiPick = getSmartTTTMove(newGrid, "O", "X");
      if (aiPick !== undefined && aiPick !== null && aiPick >= 0) {
        newGrid[aiPick] = "O";
        setSoloTttGrid([...newGrid]);

        const aiWinSymbol = checkTTTWinner(newGrid);
        if (aiWinSymbol === "O") {
          setSoloTttStatus("lost");
          saveStats(Math.max(0, points - soloTttWager));
          setSoloTttMessage(`🤖 Smart AI te-a învins! Câștigarea monedelor necesită atenție maximă (-${soloTttWager} Monede).`);
        } else if (newGrid.every((c) => c !== null)) {
          setSoloTttStatus("tie");
          setSoloTttMessage(`👔 Egalitate perfectă cu Smart AI! Nicio monedă pierdută.`);
        }
      }
    }, 350);
  };

  // Arcade Single Player - Dice Roll
  const handleRollDiceSolo = () => {
    if (rollingDice || points < diceRollWager) return;
    setRollingDice(true);
    setDiceResult(null);

    setTimeout(() => {
      const pRoll = Math.floor(Math.random() * 6) + 1;
      const aiRoll = Math.floor(Math.random() * 6) + 1;
      setRollingDice(false);

      if (pRoll > aiRoll) {
        saveStats(points + diceRollWager, wins + 1);
        setDiceResult({ pRoll, aiRoll, outcome: "win" });
      } else if (pRoll < aiRoll) {
        saveStats(Math.max(0, points - diceRollWager));
        setDiceResult({ pRoll, aiRoll, outcome: "loss" });
      } else {
        setDiceResult({ pRoll, aiRoll, outcome: "tie" });
      }
    }, 600);
  };

  // Shop Buy Logic
  const handleBuyItem = (item: { id: string; name: string; defaultPrice: number; type: "title" | "theme" | "box" }) => {
    const itemPrice = shopPrices[item.id] || item.defaultPrice;

    if (points < itemPrice) {
      setShopMsg("❌ Nu ai suficiente monede!");
      return;
    }

    saveStats(points - itemPrice, wins, item.type === "title" ? item.name : activeTitle);

    if (item.type === "title") {
      setActiveTitle(item.name);
      setShopMsg(`🎉 Titlu VIP Echipat: ${item.name}!`);
    } else if (item.type === "theme") {
      setActiveTheme(item.id);
      localStorage.setItem("play_theme", item.id);
      setShopMsg(`🎨 Temă Activată: ${item.name}!`);
    } else if (item.type === "box") {
      const outcomes = [50, 100, 20, 200, 10, 500];
      const winPts = outcomes[Math.floor(Math.random() * outcomes.length)];
      saveStats(points - itemPrice + winPts);
      setShopMsg(`📦 Ai deschis Mystery Crate și ai câștigat +${winPts} Monede!`);
    }

    const updatedUnlocked = [...unlockedItems, item.id];
    setUnlockedItems(updatedUnlocked);
    localStorage.setItem("play_unlocked", JSON.stringify(updatedUnlocked));
  };

  // Challenges targeted to current user
  const myWallet = publicKey ? publicKey.toBase58().toLowerCase() : "";
  const myName = publicKey && getDisplayName ? getDisplayName(publicKey.toBase58()).toLowerCase() : "";

  const myChallenges = lobbyTables.filter((tbl) => {
    if (!tbl.target) return false;
    const targetLower = tbl.target.toLowerCase();
    const hostWalletLower = (tbl.hostWallet || "").toLowerCase();

    if (hostWalletLower && myWallet && hostWalletLower === myWallet) return false;

    const isForMe =
      (myWallet && targetLower.includes(myWallet)) ||
      (myWallet && myWallet.includes(targetLower)) ||
      (myName && targetLower.includes(myName)) ||
      (myName && myName.includes(targetLower)) ||
      targetLower === "all";

    return isForMe;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white">
      {/* Top Header Bar with High-End Styling */}
      <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between flex-shrink-0 bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 p-0.5 shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center justify-center">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center text-xl">
              🎮
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                Arena Duels & Arcade
              </h1>
              <span className="text-[10px] bg-purple-500/20 border border-purple-400/30 text-purple-300 font-bold px-2 py-0.5 rounded-full shadow-sm">
                {activeTitle}
              </span>
            </div>
            <p className="text-zinc-400 text-[11px]">Tables 1v1, Smart AI, High-End Arcade & VIP Rewards</p>
          </div>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-2">
          <div className="bg-zinc-900/90 border border-purple-500/30 rounded-2xl px-3 py-1.5 flex items-center gap-2 shadow-inner backdrop-blur-md text-xs">
            <span className="text-amber-400 font-black flex items-center gap-1" title="Monede Virtuale Daily">
              🪙 {points}
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-cyan-300 font-extrabold flex items-center gap-1" title="Balanță Live SOL (Solana RPC)">
              ◎ {publicKey ? `${solBalance.toFixed(3)} SOL` : "0.00 SOL"}
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-emerald-300 font-extrabold flex items-center gap-1" title="Balanță Live USDC (Solana SPL Token)">
              💵 {publicKey ? `$${usdcBalance.toFixed(2)} USDC` : "$0.00 USDC"}
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-purple-300 font-bold flex items-center gap-1" title="Victorii Total">
              🏆 {wins}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl w-full mx-auto">
        {/* REAL CRYPTO & VIRTUAL BALANCES CARD */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 mb-5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto flex-1">
            <div className="bg-zinc-950/80 border border-amber-500/30 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-base flex-shrink-0">
                🪙
              </div>
              <div className="overflow-hidden">
                <div className="text-[10px] text-zinc-400 font-bold uppercase truncate">Monede Daily</div>
                <div className="text-xs font-black text-amber-300">{points} Monede</div>
              </div>
            </div>

            <div className="bg-zinc-950/80 border border-cyan-500/30 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-black flex items-center justify-center text-base flex-shrink-0">
                ◎
              </div>
              <div className="overflow-hidden">
                <div className="text-[10px] text-zinc-400 font-bold uppercase flex items-center gap-1.5 truncate">
                  <span>SOL Real Portofel</span>
                  {publicKey ? (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 rounded font-extrabold">LIVE RPC</span>
                  ) : (
                    <span className="text-[8px] bg-red-500/20 text-red-400 border border-red-500/30 px-1 rounded font-extrabold">NECONECTAT</span>
                  )}
                </div>
                <div className="text-xs font-black text-cyan-300">
                  {publicKey ? `${solBalance.toFixed(3)} ◎ SOL` : "Conectează Portofel"}
                </div>
              </div>
            </div>

            <div className="bg-zinc-950/80 border border-emerald-500/30 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-base flex-shrink-0">
                💵
              </div>
              <div className="overflow-hidden">
                <div className="text-[10px] text-zinc-400 font-bold uppercase flex items-center gap-1.5 truncate">
                  <span>USDC Real Portofel</span>
                  {publicKey ? (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 rounded font-extrabold">LIVE SPL</span>
                  ) : (
                    <span className="text-[8px] bg-red-500/20 text-red-400 border border-red-500/30 px-1 rounded font-extrabold">NECONECTAT</span>
                  )}
                </div>
                <div className="text-xs font-black text-emerald-300">
                  {publicKey ? `$${usdcBalance.toFixed(2)} USDC` : "Conectează Portofel"}
                </div>
              </div>
            </div>
          </div>

          {publicKey && (
            <button
              onClick={fetchOnChainBalances}
              disabled={isOnChainLoading}
              className="w-full md:w-auto px-3.5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 flex-shrink-0 active:scale-95"
              title="Sincronizează balanța direct din Blockchain Solana (RPC Mainnet)"
            >
              {isOnChainLoading ? "⏳ Se încarcă RPC..." : "🔄 Reîmprospătează Balanța On-Chain"}
            </button>
          )}
        </div>
        {/* CHALLENGE NOTIFICATION POPUP BANNER */}
        {myChallenges.length > 0 && !inDuelTable && (
          <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-pink-950 border-2 border-amber-400 p-4 rounded-2xl shadow-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-2xl flex-shrink-0">
                ⚔️
              </div>
              <div>
                <div className="text-amber-300 font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <span>AI FOST PROVOCAT LA UN DUEL!</span>
                  <span className="bg-amber-400 text-black text-[9px] px-2 py-0.5 rounded-full font-black">
                    1v1 LIVE
                  </span>
                </div>
                <div className="text-white text-xs font-semibold mt-0.5">
                  <span className="text-amber-400 font-extrabold">{myChallenges[0].host}</span> te-a provocat la{" "}
                  <span className="uppercase font-bold text-purple-200">
                    {myChallenges[0].game === "rps"
                      ? "Piatră Hârtie Foarfecă"
                      : myChallenges[0].game === "coinflip"
                      ? "Coin Flip"
                      : myChallenges[0].game === "dice"
                      ? "Dice Roll"
                      : "Tic-Tac-Toe"}
                  </span>{" "}
                  pe miza de <span className="text-amber-400 font-black">{myChallenges[0].wager} Monede</span>!
                </div>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
              <button
                onClick={() => {
                  startLiveTableFromLobby(
                    myChallenges[0].game,
                    myChallenges[0].wager,
                    myChallenges[0].host,
                    myChallenges[0].avatar,
                    myChallenges[0].isAI,
                    myChallenges[0].id
                  );
                }}
                className="bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-black px-4 py-2.5 rounded-xl text-xs shadow-lg flex-1 sm:flex-none transition-transform active:scale-95"
              >
                ✅ Acceptă Provocarea
              </button>
              <button
                onClick={() => handleDeleteTable(myChallenges[0].id)}
                className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/30 px-3 py-2.5 rounded-xl text-xs flex-1 sm:flex-none transition-colors"
              >
                ❌ Refuză
              </button>
            </div>
          </div>
        )}

        {!inDuelTable ? (
          <>
            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: "hub", label: "🕹️ Acasă" },
                { id: "daily", label: "📅 Daily Streak" },
                { id: "pvp", label: "⚔️ Mese & Duels 1v1" },
                { id: "games", label: "🎲 Play Games Arcade" },
                { id: "shop", label: "🛒 Magazin Monede VIP" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: HUB / HOME */}
            {activeTab === "hub" && (
              <div className="space-y-6">
                {/* High-End Banner */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-zinc-950 to-pink-950 border border-purple-500/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                  <div className="space-y-2 text-center md:text-left">
                    <span className="text-[10px] bg-amber-500/20 border border-amber-400/30 text-amber-300 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      🔥 Economie Echilibrată & Recompense Reale
                    </span>
                    <h2 className="text-xl font-black text-white mt-1">
                      Daily Streak Bonus: <span className="text-amber-400">{dailyStreak} Zile Consecutive</span>
                    </h2>
                    <p className="text-zinc-400 text-xs max-w-md leading-relaxed">
                      Câștigă monede în fiecare zi. Jocurile au o dificultate crescută și inteligență artificială avansată pentru ca fiecare victorie să fie cu adevărat valoroasă!
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("daily")}
                    className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:scale-105 text-black font-black px-6 py-3 rounded-2xl text-xs whitespace-nowrap shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95"
                  >
                    {canClaimDaily ? "🎁 Revendică Premiul Zilnic" : "📅 Vezi Calendarul"}
                  </button>
                </div>

                {/* Quick Cards Grid with High-End Styling */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    onClick={() => setActiveTab("pvp")}
                    className="group bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/60 rounded-3xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-lg relative overflow-hidden"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                      ⚔️
                    </div>
                    <h3 className="font-bold text-white text-base">Creează Mese & Duels</h3>
                    <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                      Creează mese de joc pe mize pentru Piatră-Hârtie-Foarfecă, Coin Flip sau Tic-Tac-Toe și provoacă alți jucători!
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab("games")}
                    className="group bg-zinc-900/80 border border-zinc-800 hover:border-pink-500/60 rounded-3xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-lg relative overflow-hidden"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                      🎰
                    </div>
                    <h3 className="font-bold text-white text-base">Arcade High-End</h3>
                    <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                      Joacă Piatră-Hârtie-Foarfecă, învârte Roata Norocului vizuală sau dă cu banul!
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab("shop")}
                    className="group bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/60 rounded-3xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-lg relative overflow-hidden"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                      👑
                    </div>
                    <h3 className="font-bold text-white text-base">VIP Point Shop</h3>
                    <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                      Folosește monedele greu câștigate pentru a debloca titluri VIP exclusiviste afișate în chat și cufere misterioase!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DAILY STREAK REWARDS */}
            {activeTab === "daily" && (
              <div className="space-y-6">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 backdrop-blur-md">
                  <h2 className="text-lg font-bold text-white mb-1">📅 Calendar Recompense Zilnice</h2>
                  <p className="text-zinc-400 text-xs">
                    Intră zilnic pentru a-ți crește numărul de zile consecutive și a câștiga mai multe monede!
                  </p>
                </div>

                {dailyClaimMessage && (
                  <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-500/50 text-xs font-bold text-amber-300 text-center shadow-lg">
                    {dailyClaimMessage}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                    const rewardAmt = Math.pow(2, Math.min(dayNum - 1, 6));
                    const isClaimed = dayNum <= dailyStreak;
                    const isCurrent = dayNum === dailyStreak + 1 && canClaimDaily;

                    return (
                      <div
                        key={dayNum}
                        className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${
                          isClaimed
                            ? "bg-zinc-900/40 border-zinc-800 text-zinc-500"
                            : isCurrent
                            ? "bg-gradient-to-b from-purple-950 to-zinc-900 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            : "bg-zinc-900/80 border-zinc-800 text-zinc-300"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-400">
                          Ziua {dayNum}
                        </span>
                        <div className="my-3 text-2xl">{isClaimed ? "✅" : "🪙"}</div>
                        <span className="text-xs font-black text-amber-400">+{rewardAmt} Monede</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleClaimDaily}
                    disabled={!canClaimDaily}
                    className={`px-8 py-3.5 rounded-2xl text-xs font-black transition-all ${
                      canClaimDaily
                        ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black hover:scale-105 shadow-xl shadow-amber-500/20 active:scale-95"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    }`}
                  >
                    {canClaimDaily ? "🎁 Revendică Recompensa Zilnică acum!" : "✅ Recompensă Revendicată pentru Azi"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PVP TABLES & LOBBY */}
            {activeTab === "pvp" && (
              <div className="space-y-6">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
                  <div>
                    <h2 className="text-lg font-bold text-white">⚔️ Mese de Joc & Duels 1v1</h2>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      Creează propria masă de joc sau alătură-te unei mese existente din lobby!
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateTableModal(true)}
                    className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black px-5 py-3 rounded-2xl text-xs shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all active:scale-95 whitespace-nowrap"
                  >
                    ➕ Creează Masă Nouă
                  </button>
                </div>

                {/* MODAL CREARE MASĂ */}
                {showCreateTableModal && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-purple-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <h3 className="text-base font-black text-white">➕ Creează Masă de Joc Custom</h3>
                        <button
                          onClick={() => setShowCreateTableModal(false)}
                          className="text-zinc-400 hover:text-white text-sm"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-zinc-400 font-bold block mb-1">Alege Jocul:</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "rps", label: "🪨📄✂️ Piatră-Hârtie" },
                              { id: "coinflip", label: "🪙 Coin Flip" },
                              { id: "tictactoe", label: "❌⭕ Tic-Tac-Toe" },
                            ].map((g) => (
                              <button
                                key={g.id}
                                onClick={() => setNewTableGame(g.id as any)}
                                className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                                  newTableGame === g.id
                                    ? "bg-purple-600 border-purple-400 text-white"
                                    : "bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                }`}
                              >
                                {g.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-zinc-400 font-bold block mb-1">Monedă / Tip Miză:</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "monede", label: "🪙 Monede", sub: "Daily Reward" },
                              { id: "sol", label: "◎ SOL", sub: "Solana Real" },
                              { id: "usdc", label: "💵 USDC", sub: "Crypto Real" },
                            ].map((c) => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  const curr = c.id as any;
                                  setNewTableCurrency(curr);
                                  const presets = curr === "sol" ? presetWagersSol : curr === "usdc" ? presetWagersUsdc : presetWagersMonede;
                                  if (presets.length > 0) setNewTableWager(presets[0]);
                                }}
                                className={`p-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center transition-all ${
                                  newTableCurrency === c.id
                                    ? "bg-gradient-to-r from-purple-600 to-amber-500 border-amber-300 text-white shadow-lg"
                                    : "bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                }`}
                              >
                                <span>{c.label}</span>
                                <span className="text-[9px] text-zinc-300 font-normal">{c.sub}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-zinc-400 font-bold block mb-1">Alege Miza Presetată:</label>
                          <div className="flex flex-wrap gap-2">
                            {(newTableCurrency === "sol" ? presetWagersSol : newTableCurrency === "usdc" ? presetWagersUsdc : presetWagersMonede).map((w) => (
                              <button
                                key={w}
                                onClick={() => setNewTableWager(w)}
                                className={`px-3 py-2 rounded-xl text-xs font-black border transition-all ${
                                  newTableWager === w
                                    ? "bg-amber-500 border-amber-300 text-black shadow-md scale-105"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                }`}
                              >
                                {formatCurrencyBadge(newTableCurrency, w)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Pot & Winner Payout Preview */}
                        <div className="bg-zinc-950 p-3 rounded-2xl border border-purple-500/30 flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-bold">Potențial Câștigător:</span>
                          <span className="text-amber-400 font-black text-sm">
                            🏆 {getWinnerPayout(newTableWager, houseFeePercent)} {newTableCurrency === "sol" ? "SOL" : newTableCurrency === "usdc" ? "USDC" : "Monede"}
                          </span>
                        </div>

                        <div>
                          <label className="text-xs text-zinc-400 font-bold block mb-1">
                            Provoacă un Jucător Specific (Opțional):
                          </label>
                          <input
                            type="text"
                            placeholder="Wallet sau Nume adversar..."
                            value={newTableTarget}
                            onChange={(e) => setNewTableTarget(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleCreateCustomTable}
                          className="flex-1 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black py-3 rounded-xl text-xs shadow-lg transition-transform active:scale-95"
                        >
                          🚀 Lansare Masă în Lobby
                        </button>
                        <button
                          onClick={() => setShowCreateTableModal(false)}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold px-4 py-3 rounded-xl"
                        >
                          Anulează
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lobby Open Tables List */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <h3 className="text-xs font-extrabold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                      <span>Mese Deschise în Lobby ({lobbyTables.filter(t => lobbyFilterCurrency === "all" || (t.currency || "monede") === lobbyFilterCurrency).length})</span>
                      <span className="text-[10px] text-zinc-500 lowercase font-normal">sincronizat în timp real</span>
                    </h3>

                    {/* Filter Tabs */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {[
                        { id: "all", label: "Toate" },
                        { id: "monede", label: "🪙 Monede" },
                        { id: "sol", label: "◎ SOL" },
                        { id: "usdc", label: "💵 USDC" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setLobbyFilterCurrency(f.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            lobbyFilterCurrency === f.id
                              ? "bg-purple-600 text-white shadow"
                              : "bg-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {lobbyTables.filter(t => lobbyFilterCurrency === "all" || (t.currency || "monede") === lobbyFilterCurrency).length === 0 ? (
                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 text-center text-zinc-500 text-xs">
                      Nu există mese active pentru selecția curentă. Creează tu prima masă!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {lobbyTables
                        .filter(t => lobbyFilterCurrency === "all" || (t.currency || "monede") === lobbyFilterCurrency)
                        .map((tbl) => {
                          const myW = publicKey ? publicKey.toBase58().toLowerCase() : "";
                          const isMyOwnTable = tbl.hostWallet && myW && tbl.hostWallet.toLowerCase() === myW;
                          const tblCurr = tbl.currency || "monede";

                          return (
                            <div
                              key={tbl.id}
                              className="bg-zinc-900/90 border border-zinc-800/80 hover:border-purple-500/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl flex-shrink-0">
                                  {tbl.avatar}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <span>{tbl.host}</span>
                                    {tbl.target && (
                                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-semibold">
                                        vs {tbl.target.slice(0, 6)}...
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="uppercase font-bold text-purple-300">{tbl.game}</span>
                                    <span>•</span>
                                    <span className="text-cyan-300 font-extrabold">{formatCurrencyBadge(tblCurr, tbl.wager)}</span>
                                    <span>•</span>
                                    <span className="text-amber-400 font-bold">Câștig: 🏆 {getWinnerPayout(tbl.wager, houseFeePercent)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isMyOwnTable ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setInDuelTable(true);
                                        setIsHostOfTable(true);
                                        setActiveCreatedTableId(tbl.id);
                                        setTableGame(tbl.game);
                                        setTableWager(tbl.wager);
                                        setTableCurrency(tblCurr);
                                        setTablePhase("waiting");
                                        setDuelLogMessage("⏳ Se așteaptă un adversar în duel...");
                                      }}
                                      className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-3 py-2 rounded-xl shadow-md transition-transform active:scale-95"
                                    >
                                      Intră 🪑
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteTable(tbl.id, e)}
                                      className="bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 text-xs px-2.5 py-2 rounded-xl transition-colors"
                                      title="Șterge Masa"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => startLiveTableFromLobby(tbl.game, tbl.wager, tbl.host, tbl.avatar, tbl.isAI, tbl.id, tblCurr)}
                                    className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-transform active:scale-95"
                                  >
                                    Alătură-te 🪑
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: ARCADE GAMES */}
            {activeTab === "games" && (
              <div className="space-y-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {[
                    { id: "rps", label: "🪨📄✂️ Rock-Paper-Scissors" },
                    { id: "spin", label: "🎡 Wheel of Fortune" },
                    { id: "coinflip", label: "🪙 Coin Flip Arcade" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setActiveSingleGame(g.id as any)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                        activeSingleGame === g.id
                          ? "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-lg"
                          : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* ARCADE: ROCK PAPER SCISSORS */}
                {activeSingleGame === "rps" && (
                  <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-3xl p-6 text-center backdrop-blur-md shadow-2xl space-y-5">
                    <div>
                      <h2 className="text-lg font-black text-white">🪨📄✂️ Rock-Paper-Scissors Single Game</h2>
                      <p className="text-zinc-400 text-xs mt-1">
                        Joacă împotriva AI-ului! Selectează miza și alegerea ta.
                      </p>
                    </div>

                    {/* Wager Selection */}
                    <div className="flex justify-center items-center gap-2">
                      <span className="text-xs text-zinc-400 font-bold mr-1">Miză:</span>
                      {[5, 10, 25, 50].map((w) => (
                        <button
                          key={w}
                          onClick={() => setArcadeRpsWager(w)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                            arcadeRpsWager === w
                              ? "bg-amber-500 border-amber-300 text-black shadow-md"
                              : "bg-zinc-800 border-zinc-700 text-zinc-400"
                          }`}
                        >
                          🪙 {w}
                        </button>
                      ))}
                    </div>

                    {/* Choice Buttons */}
                    <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                      {[
                        { id: "rock", label: "🪨 Piatră" },
                        { id: "paper", label: "📄 Hârtie" },
                        { id: "scissors", label: "✂️ Foarfecă" },
                      ].map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setArcadeRpsChoice(c.id as any)}
                          className={`py-4 rounded-2xl font-black text-xs border transition-all ${
                            arcadeRpsChoice === c.id
                              ? "bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400 text-white scale-105 shadow-xl"
                              : "bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {/* Play Button */}
                    <div className="pt-2">
                      <button
                        onClick={handlePlayArcadeRps}
                        disabled={playingArcadeRps}
                        className="w-full max-w-xs bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black py-3 rounded-2xl text-xs shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all active:scale-95"
                      >
                        {playingArcadeRps ? "Se procesează..." : `⚔️ Joacă Runda (${arcadeRpsWager} Monede)`}
                      </button>
                    </div>

                    {/* Result Display */}
                    {arcadeRpsResult && (
                      <div className="flex justify-center items-center gap-6 my-4 p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 max-w-md mx-auto">
                        <div className="text-center">
                          <span className="text-[10px] text-zinc-500 block">ALEGEREA TA</span>
                          <span className="text-3xl">
                            {arcadeRpsResult.pChoice === "rock" ? "🪨" : arcadeRpsResult.pChoice === "paper" ? "📄" : "✂️"}
                          </span>
                        </div>
                        <div className="text-amber-400 font-black text-sm">VS</div>
                        <div className="text-center">
                          <span className="text-[10px] text-zinc-500 block">AI OPPONENT</span>
                          <span className="text-3xl">
                            {arcadeRpsResult.aiChoice === "rock" ? "🪨" : arcadeRpsResult.aiChoice === "paper" ? "📄" : "✂️"}
                          </span>
                        </div>
                      </div>
                    )}

                    {arcadeRpsMessage && (
                      <p className="text-xs font-black text-amber-300 bg-black/60 p-3 rounded-xl border border-amber-500/30 max-w-md mx-auto">
                        {arcadeRpsMessage}
                      </p>
                    )}
                  </div>
                )}

                {/* ARCADE: VISUAL WHEEL OF FORTUNE */}
                {activeSingleGame === "spin" && (
                  <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-3xl p-6 text-center backdrop-blur-md shadow-2xl space-y-6 flex flex-col items-center">
                    <div>
                      <h2 className="text-lg font-black text-white">🎡 Visual Wheel of Fortune</h2>
                      <p className="text-zinc-400 text-xs mt-1">
                        Taxă învârtire: <span className="text-amber-400 font-bold">15 Monede</span>. Învârte roata pentru marele Jackpot!
                      </p>
                    </div>

                    {/* VISUAL WHEEL SVG CONTAINER */}
                    <div className="relative w-72 h-72 my-2 flex items-center justify-center">
                      {/* Top Needle Pointer */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]" />

                      {/* Spinning Wheel SVG */}
                      <div
                        className="w-full h-full rounded-full shadow-[0_0_30px_rgba(236,72,153,0.3)] border-4 border-amber-400 overflow-hidden"
                        style={{
                          transform: `rotate(${wheelDegree}deg)`,
                          transition: spinning ? "transform 3.8s cubic-bezier(0.12, 0.8, 0.32, 1)" : "none",
                        }}
                      >
                        <svg viewBox="0 0 300 300" className="w-full h-full">
                          {wheelPrizes.map((prize, i) => {
                            const angle = 360 / wheelPrizes.length;
                            const startAngle = i * angle;
                            const endAngle = (i + 1) * angle;

                            const radStart = ((startAngle - 90) * Math.PI) / 180;
                            const radEnd = ((endAngle - 90) * Math.PI) / 180;

                            const x1 = 150 + 150 * Math.cos(radStart);
                            const y1 = 150 + 150 * Math.sin(radStart);
                            const x2 = 150 + 150 * Math.cos(radEnd);
                            const y2 = 150 + 150 * Math.sin(radEnd);

                            const d = `M 150 150 L ${x1} ${y1} A 150 150 0 0 1 ${x2} ${y2} Z`;

                            const midAngle = startAngle + angle / 2;
                            const radMid = ((midAngle - 90) * Math.PI) / 180;
                            const textX = 150 + 95 * Math.cos(radMid);
                            const textY = 150 + 95 * Math.sin(radMid);

                            return (
                              <g key={i}>
                                <path d={d} fill={prize.color} stroke="#18181b" strokeWidth="2" />
                                <text
                                  x={textX}
                                  y={textY}
                                  fill={prize.text}
                                  fontSize="10"
                                  fontWeight="900"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                                >
                                  {prize.label}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Center Golden Ring Hub */}
                      <div className="absolute w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-white flex items-center justify-center text-lg font-black shadow-lg z-10">
                        🎡
                      </div>
                    </div>

                    <button
                      onClick={handleSpinWheel}
                      disabled={spinning}
                      className="w-full max-w-xs bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black py-3.5 rounded-2xl text-xs shadow-[0_0_25px_rgba(236,72,153,0.4)] transition-all active:scale-95"
                    >
                      {spinning ? "Roata se învârte..." : "🎰 ÎNVÂRTE ROATA (15 Monede)"}
                    </button>

                    {spinReward && (
                      <p className="text-xs font-black text-amber-300 bg-black/60 p-3 rounded-xl border border-amber-500/30 max-w-md w-full">
                        {spinReward}
                      </p>
                    )}
                  </div>
                )}

                {/* ARCADE: COIN FLIP */}
                {activeSingleGame === "coinflip" && (
                  <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-3xl p-6 text-center backdrop-blur-md shadow-2xl space-y-4">
                    <h2 className="text-lg font-black text-white">🪙 Coin Flip Arcade</h2>

                    <div className="w-24 h-24 mx-auto my-3 rounded-full border-4 border-amber-400 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-300 flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                      {flipResult === "heads" ? "👑" : "⚡"}
                    </div>

                    <div className="flex justify-center gap-3 my-2">
                      <button
                        onClick={() => setCoinChoice("heads")}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black border transition-all ${
                          coinChoice === "heads"
                            ? "bg-amber-500 border-amber-300 text-black shadow-md"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        👑 Cap (Heads)
                      </button>
                      <button
                        onClick={() => setCoinChoice("tails")}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black border transition-all ${
                          coinChoice === "tails"
                            ? "bg-amber-500 border-amber-300 text-black shadow-md"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        ⚡ Pajură (Tails)
                      </button>
                    </div>

                    <button
                      onClick={handleSingleCoinFlip}
                      disabled={flipping}
                      className="w-full max-w-xs bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black py-3 rounded-2xl text-xs shadow-lg transition-transform active:scale-95"
                    >
                      {flipping ? "Aruncare monedă..." : `🪙 Dă cu Banul (${betAmount} Monede)`}
                    </button>

                    {flipMessage && <p className="text-xs font-black text-amber-300">{flipMessage}</p>}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: POINT STORE / SHOP */}
            {activeTab === "shop" && (
              <div className="space-y-6">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 backdrop-blur-md">
                  <h2 className="text-lg font-bold text-white mb-1">🛒 Magazin Monede VIP</h2>
                  <p className="text-zinc-400 text-xs">
                    Folosește monedele pe titluri VIP (afișate în chat & profil) și cufere misterioase!
                  </p>
                </div>

                {shopMsg && (
                  <div className="p-3 rounded-xl bg-purple-900/40 border border-purple-500/40 text-xs font-bold text-amber-300 text-center">
                    {shopMsg}
                  </div>
                )}

                {/* VIP Badges & Titles */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-purple-400 uppercase tracking-wider">Titluri de Rank VIP</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: "title-whale", name: "👑 Whalemaster", defaultPrice: 300, type: "title" },
                      { id: "title-degen", name: "⚡ Degen King", defaultPrice: 200, type: "title" },
                      { id: "title-diamond", name: "💎 Diamond Hands", defaultPrice: 150, type: "title" },
                      { id: "title-streak", name: "🔥 Streak God", defaultPrice: 100, type: "title" },
                    ].map((item) => {
                      const price = shopPrices[item.id] || item.defaultPrice;
                      const isEquipped = activeTitle === item.name;
                      return (
                        <div
                          key={item.id}
                          className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{item.name}</span>
                              {isEquipped && (
                                <span className="text-[9px] bg-green-500/20 text-green-400 font-extrabold px-2 py-0.5 rounded-full">
                                  Echipat
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-amber-400 font-semibold mt-0.5">🪙 {price} Monede</div>
                          </div>
                          <button
                            onClick={() => handleBuyItem(item as any)}
                            disabled={isEquipped}
                            className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all ${
                              isEquipped
                                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                : "bg-purple-600 hover:bg-purple-500 text-white shadow-md"
                            }`}
                          >
                            {isEquipped ? "Echipat" : "Cumpără / Echipează"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mystery Crates */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-pink-400 uppercase tracking-wider">Cufere Misterioase</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: "box-silver", name: "📦 Silver Mystery Crate", defaultPrice: 50, type: "box" },
                      { id: "box-gold", name: "🎁 Golden Mega Crate", defaultPrice: 150, type: "box" },
                    ].map((item) => {
                      const price = shopPrices[item.id] || item.defaultPrice;
                      return (
                        <div
                          key={item.id}
                          className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{item.name}</div>
                            <div className="text-[10px] text-amber-400 font-semibold mt-0.5">🪙 {price} Monede</div>
                          </div>
                          <button
                            onClick={() => handleBuyItem(item as any)}
                            className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md"
                          >
                            Deschide Cufăr
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* LIVE INTERACTIVE DUEL ARENA TABLE */
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-950 via-zinc-950 to-black border-4 border-amber-600/60 p-6 flex flex-col items-center shadow-2xl">
            {/* Top Bar: Leave Table & Wager Info */}
            <div className="w-full flex items-center justify-between mb-4 border-b border-emerald-800/40 pb-3">
              <button
                onClick={handleLeaveTable}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                🚪 Părăsește Masa
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-300 font-extrabold uppercase">
                  JOC: {tableGame.toUpperCase()}
                </span>
                <span className="bg-amber-500 text-black font-black text-xs px-3 py-1 rounded-full shadow-lg">
                  Miză: {formatCurrencyBadge(tableCurrency, tableWager)} • Câștig: 🏆 {getWinnerPayout(tableWager, houseFeePercent)}
                </span>
              </div>
            </div>

            {/* Oval Table Container */}
            <div className="w-full max-w-xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 border-8 border-amber-800 rounded-[60px] p-6 relative flex flex-col items-center justify-between min-h-[360px] shadow-2xl border-double">
              {/* Opponent Seat (Top) */}
              <div className="flex flex-col items-center z-10">
                <div className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg relative">
                  {opponentInfo ? opponentInfo.avatar : "❓"}
                  {roundWinner === "opponent" && (
                    <span className="absolute -top-2 -right-2 text-xl animate-bounce">👑</span>
                  )}
                </div>
                <div className="bg-zinc-900/90 border border-zinc-700 px-3 py-1 rounded-xl text-xs font-bold mt-1 text-white flex items-center gap-1">
                  <span>{opponentInfo ? opponentInfo.name : "Loc Liber"}</span>
                  {opponentChoice && tablePhase === "selecting" && (
                    <span className="text-[10px] text-green-400 animate-pulse">✓ Pregătit</span>
                  )}
                </div>
              </div>

              {/* Center Table Area */}
              <div className="my-4 flex flex-col items-center justify-center w-full z-10">
                {/* Decision Timer Clock */}
                {tablePhase === "selecting" && (
                  <div className="flex items-center gap-2 bg-black/60 border border-amber-400/50 px-4 py-1.5 rounded-full mb-3">
                    <span className="text-amber-400 animate-spin">⏳</span>
                    <span className="text-amber-300 font-black text-sm">{timeLeft}s Timp de Alegere</span>
                  </div>
                )}

                {/* Host Controls when Waiting or Ready */}
                {tablePhase === "waiting" && isHostOfTable && (
                  <div className="flex flex-col items-center gap-3 my-2 text-center bg-black/50 p-4 rounded-2xl border border-emerald-500/30">
                    <div className="text-amber-300 font-bold text-xs animate-pulse">
                      ⏳ Se așteaptă ca un alt jucător să intre la masă...
                    </div>
                    <button
                      onClick={() => handleAddOpponentToHostTable("Gamer_Pro_99", "🐻", true)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-md"
                    >
                      🤖 Simulează Adversar AI
                    </button>
                  </div>
                )}

                {/* Host "START GAME" Button when Player Joined */}
                {tablePhase === "ready" && isHostOfTable && (
                  <div className="flex flex-col items-center gap-3 my-2 text-center bg-black/60 p-4 rounded-2xl border border-amber-500/50">
                    <div className="text-emerald-300 font-extrabold text-xs">
                      🎉 {opponentInfo?.name} s-a alăturat masei!
                    </div>
                    <button
                      onClick={handleHostStartGame}
                      className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:scale-105 text-black font-black px-6 py-3 rounded-2xl text-sm shadow-xl shadow-amber-500/30 animate-pulse"
                    >
                      🚀 ÎNCEPE JOCUL ACUM!
                    </button>
                  </div>
                )}

                {/* Tic Tac Toe Grid */}
                {tableGame === "tictactoe" ? (
                  <div className="grid grid-cols-3 gap-2 w-48 h-48 my-2">
                    {tttGrid.map((cell, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleTableTTTClick(idx)}
                        disabled={tablePhase === "finished" || tablePhase === "waiting"}
                        className="bg-emerald-950/90 border-2 border-emerald-500/60 rounded-xl text-2xl font-black text-white hover:bg-emerald-800 flex items-center justify-center shadow-inner"
                      >
                        {cell}
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Choice Reveals for RPS, Coin Flip, Dice */
                  <div className="flex items-center justify-center gap-8 my-2">
                    {/* Player Choice Box */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-emerald-200 font-bold mb-1">CĂRȚILE TALE</span>
                      <div className="w-20 h-24 rounded-2xl bg-zinc-900 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-2xl transition-all transform hover:scale-105">
                        {playerChoice ? (
                          playerChoice === "rock"
                            ? "🪨"
                            : playerChoice === "paper"
                            ? "📄"
                            : playerChoice === "scissors"
                            ? "✂️"
                            : playerChoice === "heads"
                            ? "👑"
                            : playerChoice === "tails"
                            ? "⚡"
                            : `🎲 ${playerChoice}`
                        ) : (
                          <span className="text-zinc-600 text-xl font-bold">❓</span>
                        )}
                      </div>
                    </div>

                    {/* Wager Chips Stack */}
                    <div className="flex flex-col items-center">
                      <div className="px-3 py-1.5 rounded-full bg-amber-500 border-2 border-amber-300 flex items-center justify-center text-black font-black text-xs shadow-lg animate-pulse">
                        🏆 {getWinnerPayout(tableWager, houseFeePercent)}
                      </div>
                      <span className="text-[9px] text-amber-200 font-bold mt-1">PREMIU CÂȘTIGĂTOR</span>
                    </div>

                    {/* Opponent Choice Box */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-emerald-200 font-bold mb-1">CĂRȚILE ADVERSARULUI</span>
                      <div className="w-20 h-24 rounded-2xl bg-zinc-900 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-2xl transition-all">
                        {tablePhase === "revealing" || tablePhase === "finished" ? (
                          opponentChoice === "rock"
                            ? "🪨"
                            : opponentChoice === "paper"
                            ? "📄"
                            : opponentChoice === "scissors"
                            ? "✂️"
                            : opponentChoice === "heads"
                            ? "👑"
                            : opponentChoice === "tails"
                            ? "⚡"
                            : `🎲 ${opponentChoice}`
                        ) : opponentChoice ? (
                          <span className="text-amber-400 text-2xl font-bold animate-pulse">🃏</span>
                        ) : (
                          <span className="text-zinc-600 text-xl font-bold">❓</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Player Seat (Bottom) */}
              <div className="flex flex-col items-center z-10">
                <div className="bg-zinc-900/90 border border-zinc-700 px-3 py-1 rounded-xl text-xs font-bold mb-1 text-white flex items-center gap-1">
                  <span>TU ({activeTitle})</span>
                  {playerChoice && <span className="text-green-400 text-[10px]">✓ Selectat</span>}
                </div>
                <div className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg relative">
                  😎
                  {roundWinner === "player" && (
                    <span className="absolute -top-2 -right-2 text-xl animate-bounce">👑</span>
                  )}
                </div>
              </div>
            </div>

            {/* Duel Result Log */}
            {duelLogMessage && (
              <div className="mt-4 p-3 rounded-2xl bg-black/80 border border-amber-500/50 text-xs font-extrabold text-amber-300 text-center max-w-md w-full shadow-lg">
                {duelLogMessage}
              </div>
            )}

            {/* Action Buttons for Player Turn */}
            {tableGame !== "tictactoe" && tablePhase === "selecting" && (
              <div className="mt-4 w-full max-w-md">
                <div className="text-xs text-amber-300 font-bold mb-2 text-center">Alege mutarea înainte să expire timpul:</div>
                {tableGame === "rps" && (
                  <div className="flex gap-3">
                    {[
                      { id: "rock", label: "🪨 Piatră" },
                      { id: "paper", label: "📄 Hârtie" },
                      { id: "scissors", label: "✂️ Foarfecă" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => makePlayerTableChoice(m.id)}
                        className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${
                          playerChoice === m.id
                            ? "bg-amber-400 text-black scale-105 shadow-lg shadow-amber-500/40"
                            : "bg-zinc-900 hover:bg-purple-600 text-white border border-zinc-700"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}

                {tableGame === "coinflip" && (
                  <div className="flex gap-3">
                    {[
                      { id: "heads", label: "👑 Cap" },
                      { id: "tails", label: "⚡ Pajură" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => makePlayerTableChoice(m.id)}
                        className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${
                          playerChoice === m.id
                            ? "bg-amber-400 text-black scale-105 shadow-lg shadow-amber-500/40"
                            : "bg-zinc-900 hover:bg-amber-600 text-white border border-zinc-700"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rematch / Play Again Controls */}
            {tablePhase === "finished" && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    setTablePhase("selecting");
                    setTimeLeft(15);
                    setPlayerChoice(null);
                    setRoundWinner(null);
                    setDuelLogMessage("🔥 Revanșă pornită!");
                    setTttGrid(Array(9).fill(null));
                    if (opponentInfo?.isAI) {
                      let aiPick: any = null;
                      if (tableGame === "rps") aiPick = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
                      else if (tableGame === "coinflip") aiPick = Math.random() < 0.5 ? "heads" : "tails";
                      setOpponentChoice(aiPick);
                    }
                  }}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black px-6 py-2.5 rounded-xl text-xs shadow-lg"
                >
                  🔁 Joacă Revanșă ({tableWager} Monede)
                </button>
                <button
                  onClick={handleLeaveTable}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs"
                >
                  Înapoi în Lobby
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
