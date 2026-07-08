function walletToColors(wallet: string): [string, string] {
  let h1 = 0, h2 = 0;
  for (let i = 0; i < wallet.length; i++) {
    h1 = (h1 * 31 + wallet.charCodeAt(i)) & 0xffff;
    h2 = (h2 * 37 + wallet.charCodeAt(wallet.length - 1 - i)) & 0xffff;
  }
  const hue1 = h1 % 360;
  const hue2 = (hue1 + 60 + (h2 % 60)) % 360;
  return [`hsl(${hue1},70%,55%)`, `hsl(${hue2},70%,40%)`];
}

export function Avatar({ wallet, profile, size = 36 }: { wallet: string; profile?: any; size?: number }) {
  const [c1, c2] = walletToColors(wallet);
  const initials = profile?.username ? profile.username.slice(0, 2).toUpperCase() : wallet.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff",
      flexShrink: 0, userSelect: "none",
    }}>{initials}</div>
  );
}
