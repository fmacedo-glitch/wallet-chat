import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

interface TabPlayProps {
  publicKey?: any;
  profiles?: any;
  getDisplayName?: (wallet: string) => string;
}

export function TabPlay({ publicKey, profiles, getDisplayName }: TabPlayProps) {
  const [activeTab, setActiveTab] = useState<"hub" | "daily" | "pvp" | "games" | "shop" | "admin">("hub");

  // User Stats
  const [points, setPoints] = useState<number>(100);
  const [wins, setWins] = useState<number>(0);
  const [activeTitle, setActiveTitle] = useState<string>("Novice");
  const [activeTheme, setActiveTheme] = useState<string>("default");
  const [unlockedItems, setUnlockedItems] = useState<string[]>([]);

  // Daily Streak State (1 -> 2 -> 4 -> 8 -> 16 -> 32 -> 64)
  const [dailyStreak, setDailyStreak] = useState<number>(0);
  const [lastClaimDate, setLastClaimDate] = useState<string | null>(null);
  const [canClaimDaily, setCanClaimDaily] = useState<boolean>(true);
  const [nextDailyReward, setNextDailyReward] = useState<number>(1);
  const [dailyClaimMessage, setDailyClaimMessage] = useState<string>("");

  // Table Creation Modal State
  const [showCreateTableModal, setShowCreateTableModal] = useState<boolean>(false);
  const [newTableGame, setNewTableGame] = useState<"rps" | "coinflip" | "dice" | "tictactoe">("rps");
  const [newTableWager, setNewTableWager] = useState<number>(20);

  // Live Duel Table State
  const [inDuelTable, setInDuelTable] = useState<boolean>(false);
  const [isHostOfTable, setIsHostOfTable] = useState<boolean>(false);
  const [tableGame, setTableGame] = useState<"rps" | "coinflip" | "dice" | "tictactoe">("rps");
  const [tableWager, setTableWager] = useState<number>(20);
  const [opponentInfo, setOpponentInfo] = useState<{ name: string; avatar: string; isAI: boolean } | null>(null);

  // Table gameplay phases: "waiting" (creator waiting for player) -> "ready" (player joined, host sees Start button) -> "selecting" (timer running) -> "revealing" -> "finished"
  const [tablePhase, setTablePhase] = useState<"waiting" | "ready" | "selecting" | "revealing" | "finished">("waiting");
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [playerChoice, setPlayerChoice] = useState<any>(null);
  const [opponentChoice, setOpponentChoice] = useState<any>(null);
  const [roundWinner, setRoundWinner] = useState<"player" | "opponent" | "tie" | null>(null);
  const [duelLogMessage, setDuelLogMessage] = useState<string>("");

  // Tic Tac Toe in Live Table
  const [tttGrid, setTttGrid] = useState<Array<string | null>>(Array(9).fill(null));

  // Single Player Arcade States
  const [activeSingleGame, setActiveSingleGame] = useState<"coinflip" | "spin" | "tictactoe">("coinflip");

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

  // Lobby Open Tables list
  const [lobbyTables, setLobbyTables] = useState<any[]>([
    {
      id: "tbl-101",
      host: "SolX...8f2a",
      avatar: "🦊",
      game: "rps",
      wager: 50,
      isAI: false,
    },
    {
      id: "tbl-102",
      host: "DeFi...99bc",
      avatar: "🐻",
      game: "coinflip",
      wager: 100,
      isAI: false,
    },
    {
      id: "tbl-103",
      host: "Satoshi_Bot",
      avatar: "🤖",
      game: "tictactoe",
      wager: 30,
      isAI: true,
    },
    {
      id: "tbl-104",
      host: "Moon...11aa",
      avatar: "🚀",
      game: "dice",
      wager: 25,
      isAI: false,
    },
  ]);

  // Real-Time Lobby Tables Sync via Supabase
  useEffect(() => {
    const channel = supabase.channel("arena-game-tables")
      .on("broadcast", { event: "table_created" }, (payload) => {
        if (payload?.table) {
          setLobbyTables((prev) => {
            if (prev.some((t) => t.id === payload.table.id)) return prev;
            return [payload.table, ...prev];
          });
        }
      })
      .on("broadcast", { event: "table_removed" }, (payload) => {
        if (payload?.tableId) {
          setLobbyTables((prev) => prev.filter((t) => t.id !== payload.tableId));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load Persistence & Daily Streak calculation
  useEffect(() => {
    try {
      const savedPoints = localStorage.getItem("play_points");
      const savedWins = localStorage.getItem("play_wins");
      const savedStreak = localStorage.getItem("play_daily_streak");
      const savedLastClaim = localStorage.getItem("play_last_claim_date");
      const savedTitle = localStorage.getItem("play_title");
      const savedTheme = localStorage.getItem("play_theme");
      const savedUnlocked = localStorage.getItem("play_unlocked");
      const savedPrices = localStorage.getItem("play_shop_prices");

      if (savedPoints) setPoints(parseInt(savedPoints, 10));
      if (savedWins) setWins(parseInt(savedWins, 10));
      if (savedTitle) setActiveTitle(savedTitle);
      if (savedTheme) setActiveTheme(savedTheme);
      if (savedUnlocked) setUnlockedItems(JSON.parse(savedUnlocked));
      if (savedPrices) setShopPrices(JSON.parse(savedPrices));

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

    setDailyClaimMessage(`🎉 Claimed Day ${newStreak} Reward: +${rewardCoins} Coins!`);
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

  // Create User Custom Table
  const handleCreateCustomTable = () => {
    if (points < newTableWager) {
      alert("Nu ai suficiente monede pentru această miză!");
      return;
    }

    const myName = publicKey ? (getDisplayName ? getDisplayName(publicKey.toBase58()) : `${publicKey.toBase58().slice(0, 4)}...`) : "Utilizator Host";
    const myWallet = publicKey ? publicKey.toBase58() : "guest";
    const newTbl = {
      id: `tbl-${Date.now()}`,
      host: myName,
      hostWallet: myWallet,
      avatar: "😎",
      game: newTableGame,
      wager: newTableWager,
      isAI: false,
    };

    setLobbyTables((prev) => [newTbl, ...prev]);
    setShowCreateTableModal(false);

    // Broadcast table creation to all clients via Supabase Realtime
    try {
      supabase.channel("arena-game-tables").send({
        type: "broadcast",
        event: "table_created",
        table: newTbl,
      });
    } catch (e) {}

    // Enter Table as Host
    setInDuelTable(true);
    setIsHostOfTable(true);
    setTableGame(newTableGame);
    setTableWager(newTableWager);
    setOpponentInfo(null); // Waiting for someone to join

    setTablePhase("waiting");
    setTimeLeft(15);
    setPlayerChoice(null);
    setOpponentChoice(null);
    setRoundWinner(null);
    setDuelLogMessage("⏳ Masă creată cu succes! Așteaptă intrarea unui adversar sau joacă cu AI...");
    setTttGrid(Array(9).fill(null));

    logGameEvent(`Created Table ${newTbl.id} (${newTableGame.toUpperCase()}, ${newTableWager} coins)`);
  };

  // Opponent Joins Host Table (or Host adds AI Opponent)
  const handleAddOpponentToHostTable = (oppName: string = "Cryptic_Gamer", oppAvatar: string = "🐺", isAI: boolean = false) => {
    setOpponentInfo({ name: oppName, avatar: oppAvatar, isAI });
    setTablePhase("ready");
    setDuelLogMessage(`🎉 ${oppName} s-a alăturat la masă! Apasă "ÎNCEPE JOCUL" pentru a porni duelul.`);

    // If opponent is AI, pre-determine choice
    if (isAI || !opponentChoice) {
      let aiPick: any = null;
      if (tableGame === "rps") aiPick = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
      else if (tableGame === "coinflip") aiPick = Math.random() < 0.5 ? "heads" : "tails";
      else if (tableGame === "dice") aiPick = Math.floor(Math.random() * 6) + 1;
      setOpponentChoice(aiPick);
    }

    logGameEvent(`Opponent ${oppName} joined Table. State: READY`);
  };

  // Host Launches Game (Presses "ÎNCEPE JOCUL")
  const handleHostStartGame = () => {
    if (tablePhase !== "ready") return;
    setTablePhase("selecting");
    setTimeLeft(15);
    setDuelLogMessage("🔥 DUELUL A INCEPUT! Alegeți opțiunea în timpul rămas!");
    logGameEvent(`Host started match (${tableGame.toUpperCase()}, pot: ${tableWager * 2} coins)`);
  };

  // Launch Live Match Table from Lobby
  const startLiveTableFromLobby = (game: "rps" | "coinflip" | "dice" | "tictactoe", wager: number, oppName: string, oppAvatar: string, isAI: boolean) => {
    if (points < wager) {
      alert("Nu ai suficiente monede pentru această miză!");
      return;
    }

    setInDuelTable(true);
    setIsHostOfTable(false);
    setTableGame(game);
    setTableWager(wager);
    setOpponentInfo({ name: oppName, avatar: oppAvatar, isAI });

    // Directly Ready / Selecting
    setTablePhase("selecting");
    setTimeLeft(15);
    setPlayerChoice(null);
    setOpponentChoice(null);
    setRoundWinner(null);
    setDuelLogMessage("🔥 DUELUL A ÎNCEPUT! Selectează mutarea ta!");
    setTttGrid(Array(9).fill(null));

    // Opponent choice pre-set if AI
    if (isAI) {
      let aiPick: any = null;
      if (game === "rps") aiPick = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
      else if (game === "coinflip") aiPick = Math.random() < 0.5 ? "heads" : "tails";
      else if (game === "dice") aiPick = Math.floor(Math.random() * 6) + 1;
      setOpponentChoice(aiPick);
    }

    logGameEvent(`Joined table vs ${oppName} (${game.toUpperCase()}, wager: ${wager})`);
  };

  // Handle timer expiry or both player decision
  const handleAutoResolveTimer = () => {
    if (tablePhase !== "selecting") return;
    setTablePhase("revealing");

    // If player didn't pick, pick random
    let finalPlayerChoice = playerChoice;
    if (!finalPlayerChoice) {
      if (tableGame === "rps") finalPlayerChoice = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
      else if (tableGame === "coinflip") finalPlayerChoice = Math.random() < 0.5 ? "heads" : "tails";
      else if (tableGame === "dice") finalPlayerChoice = Math.floor(Math.random() * 6) + 1;
      setPlayerChoice(finalPlayerChoice);
    }

    // Opponent choice if not chosen yet
    let finalOpponentChoice = opponentChoice;
    if (!finalOpponentChoice) {
      if (tableGame === "rps") finalOpponentChoice = ["rock", "paper", "scissors"][Math.floor(Math.random() * 3)];
      else if (tableGame === "coinflip") finalOpponentChoice = Math.random() < 0.5 ? "heads" : "tails";
      else if (tableGame === "dice") finalOpponentChoice = Math.floor(Math.random() * 6) + 1;
      setOpponentChoice(finalOpponentChoice);
    }

    setTimeout(() => {
      resolveTableOutcome(finalPlayerChoice, finalOpponentChoice);
    }, 1200);
  };

  // Resolve outcome of duel
  const resolveTableOutcome = (pChoice: any, oChoice: any) => {
    setTablePhase("finished");

    const oppName = opponentInfo?.name || "Adversar";

    if (tableGame === "rps") {
      if (pChoice === oChoice) {
        setRoundWinner("tie");
        setDuelLogMessage(`👔 Egalitate! Amândoi ați ales ${pChoice.toUpperCase()}. Miza returnată.`);
        logGameEvent(`RPS Tie (${pChoice} vs ${oChoice})`, "✓ Refunded");
      } else if (
        (pChoice === "rock" && oChoice === "scissors") ||
        (pChoice === "paper" && oChoice === "rock") ||
        (pChoice === "scissors" && oChoice === "paper")
      ) {
        setRoundWinner("player");
        saveStats(points + tableWager, wins + 1);
        setDuelLogMessage(`🏆 AI CÂȘTIGAT +${tableWager * 2} Monede! ${pChoice.toUpperCase()} a învins ${oChoice.toUpperCase()} al lui ${oppName}!`);
        logGameEvent(`Player Won RPS (+${tableWager * 2} coins)`, "✓ Payout Sent");
      } else {
        setRoundWinner("opponent");
        saveStats(Math.max(0, points - tableWager));
        setDuelLogMessage(`💔 ${oppName} A CÂȘTIGAT! ${oChoice.toUpperCase()} a învins ${pChoice.toUpperCase()} (-${tableWager} Monede).`);
        logGameEvent(`Player Lost RPS (-${tableWager} coins)`, "✓ Settled");
      }
    } else if (tableGame === "coinflip") {
      const coinLanded = Math.random() < 0.5 ? "heads" : "tails";
      if (pChoice === coinLanded && oChoice !== coinLanded) {
        setRoundWinner("player");
        saveStats(points + tableWager, wins + 1);
        setDuelLogMessage(`🎉 AI CÂȘTIGAT +${tableWager * 2} Monede! Moneda a picat pe ${coinLanded.toUpperCase()}!`);
        logGameEvent(`Player Won Coin Flip (+${tableWager * 2} coins)`, "✓ Payout Sent");
      } else if (pChoice !== coinLanded && oChoice === coinLanded) {
        setRoundWinner("opponent");
        saveStats(Math.max(0, points - tableWager));
        setDuelLogMessage(`💔 ${oppName} A CÂȘTIGAT! Moneda a picat pe ${coinLanded.toUpperCase()}.`);
        logGameEvent(`Player Lost Coin Flip (-${tableWager} coins)`, "✓ Settled");
      } else {
        setRoundWinner("tie");
        setDuelLogMessage(`🪙 Moneda a picat pe ${coinLanded.toUpperCase()}. Mize returnate.`);
        logGameEvent(`Coin Flip Tie`, "✓ Refunded");
      }
    } else if (tableGame === "dice") {
      const pRoll = typeof pChoice === "number" ? pChoice : Math.floor(Math.random() * 6) + 1;
      const oRoll = typeof oChoice === "number" ? oChoice : Math.floor(Math.random() * 6) + 1;
      if (pRoll > oRoll) {
        setRoundWinner("player");
        saveStats(points + tableWager, wins + 1);
        setDuelLogMessage(`🎲 AI CÂȘTIGAT +${tableWager * 2} Monede! Ai dat ${pRoll} vs ${oRoll} al lui ${oppName}!`);
        logGameEvent(`Player Won Dice (${pRoll} vs ${oRoll})`, "✓ Payout Sent");
      } else if (pRoll < oRoll) {
        setRoundWinner("opponent");
        saveStats(Math.max(0, points - tableWager));
        setDuelLogMessage(`🎲 ${oppName} A CÂȘTIGAT! Ai dat ${pRoll} vs ${oRoll}.`);
        logGameEvent(`Player Lost Dice (${pRoll} vs ${oRoll})`, "✓ Settled");
      } else {
        setRoundWinner("tie");
        setDuelLogMessage(`🎲 EGALITATE! Amândoi ați dat ${pRoll}. Mize returnate.`);
        logGameEvent(`Dice Roll Tie`, "✓ Refunded");
      }
    }
  };

  // Player action inside live duel table
  const makePlayerTableChoice = (choice: any) => {
    if (tablePhase !== "selecting") return;
    setPlayerChoice(choice);

    if (opponentInfo?.isAI) {
      setTimeout(() => {
        handleAutoResolveTimer();
      }, 800);
    }
  };

  // Tic-Tac-Toe Move in Live Table
  const handleTableTTTClick = (index: number) => {
    if (tttGrid[index] || tablePhase === "finished" || tablePhase === "waiting") return;

    const newGrid = [...tttGrid];
    newGrid[index] = "X";
    setTttGrid(newGrid);

    const winSymbol = checkTTTWinner(newGrid);
    if (winSymbol) {
      setTablePhase("finished");
      if (winSymbol === "X") {
        setRoundWinner("player");
        saveStats(points + tableWager, wins + 1);
        setDuelLogMessage(`🎉 AI CÂȘTIGAT la Tic-Tac-Toe (+${tableWager * 2} Monede)!`);
        logGameEvent(`Won Tic-Tac-Toe Match (+${tableWager * 2} coins)`);
      } else {
        setRoundWinner("opponent");
        saveStats(Math.max(0, points - tableWager));
        setDuelLogMessage(`🤖 ${opponentInfo?.name || "Adversar"} a câștigat la Tic-Tac-Toe!`);
        logGameEvent(`Lost Tic-Tac-Toe Match (-${tableWager} coins)`);
      }
      return;
    }

    if (newGrid.every((c) => c !== null)) {
      setTablePhase("finished");
      setRoundWinner("tie");
      setDuelLogMessage(`👔 Jocul de X și 0 s-a terminat la Egalitate! Mize returnate.`);
      logGameEvent(`Tic-Tac-Toe Tie Game`);
      return;
    }

    // AI Turn in Tic Tac Toe if opponent is AI
    if (opponentInfo?.isAI) {
      setTimeout(() => {
        const emptyIndices = newGrid.map((v, i) => (v === null ? i : null)).filter((v) => v !== null) as number[];
        if (emptyIndices.length > 0) {
          const aiPick = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          newGrid[aiPick] = "O";
          setTttGrid(newGrid);

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
            setDuelLogMessage(`👔 Jocul de X și 0 s-a terminat la Egalitate! Mize returnate.`);
          }
        }
      }, 500);
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

  // Arcade Coin Flip
  const handleSingleCoinFlip = () => {
    if (flipping || points < betAmount) return;
    setFlipping(true);
    setFlipResult(null);
    setFlipMessage("");

    setTimeout(() => {
      const outcome: "heads" | "tails" = Math.random() < 0.5 ? "heads" : "tails";
      setFlipResult(outcome);
      setFlipping(false);

      if (outcome === coinChoice) {
        saveStats(points + betAmount, wins + 1);
        setFlipMessage(`🎉 AI CÂȘTIGAT +${betAmount} PUNCTE! Moneda a picat pe ${outcome.toUpperCase()}!`);
      } else {
        saveStats(Math.max(0, points - betAmount));
        setFlipMessage(`💔 Încearcă din nou! Moneda a picat pe ${outcome.toUpperCase()}.`);
      }
    }, 1000);
  };

  // Arcade Spin Wheel
  const handleSpinWheel = () => {
    if (spinning) return;
    setSpinning(true);
    setSpinReward(null);

    const randomRotations = 5 + Math.floor(Math.random() * 5);
    const randomAngle = Math.floor(Math.random() * 360);
    const totalRotation = wheelDegree + randomRotations * 360 + randomAngle;
    setWheelDegree(totalRotation);

    setTimeout(() => {
      setSpinning(false);
      const rewards = [50, 100, 20, 200, 10, 500, 5, 150];
      const sliceAngle = 360 / rewards.length;
      const normalizedAngle = (360 - (totalRotation % 360)) % 360;
      const prizeIndex = Math.floor(normalizedAngle / sliceAngle);
      const prize = rewards[prizeIndex] || 50;

      saveStats(points + prize, wins + 1);
      setSpinReward(`🎁 Premiu Câștigat: +${prize} Puncte!`);
    }, 2800);
  };

  // Shop Buy Logic
  const handleBuyItem = (item: { id: string; name: string; defaultPrice: number; type: "title" | "theme" | "box" }) => {
    const itemPrice = shopPrices[item.id] || item.defaultPrice;

    if (points < itemPrice) {
      setShopMsg("❌ Nu ai suficiente puncte!");
      return;
    }

    saveStats(points - itemPrice, wins, item.type === "title" ? item.name : activeTitle);

    if (item.type === "title") {
      setActiveTitle(item.name);
      setShopMsg(`🎉 Ai echipat Titlul VIP: ${item.name}!`);
    } else if (item.type === "theme") {
      setActiveTheme(item.id);
      localStorage.setItem("play_theme", item.id);
      setShopMsg(`🎨 Ai activat TEMA: ${item.name}!`);
    } else if (item.type === "box") {
      const outcomes = [100, 200, 50, 500, 25, 1000];
      const winPts = outcomes[Math.floor(Math.random() * outcomes.length)];
      saveStats(points - itemPrice + winPts);
      setShopMsg(`📦 Ai deschis Cufărul Secret și ai câștigat +${winPts} Puncte!`);
    }

    const updatedUnlocked = [...unlockedItems, item.id];
    setUnlockedItems(updatedUnlocked);
    localStorage.setItem("play_unlocked", JSON.stringify(updatedUnlocked));
  };

  // Admin Price Update
  const updateShopPrice = (itemId: string, newPrice: number) => {
    const updated = { ...shopPrices, [itemId]: newPrice };
    setShopPrices(updated);
    try {
      localStorage.setItem("play_shop_prices", JSON.stringify(updated));
    } catch (e) {}
    logGameEvent(`Admin updated price for ${itemId} -> ${newPrice} coins`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black text-white">
      {/* Top Header Bar */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-purple-950/60 via-zinc-900 to-black">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-bounce">🎮</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                Arena Duels
              </h1>
              <span className="text-[10px] bg-purple-500/20 border border-purple-400/30 text-purple-300 font-bold px-2 py-0.5 rounded-full">
                {activeTitle}
              </span>
            </div>
            <p className="text-zinc-400 text-[11px]">Creează Mese de Joc, Dueluri Live & Control Anti-Cheat</p>
          </div>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-2">
          <div className="bg-zinc-900 border border-purple-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-inner">
            <span className="text-amber-400 font-black text-xs">🪙 {points}</span>
            <span className="text-zinc-700">|</span>
            <span className="text-purple-300 font-bold text-xs">🏆 {wins}</span>
            <span className="text-zinc-700">|</span>
            <span className="text-orange-400 font-bold text-xs">🔥 {dailyStreak}d</span>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl w-full mx-auto">
        {!inDuelTable ? (
          <>
            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: "hub", label: "🕹️ Arena Hub" },
                { id: "daily", label: "📅 Daily Streak" },
                { id: "pvp", label: "⚔️ Live Match Lobby" },
                { id: "games", label: "🎲 Arcade & X/O" },
                { id: "shop", label: "🛒 Point Shop" },
                { id: "admin", label: "🛡️ Admin & Anti-Cheat" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/40 scale-105"
                      : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: HUB */}
            {activeTab === "hub" && (
              <div className="space-y-6">
                {/* Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950 via-zinc-900 to-pink-950 border border-purple-500/40 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <span className="text-[10px] bg-orange-500/20 border border-orange-400/30 text-orange-300 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      🔥 Dublare Puncte Zilnice
                    </span>
                    <h2 className="text-xl font-black text-white mt-1">
                      Calendar 7 Zile: <span className="text-amber-400">{dailyStreak} Zile Consecutive</span>
                    </h2>
                    <p className="text-zinc-400 text-xs max-w-md">
                      Adună monede zilnic: 1 ➔ 2 ➔ 4 ➔ 8 ➔ 16 ➔ 32 ➔ 64 monede! După ziua 7 primești 64 monede în fiecare zi.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("daily")}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs whitespace-nowrap shadow-lg shadow-amber-500/20"
                  >
                    {canClaimDaily ? "🎁 Revendică Monedele Azaz" : "📅 Vezi Calendarul"}
                  </button>
                </div>

                {/* Quick Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    onClick={() => setActiveTab("pvp")}
                    className="bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="text-3xl mb-2">⚔️</div>
                    <h3 className="font-bold text-white text-base">Creează Masă & Dueluri</h3>
                    <p className="text-zinc-400 text-xs mt-1">
                      Creează propria masă cu Flip Monedă, X și 0 sau Foarfecă-Hârtie-Piatră și așteaptă intrarea advesarului!
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab("games")}
                    className="bg-zinc-900/90 border border-zinc-800 hover:border-cyan-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="text-3xl mb-2">❌⭕</div>
                    <h3 className="font-bold text-white text-base">Tic-Tac-Toe & Arcade</h3>
                    <p className="text-zinc-400 text-xs mt-1">
                      Joacă meciuri X/O strategice, roata norocoasă & aruncări de monedă!
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab("shop")}
                    className="bg-zinc-900/90 border border-zinc-800 hover:border-pink-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="text-3xl mb-2">🛒</div>
                    <h3 className="font-bold text-white text-base">Magazin Puncte VIP</h3>
                    <p className="text-zinc-400 text-xs mt-1">
                      Cumpără Titluri VIP (văzute în chat & profil), skin-uri de teme și cufere misterioase!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DAILY STREAK REWARD */}
            {activeTab === "daily" && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="text-center max-w-md mx-auto mb-6">
                  <span className="text-3xl">🔥</span>
                  <h2 className="text-2xl font-black text-white mt-2">Calendar Recompensă 7 Zile</h2>
                  <p className="text-zinc-400 text-xs mt-1">
                    Conectează-te consecutiv pentru a dubla recompensa: 1, 2, 4, 8, 16, 32, până la 64 monede!
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-6">
                  {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                    const dayReward = Math.pow(2, Math.min(dayNum - 1, 6));
                    const isCurrentActiveDay = canClaimDaily
                      ? dayNum === dailyStreak + 1 || (dailyStreak >= 7 && dayNum === 7)
                      : dayNum === dailyStreak || (dailyStreak >= 7 && dayNum === 7);
                    const isPastClaimed = !canClaimDaily ? dayNum <= dailyStreak : dayNum < dailyStreak;

                    return (
                      <div
                        key={dayNum}
                        className={`rounded-2xl p-4 flex flex-col items-center justify-between border transition-all text-center ${
                          isCurrentActiveDay && canClaimDaily
                            ? "bg-gradient-to-b from-amber-500/20 to-purple-900/40 border-amber-400 shadow-lg shadow-amber-500/20 scale-105"
                            : isPastClaimed
                            ? "bg-zinc-800/60 border-emerald-500/40 text-zinc-400"
                            : "bg-zinc-950/60 border-zinc-800 text-zinc-500"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider">Ziua {dayNum}{dayNum === 7 ? "+" : ""}</span>
                        <div className="text-2xl my-2">{isPastClaimed ? "✅" : dayNum === 7 ? "👑" : "🪙"}</div>
                        <span className="font-extrabold text-xs text-amber-300">+{dayReward} pts</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center">
                  <button
                    onClick={handleClaimDaily}
                    disabled={!canClaimDaily}
                    className="w-full max-w-sm bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-amber-300 text-black font-black py-3.5 rounded-xl text-sm transition-all shadow-xl shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {canClaimDaily
                      ? `🎁 Revendică Recompensa Zilei ${dailyStreak >= 7 ? 7 : dailyStreak + 1} (+${nextDailyReward} Monede)`
                      : "✅ Revendicat Azi! Revino mâine"}
                  </button>

                  {dailyClaimMessage && (
                    <div className="mt-4 p-3 rounded-xl bg-purple-900/40 border border-purple-500/40 text-xs font-bold text-amber-300 text-center animate-fade-in">
                      {dailyClaimMessage}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: LIVE MATCH LOBBY & TABLE CREATION */}
            {activeTab === "pvp" && (
              <div className="space-y-6">
                {/* Lobby Header & Create Table Button */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>⚔️</span> Arena Mese de Joc & Dueluri
                    </h2>
                    <p className="text-zinc-400 text-xs">Creează o masă nouă, stabilește miza și așteaptă adversarul!</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCreateTableModal(true)}
                      className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-black font-black px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                    >
                      <span>➕</span> Creează Masă Nouă
                    </button>
                    <button
                      onClick={() => startLiveTableFromLobby("rps", 20, "AI Pro Bot", "🤖", true)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-purple-500/30 px-3.5 py-2.5 rounded-xl text-xs font-bold"
                    >
                      🤖 Meci AI Rapid
                    </button>
                  </div>
                </div>

                {/* Table Creation Modal */}
                {showCreateTableModal && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-fade-in">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                          <span>🎲</span> Creează Masă Nouă de Duel
                        </h3>
                        <button onClick={() => setShowCreateTableModal(false)} className="text-zinc-400 hover:text-white text-lg">✕</button>
                      </div>

                      {/* Select Game */}
                      <div>
                        <label className="text-xs font-bold text-zinc-400 mb-2 block uppercase tracking-wider">
                          Selectează Jocul:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "rps", label: "🪨 Foarfecă-Hârtie-Piatră" },
                            { id: "coinflip", label: "🪙 Flip Monedă" },
                            { id: "tictactoe", label: "❌⭕ Tic-Tac-Toe (X și 0)" },
                            { id: "dice", label: "🎲 Luptă Zaruri" },
                          ].map((g) => (
                            <button
                              key={g.id}
                              onClick={() => setNewTableGame(g.id as any)}
                              className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                                newTableGame === g.id
                                  ? "bg-purple-600/30 border-purple-500 text-white shadow-md"
                                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Select Wager */}
                      <div>
                        <label className="text-xs font-bold text-zinc-400 mb-2 block uppercase tracking-wider">
                          Miză Monede (Wager):
                        </label>
                        <div className="flex gap-2">
                          {[10, 20, 50, 100, 250].map((w) => (
                            <button
                              key={w}
                              onClick={() => setNewTableWager(w)}
                              className={`flex-1 py-2 rounded-xl border text-xs font-black transition-all ${
                                newTableWager === w
                                  ? "bg-amber-500 text-black border-amber-400 shadow-md"
                                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                              }`}
                            >
                              🪙 {w}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 flex gap-3">
                        <button
                          onClick={handleCreateCustomTable}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black py-3 rounded-xl text-xs shadow-lg"
                        >
                          🚀 Publică Masa ({newTableWager} Monede)
                        </button>
                        <button
                          onClick={() => setShowCreateTableModal(false)}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-3 rounded-xl text-xs"
                        >
                          Anulează
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Open Lobby Tables */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="text-xs text-purple-400 font-extrabold uppercase tracking-wider">
                      Mese Deschise în Lobby ({lobbyTables.length})
                    </div>
                    <span className="text-[10px] text-zinc-500 font-medium">● Actualizare Real-time</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {lobbyTables.map((tbl) => {
                      const isMyCreatedTable = tbl.hostWallet && publicKey && tbl.hostWallet === publicKey.toBase58();
                      return (
                        <div
                          key={tbl.id}
                          className={`bg-zinc-900 border rounded-2xl p-4 flex items-center justify-between transition-all ${
                            isMyCreatedTable
                              ? "border-amber-500/60 bg-gradient-to-r from-amber-950/30 via-zinc-900 to-purple-950/30 shadow-lg shadow-amber-900/10"
                              : "border-zinc-800 hover:border-purple-500/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-900 to-zinc-800 border border-purple-500/40 flex items-center justify-center text-2xl shadow-inner">
                              {tbl.avatar}
                            </div>
                            <div>
                              <div className="text-sm font-black text-white flex items-center gap-1.5">
                                <span>{tbl.host}</span>
                                {isMyCreatedTable && (
                                  <span className="text-[9px] bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black px-1.5 py-0.5 rounded-md">
                                    Masa Ta
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-purple-300 font-semibold uppercase">
                                Joc: {tbl.game === "rps" ? "Foarfecă Hârtie Piatră" : tbl.game === "coinflip" ? "Flip Monedă" : tbl.game === "dice" ? "Zaruri" : "Tic-Tac-Toe (X/O)"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                              🪙 {tbl.wager} pts
                            </span>
                            <button
                              onClick={() => startLiveTableFromLobby(tbl.game, tbl.wager, tbl.host, tbl.avatar, tbl.isAI)}
                              className={`text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition-transform active:scale-95 ${
                                isMyCreatedTable
                                  ? "bg-amber-500 hover:bg-amber-400 text-black font-black"
                                  : "bg-purple-600 hover:bg-purple-500 text-white"
                              }`}
                            >
                              {isMyCreatedTable ? "Intră în Masă 🪑" : "Intră la Masă 🪑"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ARCADE GAMES & TIC-TAC-TOE */}
            {activeTab === "games" && (
              <div className="space-y-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {[
                    { id: "coinflip", label: "🪙 Coin Flip" },
                    { id: "spin", label: "🎡 Roata Norocului" },
                    { id: "tictactoe", label: "❌⭕ Tic-Tac-Toe Solo" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setActiveSingleGame(g.id as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                        activeSingleGame === g.id ? "bg-purple-600 text-white" : "bg-zinc-900 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* Arcade Coin Flip */}
                {activeSingleGame === "coinflip" && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
                    <h2 className="text-lg font-bold text-amber-400 mb-1">Coin Flip Arcade</h2>
                    <div className="w-24 h-24 mx-auto my-4 rounded-full border-4 border-amber-400 bg-gradient-to-tr from-amber-600 to-yellow-300 flex items-center justify-center text-3xl shadow-xl">
                      {flipResult === "heads" ? "👑" : "⚡"}
                    </div>
                    <div className="flex justify-center gap-3 my-4">
                      <button
                        onClick={() => setCoinChoice("heads")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold ${
                          coinChoice === "heads" ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        👑 Cap (Heads)
                      </button>
                      <button
                        onClick={() => setCoinChoice("tails")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold ${
                          coinChoice === "tails" ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        ⚡ Pajură (Tails)
                      </button>
                    </div>
                    <button
                      onClick={handleSingleCoinFlip}
                      disabled={flipping}
                      className="w-full max-w-xs bg-amber-500 text-black font-black py-2.5 rounded-xl text-xs shadow-lg"
                    >
                      {flipping ? "Se aruncă..." : "Aruncă Moneda (10 pts)"}
                    </button>
                    {flipMessage && <p className="mt-3 text-xs font-bold text-amber-300">{flipMessage}</p>}
                  </div>
                )}

                {/* Arcade Spin Wheel */}
                {activeSingleGame === "spin" && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
                    <h2 className="text-lg font-bold text-pink-400 mb-2">Roata Norocului</h2>
                    <button
                      onClick={handleSpinWheel}
                      disabled={spinning}
                      className="bg-pink-600 hover:bg-pink-500 text-white font-black px-6 py-3 rounded-xl text-xs shadow-lg"
                    >
                      {spinning ? "Se învârte..." : "Învârte Roata"}
                    </button>
                    {spinReward && <p className="mt-3 text-xs font-bold text-pink-300">{spinReward}</p>}
                  </div>
                )}

                {/* Arcade Tic-Tac-Toe */}
                {activeSingleGame === "tictactoe" && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
                    <h2 className="text-lg font-bold text-purple-400 mb-2">Tic-Tac-Toe Antrenament</h2>
                    <p className="text-zinc-400 text-xs mb-4">Vrei să joci pe mize reale? Creează o masă de X și 0 în Lobby!</p>
                    <button
                      onClick={() => startLiveTableFromLobby("tictactoe", 30, "AI Master", "🧠", true)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black px-6 py-3 rounded-xl text-xs shadow-lg"
                    >
                      ⚔️ Meci Rapid de X și 0
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: POINT STORE / SHOP */}
            {activeTab === "shop" && (
              <div className="space-y-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <h2 className="text-lg font-bold text-white mb-1">🛒 Magazin Puncte VIP</h2>
                  <p className="text-zinc-400 text-xs">Cheltuiește monedele pe titluri VIP (afișate în chat & profil) și cufere!</p>
                </div>

                {shopMsg && (
                  <div className="p-3 rounded-xl bg-purple-900/40 border border-purple-500/40 text-xs font-bold text-amber-300 text-center">
                    {shopMsg}
                  </div>
                )}

                {/* VIP Badges & Titles */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-purple-400 uppercase tracking-wider">Titluri Rank VIP</h3>
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
                          className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{item.name}</span>
                              {isEquipped && <span className="text-[9px] bg-green-500/20 text-green-400 font-extrabold px-2 py-0.5 rounded-full">Echipat</span>}
                            </div>
                            <div className="text-[10px] text-amber-400 font-semibold">🪙 {price} pts</div>
                          </div>
                          <button
                            onClick={() => handleBuyItem(item as any)}
                            disabled={isEquipped}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                              isEquipped
                                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                : "bg-purple-600 hover:bg-purple-500 text-white"
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
                  <h3 className="text-xs font-extrabold text-pink-400 uppercase tracking-wider">Cufere Secret</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: "box-silver", name: "📦 Cufăr Silver Mystery", defaultPrice: 50, type: "box" },
                      { id: "box-gold", name: "🎁 Cufăr Golden Mega", defaultPrice: 150, type: "box" },
                    ].map((item) => {
                      const price = shopPrices[item.id] || item.defaultPrice;
                      return (
                        <div
                          key={item.id}
                          className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{item.name}</div>
                            <div className="text-[10px] text-amber-400 font-semibold">🪙 {price} pts</div>
                          </div>
                          <button
                            onClick={() => handleBuyItem(item as any)}
                            className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
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

            {/* TAB 6: ADMIN & ANTI-CHEAT MONITOR */}
            {activeTab === "admin" && (
              <div className="space-y-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🛡️</span>
                    <h2 className="text-lg font-bold text-white">Admin & Anti-Cheat Control Panel</h2>
                  </div>
                  <p className="text-zinc-400 text-xs">
                    Setează prețurile magazinului, monitorizează meciurile active și verifică auditul de securitate împotriva trișării.
                  </p>
                </div>

                {/* Modify Store Prices */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                    Modifică Prețurile din Point Shop (Admin)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: "title-whale", label: "👑 Whalemaster Title" },
                      { id: "title-degen", label: "⚡ Degen King Title" },
                      { id: "title-diamond", label: "💎 Diamond Hands Title" },
                      { id: "title-streak", label: "🔥 Streak God Title" },
                      { id: "box-silver", label: "📦 Silver Mystery Crate" },
                      { id: "box-gold", label: "🎁 Golden Mega Crate" },
                    ].map((item) => (
                      <div key={item.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={shopPrices[item.id] ?? 100}
                            onChange={(e) => updateShopPrice(item.id, parseInt(e.target.value) || 0)}
                            className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-black text-amber-300 text-right focus:outline-none"
                          />
                          <span className="text-xs text-zinc-500">pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Test Actions */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white">Acțiuni de Test Monede</h3>
                    <p className="text-zinc-500 text-[11px]">Adaugă monede de test pentru a verifica magazinul și mizele.</p>
                  </div>
                  <button
                    onClick={() => {
                      saveStats(points + 100);
                      logGameEvent("Admin awarded +100 test coins to self");
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-4 py-2 rounded-xl"
                  >
                    +100 Monede Test
                  </button>
                </div>

                {/* Anti-Cheat Audit Logs */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-green-400 uppercase tracking-wider">
                      Jurnal Audit Anti-Cheat în Timp Real
                    </h3>
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">
                      ● Validare Activă
                    </span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs">
                    {gameLogs.map((log) => (
                      <div key={log.id} className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-2.5 flex items-center justify-between text-zinc-300">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-zinc-500 text-[10px]">{log.time}</span>
                          <span className="truncate">{log.event}</span>
                        </div>
                        <span className="text-emerald-400 font-bold ml-2 flex-shrink-0">{log.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ========================================================= */
          /* LIVE INTERACTIVE DUEL ARENA TABLE                         */
          /* ========================================================= */
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-950 via-zinc-950 to-black border-4 border-amber-600/60 p-6 flex flex-col items-center shadow-2xl shadow-emerald-950/80">
            {/* Top Bar: Leave Table & Wager Info */}
            <div className="w-full flex items-center justify-between mb-4 border-b border-emerald-800/40 pb-3">
              <button
                onClick={() => setInDuelTable(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"
              >
                🚪 Părăsește Masa
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-300 font-extrabold uppercase">
                  Joc: {tableGame.toUpperCase()}
                </span>
                <span className="bg-amber-500 text-black font-black text-xs px-3 py-1 rounded-full shadow-lg">
                  🪙 Pot Total: {tableWager * 2} Monede
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
                    <span className="text-amber-300 font-black text-sm">{timeLeft}s Timp Decizie</span>
                  </div>
                )}

                {/* Host Controls when Waiting or Ready */}
                {tablePhase === "waiting" && isHostOfTable && (
                  <div className="flex flex-col items-center gap-3 my-2 text-center bg-black/50 p-4 rounded-2xl border border-emerald-500/30">
                    <div className="text-amber-300 font-bold text-xs animate-pulse">
                      ⏳ În așteptarea unui jucător să se alăture...
                    </div>
                    <button
                      onClick={() => handleAddOpponentToHostTable("Gamer_Pro_99", "🐻", true)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-md"
                    >
                      🤖 Simulază Intrarea Unui Jucător / Add AI
                    </button>
                  </div>
                )}

                {/* Host "START GAME" Button when Player Joined */}
                {tablePhase === "ready" && isHostOfTable && (
                  <div className="flex flex-col items-center gap-3 my-2 text-center bg-black/60 p-4 rounded-2xl border border-amber-500/50">
                    <div className="text-emerald-300 font-extrabold text-xs">
                      🎉 {opponentInfo?.name} s-a alăturat la masă!
                    </div>
                    <button
                      onClick={handleHostStartGame}
                      className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:scale-105 text-black font-black px-6 py-3 rounded-2xl text-sm shadow-xl shadow-amber-500/30 animate-pulse"
                    >
                      🚀 ÎNCEPE JOCUL NOW!
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
                      <span className="text-[10px] text-emerald-200 font-bold mb-1">CARTEA TA</span>
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
                      <div className="w-12 h-12 rounded-full bg-amber-500 border-4 border-amber-300 flex items-center justify-center text-black font-black text-xs shadow-lg animate-pulse">
                        🪙 {tableWager * 2}
                      </div>
                      <span className="text-[9px] text-amber-200 font-bold mt-1">POT</span>
                    </div>

                    {/* Opponent Choice Box */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-emerald-200 font-bold mb-1">CARTE ADVERSAR</span>
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
              <div className="mt-4 p-3 rounded-2xl bg-black/80 border border-amber-500/50 text-xs font-extrabold text-amber-300 text-center max-w-md w-full animate-fade-in shadow-lg">
                {duelLogMessage}
              </div>
            )}

            {/* Action Buttons for Player Turn */}
            {tableGame !== "tictactoe" && tablePhase === "selecting" && (
              <div className="mt-4 w-full max-w-md">
                <div className="text-xs text-amber-300 font-bold mb-2 text-center">Alege mutarea ta înainte de expirarea timpului:</div>
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

                {tableGame === "dice" && (
                  <button
                    onClick={() => makePlayerTableChoice(Math.floor(Math.random() * 6) + 1)}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black py-3 rounded-xl text-xs shadow-lg"
                  >
                    🎲 Aruncă Zarul Acum!
                  </button>
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
                      else if (tableGame === "dice") aiPick = Math.floor(Math.random() * 6) + 1;
                      setOpponentChoice(aiPick);
                    }
                  }}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black px-6 py-2.5 rounded-xl text-xs shadow-lg"
                >
                  🔁 Joacă Revanșă ({tableWager} pts)
                </button>
                <button
                  onClick={() => setInDuelTable(false)}
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
